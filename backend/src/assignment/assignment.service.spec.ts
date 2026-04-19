import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AssignmentService } from './assignment.service';
import { JobsService } from '../jobs/jobs.service';
import { TimeslotsService } from '../timeslots/timeslots.service';
import { SystemConfigService } from '../config/system-config.service';
import { FeatureFlagService } from '../config/feature-flags';
import { User } from '../users/entities/user.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobStatus } from '../common/enums/job-status.enum';
import { JobEvents } from '../events/events.types';
import { DayOfWeek } from '../common/enums/day-of-week.enum';

const defaultConfig = {
  maxRadiusKm: 10,
  maxConcurrentJobs: 5,
  maxDailyJobs: 15,
  weightDistance: 0.4,
  weightWorkload: 0.3,
  weightRating: 0.15,
  weightRecency: 0.15,
  acceptTimeoutMinutes: 10,
  maxReassignAttempts: 3,
};

const mockJob: Partial<Job> = {
  id: 'job-1',
  householdId: 'hh-1',
  status: JobStatus.REQUESTED,
  scheduledDate: '2026-04-21',
  scheduledTime: '09:00-11:00',
  locationLat: 4.0435,
  locationLng: 9.6966,
  assignmentAttempts: 0,
  version: 1,
};

describe('AssignmentService', () => {
  let service: AssignmentService;
  let jobsService: Partial<JobsService>;
  let timeslotsService: Partial<TimeslotsService>;
  let configService: Partial<SystemConfigService>;
  let featureFlagService: Partial<FeatureFlagService>;
  let eventEmitter: EventEmitter2;
  let dataSource: Partial<DataSource>;
  let userRepo: any;
  let jobRepo: any;

  beforeEach(async () => {
    jobsService = {
      getJobEntity: jest.fn().mockResolvedValue({ ...mockJob }),
      assignToCollector: jest.fn().mockResolvedValue(true),
      unassignCollector: jest.fn().mockResolvedValue(1),
    };

    timeslotsService = {
      getDayOfWeek: jest.fn().mockReturnValue(DayOfWeek.MON),
      parseTimeWindow: jest.fn().mockReturnValue(['09:00', '11:00']),
      isCollectorAvailable: jest.fn().mockResolvedValue(true),
    };

    configService = {
      getAssignmentConfig: jest.fn().mockResolvedValue(defaultConfig),
    };

    featureFlagService = {
      isEnabled: jest.fn().mockResolvedValue(true),
    };

    eventEmitter = new EventEmitter2();
    jest.spyOn(eventEmitter, 'emit');

    dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          id: 'col-1',
          latitude: 4.05,
          longitude: 9.70,
          avgRating: 4.5,
          activeJobCount: 1,
          dailyJobCount: 2,
          lastCompletedAt: null,
        },
        {
          id: 'col-2',
          latitude: 4.04,
          longitude: 9.69,
          avgRating: 4.0,
          activeJobCount: 0,
          dailyJobCount: 1,
          lastCompletedAt: null,
        },
      ]),
    };

    userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'col-1', isActive: true }),
    };

    jobRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        { provide: JobsService, useValue: jobsService },
        { provide: TimeslotsService, useValue: timeslotsService },
        { provide: SystemConfigService, useValue: configService },
        { provide: FeatureFlagService, useValue: featureFlagService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);
  });

  describe('autoAssign', () => {
    it('should assign the best-scored collector to the job', async () => {
      await service.autoAssign('job-1');

      expect(jobsService.getJobEntity).toHaveBeenCalledWith('job-1');
      expect(configService.getAssignmentConfig).toHaveBeenCalled();
      expect(jobsService.assignToCollector).toHaveBeenCalledWith(
        'job-1',
        expect.any(String),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobEvents.ASSIGNMENT_STARTED,
        expect.any(Object),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobEvents.ASSIGNED,
        expect.objectContaining({ jobId: 'job-1' }),
      );
    });

    it('should skip assignment if job is not REQUESTED', async () => {
      (jobsService.getJobEntity as jest.Mock).mockResolvedValue({
        ...mockJob,
        status: JobStatus.ASSIGNED,
      });

      await service.autoAssign('job-1');

      expect(jobsService.assignToCollector).not.toHaveBeenCalled();
    });

    it('should escalate if max attempts exceeded', async () => {
      (jobsService.getJobEntity as jest.Mock).mockResolvedValue({
        ...mockJob,
        assignmentAttempts: 3,
      });

      await service.autoAssign('job-1');

      expect(jobsService.assignToCollector).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobEvents.ASSIGNMENT_ESCALATED,
        expect.objectContaining({ jobId: 'job-1', attempts: 3 }),
      );
    });

    it('should escalate if no eligible collectors found', async () => {
      (dataSource.query as jest.Mock).mockResolvedValue([]);

      await service.autoAssign('job-1');

      expect(jobsService.assignToCollector).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobEvents.ASSIGNMENT_ESCALATED,
        expect.objectContaining({ jobId: 'job-1' }),
      );
    });

    it('should not assign if concurrent modification detected', async () => {
      (jobsService.assignToCollector as jest.Mock).mockResolvedValue(false);

      await service.autoAssign('job-1');

      expect(eventEmitter.emit).not.toHaveBeenCalledWith(
        JobEvents.ASSIGNED,
        expect.any(Object),
      );
    });
  });

  describe('onJobCreated', () => {
    it('should trigger autoAssign when auto-assignment is enabled', async () => {
      const spy = jest.spyOn(service, 'autoAssign').mockResolvedValue();

      await service.onJobCreated({
        jobId: 'job-1',
        householdId: 'hh-1',
        status: JobStatus.REQUESTED,
        timestamp: new Date(),
      });

      expect(spy).toHaveBeenCalledWith('job-1');
    });

    it('should skip when auto-assignment is disabled', async () => {
      (featureFlagService.isEnabled as jest.Mock).mockResolvedValue(false);
      const spy = jest.spyOn(service, 'autoAssign').mockResolvedValue();

      await service.onJobCreated({
        jobId: 'job-1',
        householdId: 'hh-1',
        status: JobStatus.REQUESTED,
        timestamp: new Date(),
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('manualAssign', () => {
    it('should assign the specified collector', async () => {
      await service.manualAssign('job-1', 'col-1');

      expect(jobsService.assignToCollector).toHaveBeenCalledWith(
        'job-1',
        'col-1',
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobEvents.ASSIGNED,
        expect.objectContaining({ collectorId: 'col-1' }),
      );
    });

    it('should throw if job is not REQUESTED', async () => {
      (jobsService.getJobEntity as jest.Mock).mockResolvedValue({
        ...mockJob,
        status: JobStatus.IN_PROGRESS,
      });

      await expect(
        service.manualAssign('job-1', 'col-1'),
      ).rejects.toThrow('Job must be in REQUESTED status');
    });

    it('should throw if collector not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.manualAssign('job-1', 'col-999'),
      ).rejects.toThrow('Collector not found or not active');
    });
  });

  describe('handleTimeout', () => {
    it('should unassign and reassign on timeout', async () => {
      (jobsService.getJobEntity as jest.Mock).mockResolvedValue({
        ...mockJob,
        status: JobStatus.ASSIGNED,
        collectorId: 'col-1',
        assignmentAttempts: 1,
      });

      const autoAssignSpy = jest
        .spyOn(service, 'autoAssign')
        .mockResolvedValue();

      await service.handleTimeout('job-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobEvents.ASSIGNMENT_TIMEOUT,
        expect.objectContaining({ jobId: 'job-1', collectorId: 'col-1' }),
      );
      expect(jobsService.unassignCollector).toHaveBeenCalledWith('job-1');
      expect(autoAssignSpy).toHaveBeenCalledWith('job-1');
    });

    it('should skip if job is no longer ASSIGNED', async () => {
      (jobsService.getJobEntity as jest.Mock).mockResolvedValue({
        ...mockJob,
        status: JobStatus.IN_PROGRESS,
      });

      await service.handleTimeout('job-1');

      expect(jobsService.unassignCollector).not.toHaveBeenCalled();
    });

    it('should escalate if attempts exceed max after timeout', async () => {
      (jobsService.getJobEntity as jest.Mock).mockResolvedValue({
        ...mockJob,
        status: JobStatus.ASSIGNED,
        collectorId: 'col-1',
        assignmentAttempts: 2,
      });
      (jobsService.unassignCollector as jest.Mock).mockResolvedValue(3);

      await service.handleTimeout('job-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobEvents.ASSIGNMENT_ESCALATED,
        expect.objectContaining({ jobId: 'job-1' }),
      );
    });
  });

  describe('getEligibleCollectors', () => {
    it('should filter out collectors exceeding max concurrent jobs', async () => {
      (dataSource.query as jest.Mock).mockResolvedValue([
        {
          id: 'col-busy',
          latitude: 4.04,
          longitude: 9.69,
          avgRating: 4.0,
          activeJobCount: 5, // at limit
          dailyJobCount: 1,
          lastCompletedAt: null,
        },
        {
          id: 'col-ok',
          latitude: 4.04,
          longitude: 9.69,
          avgRating: 4.0,
          activeJobCount: 2,
          dailyJobCount: 1,
          lastCompletedAt: null,
        },
      ]);

      const candidates = await service.getEligibleCollectors(
        mockJob as Job,
        defaultConfig,
      );

      expect(candidates.map((c) => c.id)).toEqual(['col-ok']);
    });

    it('should filter out collectors outside max radius', async () => {
      (dataSource.query as jest.Mock).mockResolvedValue([
        {
          id: 'col-far',
          latitude: 5.0, // ~110km away
          longitude: 10.0,
          avgRating: 4.0,
          activeJobCount: 0,
          dailyJobCount: 0,
          lastCompletedAt: null,
        },
        {
          id: 'col-near',
          latitude: 4.044,
          longitude: 9.697,
          avgRating: 4.0,
          activeJobCount: 0,
          dailyJobCount: 0,
          lastCompletedAt: null,
        },
      ]);

      const candidates = await service.getEligibleCollectors(
        mockJob as Job,
        defaultConfig,
      );

      expect(candidates.map((c) => c.id)).toEqual(['col-near']);
    });

    it('should filter out collectors not available in timeslot', async () => {
      (dataSource.query as jest.Mock).mockResolvedValue([
        {
          id: 'col-avail',
          latitude: 4.044,
          longitude: 9.697,
          avgRating: 4.0,
          activeJobCount: 0,
          dailyJobCount: 0,
          lastCompletedAt: null,
        },
        {
          id: 'col-unavail',
          latitude: 4.044,
          longitude: 9.697,
          avgRating: 4.0,
          activeJobCount: 0,
          dailyJobCount: 0,
          lastCompletedAt: null,
        },
      ]);

      (timeslotsService.isCollectorAvailable as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const candidates = await service.getEligibleCollectors(
        mockJob as Job,
        defaultConfig,
      );

      expect(candidates.map((c) => c.id)).toEqual(['col-avail']);
    });

    it('should return empty array when no collectors in DB', async () => {
      (dataSource.query as jest.Mock).mockResolvedValue([]);

      const candidates = await service.getEligibleCollectors(
        mockJob as Job,
        defaultConfig,
      );

      expect(candidates).toEqual([]);
    });
  });
});
