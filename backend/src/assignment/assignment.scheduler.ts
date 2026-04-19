import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Job } from '../jobs/entities/job.entity';
import { JobStatus } from '../common/enums/job-status.enum';
import { SystemConfigService } from '../config/system-config.service';
import { AssignmentService } from './assignment.service';

@Injectable()
export class AssignmentScheduler {
  private readonly logger = new Logger(AssignmentScheduler.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly systemConfigService: SystemConfigService,
    private readonly assignmentService: AssignmentService,
  ) {}

  /**
   * Runs every minute to check for timed-out assignments.
   * If a job has been ASSIGNED for longer than accept_timeout_minutes,
   * trigger reassignment via AssignmentService.handleTimeout().
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkTimeouts(): Promise<void> {
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
      `Found ${timedOutJobs.length} timed-out assignments (cutoff: ${cutoff.toISOString()})`,
    );

    for (const job of timedOutJobs) {
      try {
        await this.assignmentService.handleTimeout(job.id);
      } catch (error) {
        this.logger.error(
          `Failed to handle timeout for job ${job.id}: ${error.message}`,
        );
      }
    }
  }
}
