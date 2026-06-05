import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TransactionType,
  TransactionStatus,
  PaymentTransaction,
  PaymentSource,
} from './entities/payment-transaction.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobStatus } from '../common/enums/job-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { PaymentEvents, PaymentFailedPayload, SubscriptionEvents } from '../events/events.types';
import { User } from '../users/entities/user.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import {
  WalletLedger,
  WalletLedgerDirection,
  WalletLedgerType,
} from '../wallet/entities/wallet-ledger.entity';
import { SentryService } from '../sentry/sentry.service';
import { BusinessLoggerService, BusinessEventType } from '../common/services/business-logger.service';

@Injectable()
export class PaymentEventsService {
  private readonly logger = new Logger(PaymentEventsService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WalletLedger)
    private readonly walletLedgerRepo: Repository<WalletLedger>,
    @InjectRepository(UserSubscription)
    private readonly subRepo: Repository<UserSubscription>,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
    private readonly sentryService: SentryService,
    private readonly businessLogger: BusinessLoggerService,
  ) {}

  // ── HANDLE payment success ─────────────────────────────────────
  @OnEvent('payment.success')
  async onPaymentSuccess(payload: {
    transactionId: string;
    userId: string;
    type: TransactionType;
    paymentSource?: PaymentSource;
    amount: number;
    jobId?: string | null;
    payoutRequestId?: string | null;
  }): Promise<void> {
    this.logger.log(`Processing payment success: ${payload.transactionId}`);

    this.sentryService.addBreadcrumb({
      category: 'payment',
      message: 'Processing payment success event',
      level: 'info',
      data: {
        transactionId: payload.transactionId,
        userId: payload.userId,
        type: payload.type,
        amount: payload.amount,
      },
    });

    this.sentryService.setContext('payment_event', {
      transactionId: payload.transactionId,
      userId: payload.userId,
      type: payload.type,
      amount: payload.amount,
      jobId: payload.jobId,
      payoutRequestId: payload.payoutRequestId,
    });

    // Handle wallet top-up via integrated provider
    if (payload.type === TransactionType.WALLET_TOPUP) {
      await this.handleWalletTopUpSuccess(payload.transactionId, payload.userId, payload.amount);
    }
    // Handle subscription payments via integrated provider
    else if (payload.paymentSource === PaymentSource.SUBSCRIPTION_PAYMENT) {
      await this.handleSubscriptionPaymentSuccess(payload.transactionId, payload.userId);
    }
    // Handle job payments via integrated provider
    else if (payload.type === TransactionType.CASHIN && payload.jobId) {
      await this.handleJobPaymentSuccess(payload.jobId);
    }
  }

  // ── HANDLE payment failure ─────────────────────────────────────
  @OnEvent('payment.failed')
  async onPaymentFailed(payload: {
    transactionId: string;
    userId: string;
    type: TransactionType;
    paymentSource?: PaymentSource;
    amount: number;
    jobId?: string | null;
    payoutRequestId?: string | null;
    reason?: string;
  }): Promise<void> {
    this.logger.log(`Processing payment failure: ${payload.transactionId}`);

    this.sentryService.addBreadcrumb({
      category: 'payment',
      message: 'Processing payment failure event',
      level: 'warning',
      data: {
        transactionId: payload.transactionId,
        userId: payload.userId,
        type: payload.type,
        amount: payload.amount,
        reason: payload.reason,
      },
    });

    this.sentryService.setContext('payment_event_failed', {
      transactionId: payload.transactionId,
      userId: payload.userId,
      type: payload.type,
      amount: payload.amount,
      jobId: payload.jobId,
      payoutRequestId: payload.payoutRequestId,
      reason: payload.reason,
    });

    // Handle subscription payment failure
    if (payload.paymentSource === PaymentSource.SUBSCRIPTION_PAYMENT) {
      await this.handleSubscriptionPaymentFailure(payload.transactionId, payload.userId, payload.reason);
    }
    // Handle job payment failure
    else if (payload.type === TransactionType.CASHIN && payload.jobId) {
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

  // ── Wallet top-up success ───────────────────────────────────────
  private async handleWalletTopUpSuccess(
    transactionId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    return this.dataSource.transaction(async (em) => {
      // Lock transaction for idempotency
      const transaction = await em
        .getRepository(PaymentTransaction)
        .createQueryBuilder('t')
        .where('t.id = :id', { id: transactionId })
        .setLock('pessimistic_write')
        .getOne();

      if (!transaction) {
        this.logger.warn(`Transaction not found for wallet top-up success: ${transactionId}`);
        return;
      }

      // Idempotency: check wallet ledger for existing entry
      const existingLedger = await em
        .getRepository(WalletLedger)
        .findOne({ where: { paymentTransactionId: transactionId } });

      if (existingLedger) {
        this.logger.log(`Wallet top-up ${transactionId} already credited`);
        return;
      }

      // Get user with lock
      const user = await em
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :id', { id: userId })
        .setLock('pessimistic_write')
        .getOne();

      if (!user) {
        this.logger.warn(`User not found for wallet top-up success: ${userId}`);
        return;
      }

      const balanceBefore = Number(user.walletBalance);
      const balanceAfter = balanceBefore + amount;

      // Credit wallet
      await em
        .createQueryBuilder()
        .update(User)
        .set({ walletBalance: () => `wallet_balance + ${amount}` })
        .where('id = :id', { id: userId })
        .execute();

      // Mark transaction as verified (successful processing)
      transaction.status = TransactionStatus.VERIFIED;
      await em.save(transaction);

      // Write wallet ledger entry
      const ledger = em.getRepository(WalletLedger).create({
        userId,
        direction: WalletLedgerDirection.CREDIT,
        type: WalletLedgerType.WALLET_TOPUP,
        amount,
        balanceBefore,
        balanceAfter,
        paymentTransactionId: transactionId,
        reference: `Wallet top-up ${transactionId}`,
      });
      await em.getRepository(WalletLedger).save(ledger);

      this.logger.log(
        `Wallet credited for user ${userId}: +${amount} XAF, transaction ${transactionId}`,
      );
    });
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
    job.status = JobStatus.PAYMENT_FAILED;
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

  // ── Subscription payment success ───────────────────────────────
  private async handleSubscriptionPaymentSuccess(
    transactionId: string,
    userId: string,
  ): Promise<void> {
    const sub = await this.subRepo.findOne({
      where: { userId, providerTransactionId: transactionId },
      relations: ['plan'],
    });
    if (!sub) {
      this.logger.warn(`Subscription not found for payment success: tx ${transactionId}`);
      return;
    }

    // Idempotency: skip if already active (already processed)
    if (sub.status === SubscriptionStatus.ACTIVE && sub.paymentStatus === PaymentStatus.VERIFIED) {
      this.logger.log(`Subscription ${sub.id} already active for user ${userId}`);
      return;
    }

    const today = new Date();
    const monday = this.getMondayOfWeek(today);
    const mondayStr = monday.toISOString().split('T')[0];

    const wasInactive = sub.status !== SubscriptionStatus.ACTIVE;

    sub.status = SubscriptionStatus.ACTIVE;
    sub.paymentStatus = PaymentStatus.VERIFIED;
    sub.remainingPickupsThisWeek = sub.plan?.pickupsPerWeek ?? 0;
    sub.weekResetDate = mondayStr;
    await this.subRepo.save(sub);

    this.logger.log(`Subscription ${sub.id} activated after payment success`);

    // Emit subscription paid event only on first activation
    if (wasInactive) {
      this.eventEmitter.emit(SubscriptionEvents.PAID, {
        subscriptionId: sub.id,
        userId: sub.userId,
        planId: sub.planId,
        planName: sub.plan?.name ?? null,
        amount: Number(sub.plan?.price ?? 0),
        timestamp: new Date(),
      });
    }
  }

  // ── Subscription payment failure ───────────────────────────────
  private async handleSubscriptionPaymentFailure(
    transactionId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const sub = await this.subRepo.findOne({
      where: { userId, providerTransactionId: transactionId },
    });
    if (!sub) {
      this.logger.warn(`Subscription not found for payment failure: tx ${transactionId}`);
      return;
    }

    sub.paymentStatus = PaymentStatus.REJECTED;
    await this.subRepo.save(sub);

    this.logger.log(`Subscription ${sub.id} payment failed: ${reason}`);
  }

  // ── Helper: Get Monday of current week ─────────────────────────
  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Note: Payout (cashout) handling is admin-only until cashout API is available.
  // When a cashout API is implemented, add handlePayoutSuccess/handlePayoutFailure here.
}
