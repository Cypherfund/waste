import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProofAutoValidateScheduler } from './proof-auto-validate.scheduler';
import { JobsService } from '../jobs/jobs.service';
import { SystemConfigService } from '../config/system-config.service';
import { JobStatus } from '../common/enums/job-status.enum';
import { ProofEvents } from '../events/events.types';

describe('ProofAutoValidateScheduler', () => {
  let scheduler: ProofAutoValidateScheduler;
  let jobsService: any;
  let systemConfigService: any;
  let eventEmitter: any;

  const makeJob = (overrides: any = {}) => ({
    id: 'job-1',
    householdId: 'hh-1',
    collectorId: 'col-1',
    status: JobStatus.COMPLETED,
    completedAt: new Date('2025-04-15T10:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    jobsService = {
      findCompletedJobsOlderThan: jest.fn().mockResolvedValue([]),
      autoValidateJob: jest.fn().mockResolvedValue(null),
    };

    systemConfigService = {
      getNumber: jest.fn().mockResolvedValue(24), // 24 hours per Phase 1 §9.4
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProofAutoValidateScheduler,
        { provide: JobsService, useValue: jobsService },
        { provide: SystemConfigService, useValue: systemConfigService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    scheduler = module.get<ProofAutoValidateScheduler>(ProofAutoValidateScheduler);
  });

  it('should read auto_validate_hours from config', async () => {
    await scheduler.handleAutoValidation();

    expect(systemConfigService.getNumber).toHaveBeenCalledWith(
      'proof.auto_validate_hours',
      24,
    );
  });

  it('should query for COMPLETED jobs older than threshold', async () => {
    await scheduler.handleAutoValidation();

    expect(jobsService.findCompletedJobsOlderThan).toHaveBeenCalledWith(
      expect.any(Date),
    );
  });

  it('should auto-validate completed jobs older than threshold', async () => {
    const oldJob = makeJob();
    jobsService.findCompletedJobsOlderThan.mockResolvedValue([oldJob]);
    jobsService.autoValidateJob.mockResolvedValue({
      ...oldJob,
      status: JobStatus.VALIDATED,
    });

    await scheduler.handleAutoValidation();

    expect(jobsService.autoValidateJob).toHaveBeenCalledWith('job-1');
  });

  it('should emit PROOF_AUTO_VALIDATED for each auto-validated job', async () => {
    const job1 = makeJob({ id: 'job-1' });
    const job2 = makeJob({ id: 'job-2', householdId: 'hh-2', collectorId: 'col-2' });

    jobsService.findCompletedJobsOlderThan.mockResolvedValue([job1, job2]);
    jobsService.autoValidateJob
      .mockResolvedValueOnce({ ...job1, status: JobStatus.VALIDATED })
      .mockResolvedValueOnce({ ...job2, status: JobStatus.VALIDATED, householdId: 'hh-2', collectorId: 'col-2' });

    await scheduler.handleAutoValidation();

    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ProofEvents.AUTO_VALIDATED,
      expect.objectContaining({ jobId: 'job-1' }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      ProofEvents.AUTO_VALIDATED,
      expect.objectContaining({ jobId: 'job-2' }),
    );
  });

  it('should skip jobs that are no longer COMPLETED (already disputed/validated)', async () => {
    const job = makeJob();
    jobsService.findCompletedJobsOlderThan.mockResolvedValue([job]);
    // autoValidateJob returns null when job is no longer COMPLETED
    jobsService.autoValidateJob.mockResolvedValue(null);

    await scheduler.handleAutoValidation();

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should do nothing if no completed jobs found', async () => {
    jobsService.findCompletedJobsOlderThan.mockResolvedValue([]);

    await scheduler.handleAutoValidation();

    expect(jobsService.autoValidateJob).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should use config-driven timeout (custom hours)', async () => {
    systemConfigService.getNumber.mockResolvedValue(24); // 24 hours

    await scheduler.handleAutoValidation();

    // The cutoff date should be ~24h ago
    const calledCutoff = jobsService.findCompletedJobsOlderThan.mock.calls[0][0] as Date;
    const now = new Date();
    const diffHours = (now.getTime() - calledCutoff.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThan(23.5);
    expect(diffHours).toBeLessThan(24.5);
  });
});
