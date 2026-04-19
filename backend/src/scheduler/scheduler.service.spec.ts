import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerService } from './scheduler.service';
import { Job } from '../jobs/entities/job.entity';
import { JobsService } from '../jobs/jobs.service';
import { AssignmentService } from '../assignment/assignment.service';
import { FilesService } from '../files/files.service';
import { SystemConfigService } from '../config/system-config.service';
import { JobStatus } from '../common/enums/job-status.enum';
import { ProofEvents } from '../events/events.types';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let jobRepo: any;
  let jobsService: any;
  let assignmentService: any;
  let filesService: any;
  let systemConfigService: any;
  let eventEmitter: any;

  const makeJob = (overrides: any = {}): any => ({
    id: 'job-1',
    householdId: 'hh-1',
    collectorId: 'col-1',
    status: JobStatus.COMPLETED,
    assignedAt: new Date(Date.now() - 60 * 60 * 1000), // 1h ago
    ...overrides,
  });

  beforeEach(async () => {
    jobRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    jobsService = {
      findCompletedJobsOlderThan: jest.fn().mockResolvedValue([]),
      autoValidateJob: jest.fn().mockResolvedValue(null),
    };

    assignmentService = {
      handleTimeout: jest.fn().mockResolvedValue(undefined),
    };

    filesService = {
      cleanupUnused: jest.fn().mockResolvedValue(0),
    };

    systemConfigService = {
      getNumber: jest.fn().mockImplementation((key: string, fallback: number) => {
        return Promise.resolve(fallback);
      }),
      getAssignmentConfig: jest.fn().mockResolvedValue({
        acceptTimeoutMinutes: 15,
        maxReassignAttempts: 3,
        maxRadiusKm: 10,
        maxConcurrentJobs: 3,
        maxDailyJobs: 10,
      }),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: JobsService, useValue: jobsService },
        { provide: AssignmentService, useValue: assignmentService },
        { provide: FilesService, useValue: filesService },
        { provide: SystemConfigService, useValue: systemConfigService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  // ─── PROOF AUTO-VALIDATION ──────────────────────────────────────

  describe('handleProofAutoValidation', () => {
    it('should skip when no completed jobs found', async () => {
      jobsService.findCompletedJobsOlderThan.mockResolvedValue([]);

      await service.handleProofAutoValidation();

      expect(jobsService.findCompletedJobsOlderThan).toHaveBeenCalled();
      expect(jobsService.autoValidateJob).not.toHaveBeenCalled();
    });

    it('should auto-validate completed jobs and emit events', async () => {
      const job = makeJob();
      jobsService.findCompletedJobsOlderThan.mockResolvedValue([job]);
      jobsService.autoValidateJob.mockResolvedValue(job);

      await service.handleProofAutoValidation();

      expect(jobsService.autoValidateJob).toHaveBeenCalledWith('job-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ProofEvents.AUTO_VALIDATED,
        expect.objectContaining({
          jobId: 'job-1',
          householdId: 'hh-1',
          collectorId: 'col-1',
        }),
      );
    });

    it('should use configured auto_validate_hours', async () => {
      systemConfigService.getNumber.mockResolvedValue(48);
      jobsService.findCompletedJobsOlderThan.mockResolvedValue([]);

      await service.handleProofAutoValidation();

      expect(systemConfigService.getNumber).toHaveBeenCalledWith(
        'proof.auto_validate_hours',
        24,
      );
    });

    it('should NOT emit for jobs where autoValidateJob returns null (already validated)', async () => {
      const job = makeJob();
      jobsService.findCompletedJobsOlderThan.mockResolvedValue([job]);
      jobsService.autoValidateJob.mockResolvedValue(null); // already validated/disputed

      await service.handleProofAutoValidation();

      expect(jobsService.autoValidateJob).toHaveBeenCalledWith('job-1');
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should be idempotent — running twice does not double-validate', async () => {
      const job = makeJob();
      jobsService.findCompletedJobsOlderThan.mockResolvedValue([job]);
      // First run: validates
      jobsService.autoValidateJob.mockResolvedValueOnce(job);
      await service.handleProofAutoValidation();
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);

      // Second run: autoValidateJob returns null (already validated)
      jobsService.autoValidateJob.mockResolvedValueOnce(null);
      await service.handleProofAutoValidation();
      // Still only 1 emit total
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    });

    it('should continue processing remaining jobs when one fails', async () => {
      const job1 = makeJob({ id: 'job-1' });
      const job2 = makeJob({ id: 'job-2' });
      jobsService.findCompletedJobsOlderThan.mockResolvedValue([job1, job2]);
      jobsService.autoValidateJob
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(job2);

      await service.handleProofAutoValidation();

      expect(jobsService.autoValidateJob).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    });
  });

  // ─── ASSIGNMENT TIMEOUT ─────────────────────────────────────────

  describe('handleAssignmentTimeouts', () => {
    it('should skip when no timed-out jobs found', async () => {
      jobRepo.find.mockResolvedValue([]);

      await service.handleAssignmentTimeouts();

      expect(assignmentService.handleTimeout).not.toHaveBeenCalled();
    });

    it('should call handleTimeout for each timed-out job', async () => {
      const job1 = makeJob({ id: 'job-1', status: JobStatus.ASSIGNED });
      const job2 = makeJob({ id: 'job-2', status: JobStatus.ASSIGNED });
      jobRepo.find.mockResolvedValue([job1, job2]);

      await service.handleAssignmentTimeouts();

      expect(assignmentService.handleTimeout).toHaveBeenCalledWith('job-1');
      expect(assignmentService.handleTimeout).toHaveBeenCalledWith('job-2');
      expect(assignmentService.handleTimeout).toHaveBeenCalledTimes(2);
    });

    it('should query with configured timeout', async () => {
      systemConfigService.getAssignmentConfig.mockResolvedValue({
        acceptTimeoutMinutes: 30,
        maxReassignAttempts: 3,
      });
      jobRepo.find.mockResolvedValue([]);

      await service.handleAssignmentTimeouts();

      expect(systemConfigService.getAssignmentConfig).toHaveBeenCalled();
      const findArgs = jobRepo.find.mock.calls[0][0];
      expect(findArgs.where.status).toBe(JobStatus.ASSIGNED);
      expect(findArgs.where.assignedAt).toBeDefined();
    });

    it('should continue processing when one timeout fails', async () => {
      const job1 = makeJob({ id: 'job-1' });
      const job2 = makeJob({ id: 'job-2' });
      jobRepo.find.mockResolvedValue([job1, job2]);
      assignmentService.handleTimeout
        .mockRejectedValueOnce(new Error('Concurrent mod'))
        .mockResolvedValueOnce(undefined);

      await service.handleAssignmentTimeouts();

      expect(assignmentService.handleTimeout).toHaveBeenCalledTimes(2);
    });

    it('should be idempotent — handleTimeout checks state internally', async () => {
      const job = makeJob({ id: 'job-1' });
      jobRepo.find.mockResolvedValue([job]);

      await service.handleAssignmentTimeouts();
      await service.handleAssignmentTimeouts();

      // handleTimeout is called each time, but it's idempotent internally
      expect(assignmentService.handleTimeout).toHaveBeenCalledTimes(2);
    });
  });

  // ─── FILE CLEANUP ───────────────────────────────────────────────

  describe('handleFileCleanup', () => {
    it('should call filesService.cleanupUnused with configured threshold', async () => {
      systemConfigService.getNumber.mockResolvedValue(48);

      await service.handleFileCleanup();

      expect(filesService.cleanupUnused).toHaveBeenCalledWith(48);
    });

    it('should use default 24h threshold when config not set', async () => {
      await service.handleFileCleanup();

      expect(systemConfigService.getNumber).toHaveBeenCalledWith(
        'files.cleanup_hours',
        24,
      );
      expect(filesService.cleanupUnused).toHaveBeenCalledWith(24);
    });

    it('should not throw when cleanup fails', async () => {
      filesService.cleanupUnused.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(service.handleFileCleanup()).resolves.not.toThrow();
    });

    it('should be idempotent — cleanup only targets unused undeleted files', async () => {
      filesService.cleanupUnused
        .mockResolvedValueOnce(5) // first run: deletes 5
        .mockResolvedValueOnce(0); // second run: nothing left

      await service.handleFileCleanup();
      await service.handleFileCleanup();

      expect(filesService.cleanupUnused).toHaveBeenCalledTimes(2);
    });
  });
});
