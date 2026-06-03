import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { SubscriptionEvents } from '../events/events.types';
import { Job } from '../jobs/entities/job.entity';
import { PaymentMode } from '../common/enums/payment-mode.enum';
import { PaymentService } from '../payments/payment.service';
import { TransactionType, PaymentSource } from '../payments/entities/payment-transaction.entity';
import { CashCollectionType } from '../common/enums/cash-collection-type.enum';
import { JobStatus } from '../common/enums/job-status.enum';
import { SystemConfigService } from '../config/system-config.service';
import { AdminAuditService, AdminAuditAction, AdminAuditEntityType, AuditRequestContext } from '../admin/services/admin-audit.service';
import { SentryService } from '../sentry/sentry.service';
import { BusinessLoggerService, BusinessEventType } from '../common/services/business-logger.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(UserSubscription)
    private readonly subRepo: Repository<UserSubscription>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
    private readonly systemConfigService: SystemConfigService,
    private readonly sentryService: SentryService,
    private readonly businessLogger: BusinessLoggerService,
    private readonly paymentService: PaymentService,
    @Optional()
    private readonly adminAuditService?: AdminAuditService,
  ) {}

  async listPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({ where: { isActive: true }, order: { price: 'ASC' } });
  }

  async getPlan(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }

  async subscribe(
    userId: string,
    planId: string,
    paymentFields?: {
      paymentMode?: string;
      paymentRef?: string;
      paymentProofUrl?: string;
      paymentPhone?: string;
      paymentCode?: string;
      providerTransactionId?: string;
    },
  ): Promise<UserSubscription> {
    this.sentryService.setContext('subscription', {
      userId,
      planId,
      paymentMode: paymentFields?.paymentMode,
    });

    this.sentryService.addBreadcrumb({
      category: 'subscription',
      message: 'Creating new subscription',
      level: 'info',
      data: {
        userId,
        planId,
      },
    });
    const plan = await this.getPlan(planId);

    const existing = await this.subRepo.findOne({
      where: [
        { userId, status: SubscriptionStatus.ACTIVE },
        { userId, status: SubscriptionStatus.PENDING_PAYMENT },
      ],
    });
    if (existing) {
      throw new BadRequestException(
        existing.status === SubscriptionStatus.PENDING_PAYMENT
          ? 'You already have a subscription awaiting payment verification.'
          : 'You already have an active subscription. Cancel it before subscribing to a new plan.',
      );
    }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);

    const monday = this.getMondayOfWeek(today);
    const mondayStr = monday.toISOString().split('T')[0];

    const requiresPayment = !!paymentFields?.paymentMode;
    const isIntegrated = paymentFields?.paymentMode === PaymentMode.INTEGRATED_PROVIDER;

    // Validate integrated payment required fields
    if (isIntegrated) {
      if (!paymentFields?.paymentPhone || !paymentFields?.paymentCode) {
        throw new BadRequestException('paymentPhone and paymentCode are required for integrated subscription payment');
      }
    }

    // For integrated payments, initiate payment transaction before creating subscription
    let providerTransactionId: string | null = paymentFields?.providerTransactionId ?? null;
    if (isIntegrated && paymentFields?.paymentPhone && paymentFields?.paymentCode) {
      try {
        const paymentTx = await this.paymentService.initiatePayment(userId, {
          type: TransactionType.CASHIN,
          amount: plan.price,
          paymentCode: paymentFields.paymentCode,
          phone: paymentFields.paymentPhone,
          paymentSource: PaymentSource.SUBSCRIPTION_PAYMENT,
        });
        providerTransactionId = paymentTx.id;
        this.logger.log(`Integrated payment initiated for subscription: tx ${paymentTx.id}`);
      } catch (error) {
        this.logger.error(`Failed to initiate integrated payment for subscription: ${error.message}`);
        throw new BadRequestException(
          'Could not initiate payment. Please try another payment method or contact support.'
        );
      }
    }

    const sub = this.subRepo.create({
      userId,
      planId: plan.id,
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      remainingPickupsThisWeek: requiresPayment ? 0 : plan.pickupsPerWeek,
      weekResetDate: requiresPayment ? null : mondayStr,
      status: requiresPayment ? SubscriptionStatus.PENDING_PAYMENT : SubscriptionStatus.ACTIVE,
      paymentMode: paymentFields?.paymentMode ?? null,
      paymentStatus: requiresPayment ? PaymentStatus.AWAITING_ADMIN_VERIFICATION : null,
      paymentRef: paymentFields?.paymentRef ?? null,
      paymentProofUrl: paymentFields?.paymentProofUrl ?? null,
      paymentPhone: paymentFields?.paymentPhone ?? null,
      providerTransactionId,
    });

    const saved = await this.subRepo.save(sub);
    this.logger.log(`User ${userId} subscribed to plan ${plan.name} — status: ${saved.status}`);

    // Only emit commission event for immediately-active subscriptions (admin-created / backward compat)
    if (!requiresPayment) {
      this.eventEmitter.emit(SubscriptionEvents.PAID, {
        subscriptionId: saved.id,
        userId,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        timestamp: new Date(),
      });
    }

    return saved;
  }

  async getMySubscription(userId: string): Promise<UserSubscription | null> {
    return this.subRepo.findOne({
      where: [
        { userId, status: SubscriptionStatus.ACTIVE },
        { userId, status: SubscriptionStatus.PENDING_PAYMENT },
      ],
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async getSubscriptionHistory(userId: string): Promise<UserSubscription[]> {
    return this.subRepo.find({
      where: { userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async cancel(userId: string): Promise<UserSubscription> {
    const sub = await this.subRepo.findOne({
      where: [
        { userId, status: SubscriptionStatus.ACTIVE },
        {
          userId,
          status: SubscriptionStatus.PENDING_PAYMENT,
          paymentMode: PaymentMode.CASH_ON_FIRST_PICKUP,
        },
      ],
      relations: ['plan', 'linkedFirstJob'],
    });
    if (!sub) throw new NotFoundException('No active or pending cash subscription found');

    // For pending cash subscriptions, cancel linked job if it hasn't started
    if (
      sub.status === SubscriptionStatus.PENDING_PAYMENT &&
      sub.paymentMode === PaymentMode.CASH_ON_FIRST_PICKUP
    ) {
      if (sub.linkedFirstJobId && sub.linkedFirstJob) {
        const job = sub.linkedFirstJob;
        if (job.status === JobStatus.REQUESTED || job.status === JobStatus.ASSIGNED) {
          await this.jobRepo.update(job.id, {
            status: JobStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: 'Cash subscription cancelled before pickup',
          });
          this.logger.log(`Cancelled linked job ${job.id} for cash subscription ${sub.id}`);
        }
      }
    }

    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelledAt = new Date();
    const saved = await this.subRepo.save(sub);
    this.logger.log(`User ${userId} cancelled subscription`);
    return saved;
  }

  async cancelPendingCashSubscription(userId: string): Promise<UserSubscription> {
    const sub = await this.subRepo.findOne({
      where: {
        userId,
        status: SubscriptionStatus.PENDING_PAYMENT,
        paymentMode: PaymentMode.CASH_ON_FIRST_PICKUP,
      },
      relations: ['plan', 'linkedFirstJob'],
    });
    if (!sub) throw new NotFoundException('No pending cash subscription found');

    // Cancel linked job if it hasn't started yet
    if (sub.linkedFirstJobId && sub.linkedFirstJob) {
      const job = sub.linkedFirstJob;
      if (job.status === JobStatus.REQUESTED || job.status === JobStatus.ASSIGNED) {
        await this.jobRepo.update(job.id, {
          status: JobStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'Cash subscription cancelled before pickup',
        });
        this.logger.log(`Cancelled linked job ${job.id} for cash subscription ${sub.id}`);
      }
    }

    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelledAt = new Date();
    const saved = await this.subRepo.save(sub);
    this.logger.log(`User ${userId} cancelled pending cash subscription ${sub.id}`);
    return saved;
  }

  async subscribeWithCashOnFirstPickup(
    userId: string,
    planId: string,
    jobDetails: {
      scheduledDate: string;
      scheduledTime: string;
      locationAddress: string;
      locationLat?: number;
      locationLng?: number;
      notes?: string;
    },
  ): Promise<{ subscription: UserSubscription; job: Job }> {
    const plan = await this.getPlan(planId);

    // Validate scheduled date is at least booking.min_advance_hours from now
    const scheduledDate = new Date(jobDetails.scheduledDate);
    const minAdvanceHours = await this.systemConfigService.getNumber(
      'booking.min_advance_hours',
      24,
    );
    const earliest = new Date(Date.now() + minAdvanceHours * 60 * 60 * 1000);
    earliest.setHours(0, 0, 0, 0);

    if (scheduledDate < earliest) {
      throw new BadRequestException(
        `Booking must be scheduled at least ${minAdvanceHours} hours in advance`,
      );
    }

    // Duplicate check: prevent duplicate active job for same date
    const activeStatuses = [
      JobStatus.REQUESTED,
      JobStatus.ASSIGNED,
      JobStatus.IN_PROGRESS,
      JobStatus.PAYMENT_PENDING,
    ];
    const existingJob = await this.jobRepo.findOne({
      where: {
        householdId: userId,
        scheduledDate: jobDetails.scheduledDate,
        status: In(activeStatuses),
      },
    });

    if (existingJob) {
      throw new ConflictException('You already have an active job scheduled for this date');
    }

    // Check for existing subscriptions
    const existing = await this.subRepo.findOne({
      where: [
        { userId, status: SubscriptionStatus.ACTIVE },
        { userId, status: SubscriptionStatus.PENDING_PAYMENT },
      ],
    });
    if (existing) {
      throw new BadRequestException(
        existing.status === SubscriptionStatus.PENDING_PAYMENT
          ? 'You already have a subscription awaiting payment verification.'
          : 'You already have an active subscription. Cancel it before subscribing to a new plan.',
      );
    }

    // Create subscription and job in a single transaction
    const result = await this.dataSource.transaction(async (manager) => {
      const subRepo = manager.getRepository(UserSubscription);
      const jobRepo = manager.getRepository(Job);

      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + 1);

      // Create subscription
      const subscription = subRepo.create({
        userId,
        planId: plan.id,
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        remainingPickupsThisWeek: 0, // Will be set to plan.pickupsPerWeek - 1 after cash collection
        weekResetDate: null,
        status: SubscriptionStatus.PENDING_PAYMENT,
        paymentMode: PaymentMode.CASH_ON_FIRST_PICKUP,
        paymentStatus: PaymentStatus.PENDING,
      });

      const savedSubscription = await subRepo.save(subscription);

      // Create first job
      const job = jobRepo.create({
        householdId: userId,
        status: 'REQUESTED' as any,
        scheduledDate: jobDetails.scheduledDate,
        scheduledTime: jobDetails.scheduledTime,
        locationAddress: jobDetails.locationAddress,
        locationLat: jobDetails.locationLat ?? null,
        locationLng: jobDetails.locationLng ?? null,
        notes: jobDetails.notes ?? null,
        paymentMode: PaymentMode.CASH_ON_FIRST_PICKUP,
        paymentStatus: PaymentStatus.PENDING,
        quotedPrice: plan.price,
        pricingType: 'SUBSCRIPTION' as any,
        isCoveredBySubscription: false,
        subscriptionId: savedSubscription.id,
        cashToCollectAmount: plan.price,
        cashCollectionType: CashCollectionType.SUBSCRIPTION_FIRST_PICKUP,
      });

      const savedJob = await jobRepo.save(job);

      // Link subscription to job
      savedSubscription.linkedFirstJobId = savedJob.id;
      await subRepo.save(savedSubscription);

      return { subscription: savedSubscription, job: savedJob };
    });

    this.logger.log(
      `User ${userId} subscribed to plan ${plan.name} with Cash on First Pickup — subscription: ${result.subscription.id}, job: ${result.job.id}`,
    );

    return result;
  }

  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ─── Admin ────────────────────────────────────────────────────

  async adminListPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({ order: { price: 'ASC' } });
  }

  async adminCreatePlan(dto: {
    name: string;
    price: number;
    pickupsPerWeek: number;
    description?: string;
  }): Promise<SubscriptionPlan> {
    const plan = this.planRepo.create({
      name: dto.name,
      price: dto.price,
      currency: 'XAF',
      pickupsPerWeek: dto.pickupsPerWeek,
      description: dto.description ?? null,
      isActive: true,
    });
    return this.planRepo.save(plan);
  }

  async adminUpdatePlan(
    planId: string,
    dto: {
      name?: string;
      price?: number;
      pickupsPerWeek?: number;
      isActive?: boolean;
      description?: string;
    },
  ): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async adminVerifySubscription(subscriptionId: string, adminId: string, context?: AuditRequestContext): Promise<UserSubscription> {
    const sub = await this.subRepo.findOne({
      where: { id: subscriptionId },
      relations: ['plan'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status !== SubscriptionStatus.PENDING_PAYMENT) {
      throw new BadRequestException(`Subscription is not pending payment (status: ${sub.status})`);
    }

    const oldStatus = sub.status;
    const oldPaymentStatus = sub.paymentStatus;

    const result = await this.activateSubscription(sub);

    // Log audit
    if (this.adminAuditService) {
      await this.adminAuditService.log({
        adminId,
        action: AdminAuditAction.SUBSCRIPTION_PAYMENT_VERIFIED,
        entityType: AdminAuditEntityType.SUBSCRIPTION,
        entityId: subscriptionId,
        oldValue: { status: oldStatus, paymentStatus: oldPaymentStatus },
        newValue: { status: SubscriptionStatus.ACTIVE, paymentStatus: PaymentStatus.VERIFIED },
        metadata: { userId: sub.userId, planId: sub.planId, amount: sub.plan.price },
        context,
      });
    }

    return result;
  }

  // Shared activation logic for both admin verification and wallet payment
  async activateSubscription(subscription: UserSubscription): Promise<UserSubscription> {
    const monday = this.getMondayOfWeek(new Date());
    const mondayStr = monday.toISOString().split('T')[0];

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.paymentStatus = PaymentStatus.VERIFIED;
    subscription.remainingPickupsThisWeek = subscription.plan.pickupsPerWeek;
    subscription.weekResetDate = mondayStr;
    const saved = await this.subRepo.save(subscription);

    this.logger.log(`Subscription ${subscription.id} activated → ACTIVE`);

    // Emit commission event now that payment is verified
    this.eventEmitter.emit(SubscriptionEvents.PAID, {
      subscriptionId: saved.id,
      userId: saved.userId,
      planId: saved.planId,
      planName: saved.plan.name,
      amount: saved.plan.price,
      timestamp: new Date(),
    });

    return saved;
  }

  async adminRejectSubscription(
    subscriptionId: string,
    adminId: string,
    reason?: string,
    context?: AuditRequestContext,
  ): Promise<UserSubscription> {
    const sub = await this.subRepo.findOne({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status !== SubscriptionStatus.PENDING_PAYMENT) {
      throw new BadRequestException(`Subscription is not pending payment (status: ${sub.status})`);
    }

    const oldStatus = sub.status;
    const oldPaymentStatus = sub.paymentStatus;

    sub.status = SubscriptionStatus.PAYMENT_FAILED;
    sub.paymentStatus = PaymentStatus.REJECTED;
    const saved = await this.subRepo.save(sub);

    this.logger.log(
      `Admin rejected subscription ${subscriptionId}${reason ? ` — reason: ${reason}` : ''}`,
    );

    // Log audit
    if (this.adminAuditService) {
      await this.adminAuditService.log({
        adminId,
        action: AdminAuditAction.SUBSCRIPTION_PAYMENT_REJECTED,
        entityType: AdminAuditEntityType.SUBSCRIPTION,
        entityId: subscriptionId,
        oldValue: { status: oldStatus, paymentStatus: oldPaymentStatus },
        newValue: { status: SubscriptionStatus.PAYMENT_FAILED, paymentStatus: PaymentStatus.REJECTED },
        metadata: { reason, userId: sub.userId, planId: sub.planId },
        context,
      });
    }

    return saved;
  }

  async adminListPendingSubscriptionPayments(): Promise<UserSubscription[]> {
    return this.subRepo.find({
      where: { status: SubscriptionStatus.PENDING_PAYMENT },
      relations: ['plan', 'user', 'linkedFirstJob'],
      order: { createdAt: 'ASC' },
    });
  }
}
