import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentSchedulerService {
  private readonly logger = new Logger(PaymentSchedulerService.name);

  constructor(private readonly paymentService: PaymentService) {}

  // ── Poll pending transactions every 30 seconds ─────────────────
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handlePendingTransactionPolling(): Promise<void> {
    const enabled = await this.paymentService.isPaymentIntegrationEnabled();
    if (!enabled) {
      return; // Skip if payment integration is disabled
    }

    this.logger.debug('Running pending transaction poll...');
    try {
      await this.paymentService.pollPendingTransactions();
    } catch (error) {
      this.logger.error(`Failed to poll pending transactions: ${error.message}`);
    }
  }

  // ── Timeout stale pending transactions every 10 minute ────────────
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleStaleTransactionTimeout(): Promise<void> {
    const enabled = await this.paymentService.isPaymentIntegrationEnabled();
    if (!enabled) {
      return; // Skip if payment integration is disabled
    }

    this.logger.debug('Running stale transaction timeout...');
    try {
      await this.paymentService.timeoutStalePendingTransactions();
    } catch (error) {
      this.logger.error(`Failed to timeout stale transactions: ${error.message}`);
    }
  }

  // ── Retry incomplete downstream processing every 2 minutes ───────
  @Cron('*/2 * * * *')
  async handleIncompleteProcessingRetry(): Promise<void> {
    const enabled = await this.paymentService.isPaymentIntegrationEnabled();
    if (!enabled) {
      return; // Skip if payment integration is disabled
    }

    this.logger.debug('Retrying incomplete payment processing...');
    try {
      await this.paymentService.retryIncompleteProcessing();
    } catch (error) {
      this.logger.error(`Failed to retry incomplete payment processing: ${error.message}`);
    }
  }
}
