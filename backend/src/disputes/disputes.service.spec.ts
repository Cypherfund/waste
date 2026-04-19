import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DisputesService } from './disputes.service';
import { Dispute } from './entities/dispute.entity';
import { JobsService } from '../jobs/jobs.service';
import { JobStatus } from '../common/enums/job-status.enum';
import { DisputeStatus } from '../common/enums/dispute-status.enum';
import { ProofEvents, DisputeEvents } from '../events/events.types';

describe('DisputesService', () => {
  let service: DisputesService;
  let disputeRepo: any;
  let jobsService: any;
  let eventEmitter: any;

  const makeJob = (overrides: any = {}) => ({
    id: 'job-1',
    householdId: 'hh-1',
    collectorId: 'col-1',
    status: JobStatus.COMPLETED,
    ...overrides,
  });

  beforeEach(async () => {
    disputeRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({
        id: 'dispute-1',
        createdAt: new Date(),
        adminNotes: null,
        resolvedBy: null,
        resolvedAt: null,
        ...data,
      })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    jobsService = {
      getJobEntity: jest.fn().mockResolvedValue(makeJob()),
      transitionToDisputed: jest.fn().mockResolvedValue(undefined),
      transitionDisputeResolved: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: getRepositoryToken(Dispute), useValue: disputeRepo },
        { provide: JobsService, useValue: jobsService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<DisputesService>(DisputesService);
  });

  // ─── createDispute — success ────────────────────────────────────

  describe('createDispute — success', () => {
    it('should create a dispute for a COMPLETED job', async () => {
      const result = await service.createDispute('job-1', 'hh-1', {
        reason: 'Waste not fully collected',
      });

      expect(result.id).toBe('dispute-1');
      expect(result.jobId).toBe('job-1');
      expect(result.householdId).toBe('hh-1');
      expect(result.reason).toBe('Waste not fully collected');
      expect(result.status).toBe(DisputeStatus.OPEN);
    });

    it('should transition job to DISPUTED', async () => {
      await service.createDispute('job-1', 'hh-1', {
        reason: 'Waste not fully collected',
      });

      expect(jobsService.transitionToDisputed).toHaveBeenCalledWith('job-1');
    });

    it('should emit PROOF_DISPUTED event', async () => {
      await service.createDispute('job-1', 'hh-1', {
        reason: 'Waste not fully collected',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ProofEvents.DISPUTED,
        expect.objectContaining({
          jobId: 'job-1',
          householdId: 'hh-1',
          collectorId: 'col-1',
          disputeId: 'dispute-1',
          reason: 'Waste not fully collected',
        }),
      );
    });
  });

  // ─── createDispute — validation ─────────────────────────────────

  describe('createDispute — validation', () => {
    it('should reject dispute if household does not own the job', async () => {
      await expect(
        service.createDispute('job-1', 'other-hh', {
          reason: 'Some reason',
        }),
      ).rejects.toThrow('You can only dispute your own jobs');
    });

    it('should reject dispute if job is not COMPLETED', async () => {
      jobsService.getJobEntity.mockResolvedValue(
        makeJob({ status: JobStatus.VALIDATED }),
      );

      await expect(
        service.createDispute('job-1', 'hh-1', {
          reason: 'Some reason',
        }),
      ).rejects.toThrow('Job must be in COMPLETED status to dispute');
    });

    it('should reject dispute if job is ASSIGNED (wrong state)', async () => {
      jobsService.getJobEntity.mockResolvedValue(
        makeJob({ status: JobStatus.ASSIGNED }),
      );

      await expect(
        service.createDispute('job-1', 'hh-1', {
          reason: 'Some reason',
        }),
      ).rejects.toThrow('Job must be in COMPLETED status to dispute');
    });

    it('should reject duplicate dispute for same job', async () => {
      disputeRepo.findOne.mockResolvedValue({ id: 'existing-dispute' });

      await expect(
        service.createDispute('job-1', 'hh-1', {
          reason: 'Some reason',
        }),
      ).rejects.toThrow('A dispute already exists for this job');
    });
  });

  // ─── resolveDispute ─────────────────────────────────────────────

  describe('resolveDispute', () => {
    const openDispute = {
      id: 'dispute-1',
      jobId: 'job-1',
      householdId: 'hh-1',
      reason: 'Waste not collected',
      status: DisputeStatus.OPEN,
      adminNotes: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
    };

    it('should resolve dispute as RESOLVED_ACCEPTED (cancel job)', async () => {
      disputeRepo.findOne.mockResolvedValue({ ...openDispute });

      const result = await service.resolveDispute('dispute-1', 'admin-1', {
        resolution: DisputeStatus.RESOLVED_ACCEPTED,
        adminNotes: 'Collector was at fault',
      });

      expect(result.status).toBe(DisputeStatus.RESOLVED_ACCEPTED);
      expect(result.adminNotes).toBe('Collector was at fault');
      expect(result.resolvedBy).toBe('admin-1');
      expect(jobsService.transitionDisputeResolved).toHaveBeenCalledWith(
        'job-1',
        JobStatus.CANCELLED,
      );
    });

    it('should resolve dispute as RESOLVED_REJECTED (validate job)', async () => {
      disputeRepo.findOne.mockResolvedValue({ ...openDispute });

      await service.resolveDispute('dispute-1', 'admin-1', {
        resolution: DisputeStatus.RESOLVED_REJECTED,
        adminNotes: 'Proof is valid',
      });

      expect(jobsService.transitionDisputeResolved).toHaveBeenCalledWith(
        'job-1',
        JobStatus.VALIDATED,
      );
    });

    it('should emit DISPUTE_RESOLVED event', async () => {
      disputeRepo.findOne.mockResolvedValue({ ...openDispute });

      await service.resolveDispute('dispute-1', 'admin-1', {
        resolution: DisputeStatus.RESOLVED_REJECTED,
        adminNotes: 'Valid',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DisputeEvents.RESOLVED,
        expect.objectContaining({
          disputeId: 'dispute-1',
          jobId: 'job-1',
          resolvedBy: 'admin-1',
        }),
      );
    });

    it('should reject resolve for non-existent dispute', async () => {
      disputeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resolveDispute('bad-id', 'admin-1', {
          resolution: DisputeStatus.RESOLVED_ACCEPTED,
          adminNotes: 'N/A',
        }),
      ).rejects.toThrow('Dispute not found');
    });

    it('should reject resolve for already resolved dispute', async () => {
      disputeRepo.findOne.mockResolvedValue({
        ...openDispute,
        status: DisputeStatus.RESOLVED_ACCEPTED,
      });

      await expect(
        service.resolveDispute('dispute-1', 'admin-1', {
          resolution: DisputeStatus.RESOLVED_REJECTED,
          adminNotes: 'N/A',
        }),
      ).rejects.toThrow('Dispute is already resolved');
    });
  });
});
