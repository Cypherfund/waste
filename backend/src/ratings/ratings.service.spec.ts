import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RatingsService } from './ratings.service';
import { Rating } from './entities/rating.entity';
import { User } from '../users/entities/user.entity';
import { JobsService } from '../jobs/jobs.service';
import { JobStatus } from '../common/enums/job-status.enum';
import { JobEvents } from '../events/events.types';

describe('RatingsService', () => {
  let service: RatingsService;
  let ratingRepo: any;
  let userRepo: any;
  let jobsService: any;
  let eventEmitter: any;

  const makeJob = (overrides: any = {}) => ({
    id: 'job-1',
    householdId: 'hh-1',
    collectorId: 'col-1',
    status: JobStatus.VALIDATED,
    ...overrides,
  });

  beforeEach(async () => {
    ratingRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({ id: 'rating-1', createdAt: new Date(), ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '4.25', count: '8' }),
      }),
    };

    userRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    jobsService = {
      getJobEntity: jest.fn().mockResolvedValue(makeJob()),
      transitionToRated: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        { provide: getRepositoryToken(Rating), useValue: ratingRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JobsService, useValue: jobsService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
  });

  // ─── Successful Rating ──────────────────────────────────────────

  describe('rateJob — success', () => {
    it('should create a rating for a VALIDATED job', async () => {
      const result = await service.rateJob('job-1', 'hh-1', {
        value: 5,
        comment: 'Excellent!',
      });

      expect(result.id).toBe('rating-1');
      expect(result.value).toBe(5);
      expect(result.comment).toBe('Excellent!');
      expect(result.jobId).toBe('job-1');
      expect(result.householdId).toBe('hh-1');
      expect(result.collectorId).toBe('col-1');
    });

    it('should transition job to RATED', async () => {
      await service.rateJob('job-1', 'hh-1', { value: 4 });

      expect(jobsService.transitionToRated).toHaveBeenCalledWith('job-1');
    });

    it('should emit JOB_RATED event', async () => {
      await service.rateJob('job-1', 'hh-1', { value: 4 });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobEvents.RATED,
        expect.objectContaining({
          jobId: 'job-1',
          householdId: 'hh-1',
          collectorId: 'col-1',
          value: 4,
        }),
      );
    });

    it('should update collector aggregate stats', async () => {
      await service.rateJob('job-1', 'hh-1', { value: 4 });

      expect(userRepo.update).toHaveBeenCalledWith('col-1', {
        avgRating: 4.25,
        totalCompleted: 8,
      });
    });

    it('should allow rating without a comment', async () => {
      const result = await service.rateJob('job-1', 'hh-1', { value: 3 });

      expect(result.comment).toBeNull();
    });
  });

  // ─── Validation Failures ────────────────────────────────────────

  describe('rateJob — validation', () => {
    it('should reject rating if household does not own the job', async () => {
      await expect(
        service.rateJob('job-1', 'other-hh', { value: 5 }),
      ).rejects.toThrow('You can only rate your own jobs');
    });

    it('should reject rating if job is not VALIDATED', async () => {
      jobsService.getJobEntity.mockResolvedValue(
        makeJob({ status: JobStatus.COMPLETED }),
      );

      await expect(
        service.rateJob('job-1', 'hh-1', { value: 5 }),
      ).rejects.toThrow('Job must be in VALIDATED status to rate');
    });

    it('should reject rating if job is in ASSIGNED status', async () => {
      jobsService.getJobEntity.mockResolvedValue(
        makeJob({ status: JobStatus.ASSIGNED }),
      );

      await expect(
        service.rateJob('job-1', 'hh-1', { value: 5 }),
      ).rejects.toThrow('Job must be in VALIDATED status to rate');
    });

    it('should reject duplicate rating for the same job', async () => {
      ratingRepo.findOne.mockResolvedValue({ id: 'existing-rating' });

      await expect(
        service.rateJob('job-1', 'hh-1', { value: 5 }),
      ).rejects.toThrow('This job has already been rated');
    });
  });

  // ─── Collector Aggregate Stats ──────────────────────────────────

  describe('updateCollectorStats', () => {
    it('should compute average and count from all ratings', async () => {
      await service.updateCollectorStats('col-1');

      expect(userRepo.update).toHaveBeenCalledWith('col-1', {
        avgRating: 4.25,
        totalCompleted: 8,
      });
    });

    it('should handle collector with no ratings (avg=0)', async () => {
      ratingRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: null, count: '0' }),
      });

      await service.updateCollectorStats('col-new');

      expect(userRepo.update).toHaveBeenCalledWith('col-new', {
        avgRating: 0,
        totalCompleted: 0,
      });
    });
  });
});
