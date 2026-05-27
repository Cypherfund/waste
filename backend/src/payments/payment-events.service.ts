import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionType } from './entities/payment-transaction.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobStatus } from '../common/enums/job-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { PaymentEvents, PaymentFailedPayload } from '../events/events.types';

@Injectable()
export class PaymentEventsService {
  private readonly logger = new Logger(PaymentEventsService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── HANDLE payment success ─────────────────────────────────────
  @OnEvent('payment.success')
  async onPaymentSuccess(payload: {
    transactionId: string;
    userId: string;
    type: TransactionType;
    amount: number;
    jobId?: string | null;
    payoutRequestId?: string | null;
  }): Promise<void> {
    this.logger.log(`Processing payment success: ${payload.transactionId}`);

    // Currently only CASHIN (job payments) is implemented via gateway
    // CASHOUT (payouts) is admin-only until cashout API is available
    if (payload.type === TransactionType.CASHIN && payload.jobId) {
      await this.handleJobPaymentSuccess(payload.jobId);
    }
  }

  // ── HANDLE payment failure ─────────────────────────────────────
  @OnEvent('payment.failed')
  async onPaymentFailed(payload: {
    transactionId: string;
    userId: string;
    type: TransactionType;
    amount: number;
    jobId?: string | null;
    payoutRequestId?: string | null;
    reason?: string;
  }): Promise<void> {
    this.logger.log(`Processing payment failure: ${payload.transactionId}`);

    // Currently only CASHIN (job payments) is implemented via gateway
    if (payload.type === TransactionType.CASHIN && payload.jobId) {
      await this.handleJobPaymentFailure(payload.jobId, payload.reason);
    }
  }

  // ── Job payment success ────────────────────────────────────────
  private async handleJobPaymentSuccess(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      this.logger.warn(`Job not found for payment success: ${jobId}`);
      return;
    }

    if (job.status !== JobStatus.PAYMENT_PENDING) {
      this.logger.log(`Job ${jobId} not in PAYMENT_PENDING status (current: ${job.status})`);
      return;
    }

    job.status = JobStatus.REQUESTED;
    job.paymentStatus = PaymentStatus.VERIFIED;
    await this.jobRepo.save(job);

    this.logger.log(`Job ${jobId} payment verified, status changed to REQUESTED`);
  }

  // ── Job payment failure ────────────────────────────────────────
  private async handleJobPaymentFailure(jobId: string, reason?: string): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      this.logger.warn(`Job not found for payment failure: ${jobId}`);
      return;
    }

    job.paymentStatus = PaymentStatus.REJECTED;
    job.paymentRejectionReason = reason || 'Payment failed';
    await this.jobRepo.save(job);

    this.logger.log(`Job ${jobId} payment failed: ${reason}`);

    // Emit payment failed event for notification
    const payload: PaymentFailedPayload = {
      userId: job.householdId,
      jobId: job.id,
      reason: reason || 'Payment failed',
      timestamp: new Date(),
    };
    this.eventEmitter.emit(PaymentEvents.FAILED, payload);
  }

  // Note: Payout (cashout) handling is admin-only until cashout API is available.
  // When a cashout API is implemented, add handlePayoutSuccess/handlePayoutFailure here.
}
