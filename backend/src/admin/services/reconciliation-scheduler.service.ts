import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReconciliationService } from './reconciliation.service';
import { SystemConfigService } from '../../config/system-config.service';
import { ReconciliationRun, ReconciliationRunStatus, ReconciliationRunTrigger } from '../entities/reconciliation-run.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ReconciliationSchedulerService {
  private readonly logger = new Logger(ReconciliationSchedulerService.name);

  constructor(
    @InjectRepository(ReconciliationRun)
    private readonly reconciliationRunRepo: Repository<ReconciliationRun>,
    private readonly reconciliationService: ReconciliationService,
    private readonly systemConfigService: SystemConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailyReconciliationCron(): Promise<void> {
    const enabled = await this.systemConfigService.getBoolean('reconciliation.enabled', true);
    if (!enabled) {
      this.logger.log('Automated reconciliation is disabled via config');
      return;
    }

    this.logger.log('Starting automated daily reconciliation');
    await this.runForPreviousBusinessDay();
  }

  async runForPreviousBusinessDay(): Promise<ReconciliationRun> {
    const businessTimezone = await this.systemConfigService.getString(
      'reconciliation.business_timezone',
      'Africa/Douala',
    );

    const now = new Date();
    const previousDay = new Date(now);
    previousDay.setDate(previousDay.getDate() - 1);
    previousDay.setHours(0, 0, 0, 0);

    const dateStr = previousDay.toISOString().split('T')[0];
    return this.runForDate(dateStr, ReconciliationRunTrigger.SCHEDULED, undefined);
  }

  async runForDate(
    date: string,
    trigger: ReconciliationRunTrigger = ReconciliationRunTrigger.MANUAL,
    adminId?: string,
  ): Promise<ReconciliationRun> {
    const retryAttempts = await this.systemConfigService.getNumber('reconciliation.retry_attempts', 3);
    const retryDelayMinutes = await this.systemConfigService.getNumber('reconciliation.retry_delay_minutes', 5);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < retryAttempts) {
      attempt++;
      this.logger.log(`Reconciliation attempt ${attempt}/${retryAttempts} for date ${date}`);

      try {
        const run = await this.executeReconciliation(date, trigger, adminId, attempt);
        
        if (run.status === ReconciliationRunStatus.SUCCESS || run.status === ReconciliationRunStatus.SUCCESS_WITH_WARNINGS) {
          return run;
        }
        
        lastError = new Error(run.errorMessage || 'Reconciliation failed with unknown error');
      } catch (error) {
        lastError = error as Error;
        this.logger.error(`Reconciliation attempt ${attempt} failed: ${error.message}`);
      }

      if (attempt < retryAttempts) {
        this.logger.log(`Waiting ${retryDelayMinutes} minutes before retry...`);
        await this.sleep(retryDelayMinutes * 60 * 1000);
      }
    }

    throw lastError || new Error('Reconciliation failed after all retry attempts');
  }

  private async executeReconciliation(
    date: string,
    trigger: ReconciliationRunTrigger,
    adminId: string | undefined,
    attempt: number,
  ): Promise<ReconciliationRun> {
    const existingRun = await this.reconciliationRunRepo.findOne({
      where: { reconciliationDate: date },
    });

    if (existingRun && existingRun.status === ReconciliationRunStatus.RUNNING) {
      this.logger.warn(`Reconciliation for ${date} is already running`);
      return existingRun;
    }

    const run = existingRun || this.reconciliationRunRepo.create({
      reconciliationDate: date,
      status: ReconciliationRunStatus.RUNNING,
      triggeredBy: trigger,
      triggeredByAdminId: adminId,
      attemptCount: attempt,
      startedAt: new Date(),
    });

    await this.reconciliationRunRepo.save(run);

    try {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const summary = await this.reconciliationService.saveDailySummary(date);
      const unreconciled = await this.reconciliationService.getUnreconciledItems(startDate, endDate);

      run.summaryId = summary.id;
      run.unreconciledCount = unreconciled.length;
      run.status = unreconciled.length > 0 ? ReconciliationRunStatus.SUCCESS_WITH_WARNINGS : ReconciliationRunStatus.SUCCESS;
      run.finishedAt = new Date();

      await this.reconciliationRunRepo.save(run);

      if (unreconciled.length > 0) {
        await this.notifyAdminsOnIssues(date, unreconciled.length);
      } else {
        const alertOnSuccess = await this.systemConfigService.getBoolean('reconciliation.alert_on_success', false);
        if (alertOnSuccess) {
          await this.notifyAdminsOnSuccess(date);
        }
      }

      this.logger.log(`Reconciliation for ${date} completed successfully with ${unreconciled.length} unreconciled items`);
      return run;
    } catch (error) {
      run.status = ReconciliationRunStatus.FAILED;
      run.errorMessage = (error as Error).message;
      run.finishedAt = new Date();
      run.attemptCount = attempt;
      await this.reconciliationRunRepo.save(run);

      await this.notifyAdminsOnFailure(date, attempt, (error as Error).message);

      this.logger.error(`Reconciliation for ${date} failed: ${error.message}`);
      throw error;
    }
  }

  private async notifyAdminsOnIssues(date: string, count: number): Promise<void> {
    const alertOnUnreconciled = await this.systemConfigService.getBoolean('reconciliation.alert_on_unreconciled', true);
    if (!alertOnUnreconciled) return;

    const message = `Daily reconciliation for ${date} completed with ${count} unreconciled items. Please review.`;
    this.logger.log(`Admin notification: ${message}`);

    this.eventEmitter.emit('admin.notification', {
      type: 'RECONCILIATION_ISSUES',
      message,
      severity: 'WARNING',
      data: { date, unreconciledCount: count },
    });
  }

  private async notifyAdminsOnSuccess(date: string): Promise<void> {
    const message = `Daily reconciliation for ${date} completed successfully. No unreconciled items found.`;
    this.logger.log(`Admin notification: ${message}`);

    this.eventEmitter.emit('admin.notification', {
      type: 'RECONCILIATION_SUCCESS',
      message,
      severity: 'INFO',
      data: { date },
    });
  }

  private async notifyAdminsOnFailure(date: string, attempt: number, errorMessage: string): Promise<void> {
    const alertOnFailure = await this.systemConfigService.getBoolean('reconciliation.alert_on_failure', true);
    if (!alertOnFailure) return;

    const message = `Daily reconciliation for ${date} failed after ${attempt} attempts. Please rerun manually or check logs.`;
    this.logger.log(`Admin notification: ${message}`);

    this.eventEmitter.emit('admin.notification', {
      type: 'RECONCILIATION_FAILURE',
      message,
      severity: 'ERROR',
      data: { date, attempt, errorMessage },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
