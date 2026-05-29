import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { SubscriptionEvents } from '../events/events.types';
import { Job } from '../jobs/entities/job.entity';
import { PaymentMode } from '../common/enums/payment-mode.enum';
import { CashCollectionType } from '../common/enums/cash-collection-type.enum';

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
      providerTransactionId?: string;
    },
  ): Promise<UserSubscription> {
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
      providerTransactionId: paymentFields?.providerTransactionId ?? null,
    });

    const saved = await this.subRepo.save(sub);
    this.logger.log(
      `User ${userId} subscribed to plan ${plan.name} — status: ${saved.status}`,
    );

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
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });
    if (!sub) throw new NotFoundException('No active subscription found');

    sub.status = SubscriptionStatus.CANCELLED;
    sub.cancelledAt = new Date();
    const saved = await this.subRepo.save(sub);
    this.logger.log(`User ${userId} cancelled subscription`);
    return saved;
  }

  async cancelPendingCashSubscription(userId: string): Promise<UserSubscription> {
    const sub = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.PENDING_PAYMENT, paymentMode: PaymentMode.CASH_ON_FIRST_PICKUP },
      relations: ['plan', 'linkedFirstJob'],
    });
    if (!sub) throw new NotFoundException('No pending cash subscription found');

    // Cancel linked job if it hasn't started yet
    if (sub.linkedFirstJobId && sub.linkedFirstJob) {
      const job = sub.linkedFirstJob;
      if (job.status === 'REQUESTED' || job.status === 'ASSIGNED') {
        await this.jobRepo.update(job.id, {
          status: 'CANCELLED' as any,
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
    dto: { name?: string; price?: number; pickupsPerWeek?: number; isActive?: boolean; description?: string },
  ): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async adminVerifySubscription(subscriptionId: string): Promise<UserSubscription> {
    const sub = await this.subRepo.findOne({
      where: { id: subscriptionId },
      relations: ['plan'],
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status !== SubscriptionStatus.PENDING_PAYMENT) {
      throw new BadRequestException(`Subscription is not pending payment (status: ${sub.status})`);
    }

    return this.activateSubscription(sub);
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

  async adminRejectSubscription(subscriptionId: string, reason?: string): Promise<UserSubscription> {
    const sub = await this.subRepo.findOne({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status !== SubscriptionStatus.PENDING_PAYMENT) {
      throw new BadRequestException(`Subscription is not pending payment (status: ${sub.status})`);
    }

    sub.status = SubscriptionStatus.PAYMENT_FAILED;
    sub.paymentStatus = PaymentStatus.REJECTED;
    const saved = await this.subRepo.save(sub);

    this.logger.log(
      `Admin rejected subscription ${subscriptionId}${reason ? ` — reason: ${reason}` : ''}`,
    );
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
