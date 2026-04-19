import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from '../jobs/entities/job.entity';
import { JobsService } from '../jobs/jobs.service';
import { AssignmentService } from '../assignment/assignment.service';
import { FilesService } from '../files/files.service';
import { SystemConfigService } from '../config/system-config.service';
import { JobStatus } from '../common/enums/job-status.enum';
import { ProofEvents } from '../events/events.types';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly jobsService: JobsService,
    private readonly assignmentService: AssignmentService,
    private readonly filesService: FilesService,
    private readonly systemConfigService: SystemConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── A. PROOF AUTO-VALIDATION (every 10 minutes) ───────────────

  /**
   * Finds COMPLETED jobs older than the configured threshold and auto-validates them.
   * Idempotent: autoValidateJob checks status internally before transitioning.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleProofAutoValidation(): Promise<void> {
    const autoValidateHours = await this.systemConfigService.getNumber(
      'proof.auto_validate_hours',
      24,
    );

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - autoValidateHours);

    const completedJobs = await this.jobsService.findCompletedJobsOlderThan(cutoff);

    if (completedJobs.length === 0) return;

    this.logger.log(
      `Auto-validation: found ${completedJobs.length} COMPLETED jobs older than ${autoValidateHours}h`,
    );

    let validated = 0;
    for (const job of completedJobs) {
      try {
        const result = await this.jobsService.autoValidateJob(job.id);
        if (result) {
          validated++;
          this.eventEmitter.emit(ProofEvents.AUTO_VALIDATED, {
            jobId: result.id,
            householdId: result.householdId,
            collectorId: result.collectorId,
            timestamp: new Date(),
          });
        }
      } catch (err) {
        this.logger.error(
          `Auto-validation failed for job ${job.id}: ${err.message}`,
        );
      }
    }

    if (validated > 0) {
      this.logger.log(`Auto-validation: validated ${validated} jobs`);
    }
  }

  // ─── B. ASSIGNMENT TIMEOUT CHECK (every 5 minutes) ─────────────

  /**
   * Finds ASSIGNED jobs where assignedAt + timeout exceeded.
   * Triggers reassignment via AssignmentService.handleTimeout().
   * Idempotent: handleTimeout checks job status before acting.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAssignmentTimeouts(): Promise<void> {
    const config = await this.systemConfigService.getAssignmentConfig();
    const timeoutMs = config.acceptTimeoutMinutes * 60 * 1000;
    const cutoff = new Date(Date.now() - timeoutMs);

    const timedOutJobs = await this.jobRepo.find({
      where: {
        status: JobStatus.ASSIGNED,
        assignedAt: LessThan(cutoff),
      },
    });

    if (timedOutJobs.length === 0) return;

    this.logger.log(
      `Assignment timeout: found ${timedOutJobs.length} timed-out jobs (cutoff: ${cutoff.toISOString()})`,
    );

    for (const job of timedOutJobs) {
      try {
        await this.assignmentService.handleTimeout(job.id);
      } catch (err) {
        this.logger.error(
          `Timeout handling failed for job ${job.id}: ${err.message}`,
        );
      }
    }
  }

  // ─── C. FILE CLEANUP (every 24 hours at 3 AM) ──────────────────

  /**
   * Deletes unused uploaded files older than the configured threshold.
   * Delegates entirely to FilesService.cleanupUnused().
   * Idempotent: cleanup only targets isUsed=false and deletedAt IS NULL.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleFileCleanup(): Promise<void> {
    const thresholdHours = await this.systemConfigService.getNumber(
      'files.cleanup_hours',
      24,
    );

    this.logger.log(`File cleanup: starting (threshold: ${thresholdHours}h)`);

    try {
      const deleted = await this.filesService.cleanupUnused(thresholdHours);
      this.logger.log(`File cleanup: finished, ${deleted} files removed`);
    } catch (err) {
      this.logger.error(`File cleanup failed: ${err.message}`);
    }
  }
}
