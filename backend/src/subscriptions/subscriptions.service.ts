import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { SubscriptionEvents } from '../events/events.types';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(UserSubscription)
    private readonly subRepo: Repository<UserSubscription>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({ where: { isActive: true }, order: { price: 'ASC' } });
  }

  async getPlan(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Subscription plan not found');
    return plan;
  }

  async subscribe(userId: string, planId: string): Promise<UserSubscription> {
    const plan = await this.getPlan(planId);

    const existing = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
    if (existing) {
      throw new BadRequestException(
        'You already have an active subscription. Cancel it before subscribing to a new plan.',
      );
    }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1);

    const monday = this.getMondayOfWeek(today);
    const mondayStr = monday.toISOString().split('T')[0];

    const sub = this.subRepo.create({
      userId,
      planId: plan.id,
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      remainingPickupsThisWeek: plan.pickupsPerWeek,
      weekResetDate: mondayStr,
      status: SubscriptionStatus.ACTIVE,
    });

    const saved = await this.subRepo.save(sub);
    this.logger.log(`User ${userId} subscribed to plan ${plan.name}`);

    // Emit subscription paid event for commission processing
    this.eventEmitter.emit(SubscriptionEvents.PAID, {
      subscriptionId: saved.id,
      userId,
      planId: plan.id,
      amount: plan.price,
      timestamp: new Date(),
    });

    return saved;
  }

  async getMySubscription(userId: string): Promise<UserSubscription | null> {
    return this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
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
}
