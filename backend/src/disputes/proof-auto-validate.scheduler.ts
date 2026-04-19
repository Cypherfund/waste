import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobsService } from '../jobs/jobs.service';
import { SystemConfigService } from '../config/system-config.service';
import { ProofEvents } from '../events/events.types';

@Injectable()
export class ProofAutoValidateScheduler {
  private readonly logger = new Logger(ProofAutoValidateScheduler.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly systemConfigService: SystemConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Runs every 15 minutes.
   * Finds COMPLETED jobs older than the configured threshold and auto-validates them.
   * Idempotent: skips jobs already validated or disputed.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleAutoValidation(): Promise<void> {
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
    }

    if (validated > 0) {
      this.logger.log(`Auto-validation: validated ${validated} jobs`);
    }
  }
}
