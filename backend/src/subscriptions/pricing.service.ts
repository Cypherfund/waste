import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { PricingType } from '../common/enums/pricing-type.enum';
import { SystemConfigService } from '../config/system-config.service';

export interface RecommendedPlan {
  id: string;
  name: string;
  price: number;
  pickupsPerWeek: number;
}

export interface PricingQuote {
  quotedPrice: number;
  pricingType: PricingType;
  isCoveredBySubscription: boolean;
  remainingPickupsThisWeek: number | null;
  planName: string | null;
  perPickupPrice: number;
  subscriptionPrice: number;
  subscriptionSavingsMessage: string | null;
  recommendedPlan: RecommendedPlan | null;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    @InjectRepository(UserSubscription)
    private readonly subRepo: Repository<UserSubscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  private async getRequiredNumber(key: string): Promise<number> {
    const config = await this.systemConfigService['configRepo'].findOne({ where: { key } });
    if (!config) {
      throw new Error(
        `Required configuration '${key}' is not set in system config. Please configure this value in the database.`,
      );
    }
    const parsed = parseFloat(config.value);
    if (isNaN(parsed)) {
      throw new Error(`Configuration '${key}' is not a valid number: ${config.value}`);
    }
    return parsed;
  }

  async getQuoteForUser(userId: string): Promise<PricingQuote> {
    const perPickupPrice = await this.getRequiredNumber('pricing.per_pickup_price');

    // Get the lowest priced active subscription plan
    const plans = await this.planRepo.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
    const cheapestPlan = plans[0];
    const subscriptionPrice = cheapestPlan?.price;

    const sub = await this.getActiveSubscription(userId);

    const buildRecommendedPlan = (plan?: SubscriptionPlan): RecommendedPlan | null =>
      plan
        ? { id: plan.id, name: plan.name, price: plan.price, pickupsPerWeek: plan.pickupsPerWeek }
        : null;

    if (!sub) {
      return {
        quotedPrice: perPickupPrice,
        pricingType: PricingType.PAY_PER_PICKUP,
        isCoveredBySubscription: false,
        remainingPickupsThisWeek: null,
        planName: null,
        perPickupPrice,
        subscriptionPrice: subscriptionPrice ?? 0,
        subscriptionSavingsMessage: await this.buildSavingsMessage(
          perPickupPrice,
          subscriptionPrice,
          cheapestPlan?.pickupsPerWeek,
        ),
        recommendedPlan: buildRecommendedPlan(cheapestPlan),
      };
    }

    await this.resetWeeklyPickupsIfNeeded(sub);

    if (sub.remainingPickupsThisWeek > 0) {
      return {
        quotedPrice: 0,
        pricingType: PricingType.SUBSCRIPTION,
        isCoveredBySubscription: true,
        remainingPickupsThisWeek: sub.remainingPickupsThisWeek,
        planName: sub.plan?.name ?? null,
        perPickupPrice,
        subscriptionPrice: sub.plan?.price ?? subscriptionPrice ?? 0,
        subscriptionSavingsMessage: null,
        recommendedPlan: null,
      };
    }

    // Active subscription but pickups exhausted — recommend renewal/upgrade
    return {
      quotedPrice: perPickupPrice,
      pricingType: PricingType.PAY_PER_PICKUP,
      isCoveredBySubscription: false,
      remainingPickupsThisWeek: 0,
      planName: sub.plan?.name ?? null,
      perPickupPrice,
      subscriptionPrice: sub.plan?.price ?? subscriptionPrice ?? 0,
      subscriptionSavingsMessage: null,
      recommendedPlan: buildRecommendedPlan(cheapestPlan),
    };
  }

  async consumePickup(userId: string): Promise<boolean> {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) return false;

    await this.resetWeeklyPickupsIfNeeded(sub);

    // Atomic decrement: only succeeds if remaining > 0 at the moment of the UPDATE
    const result = await this.subRepo
      .createQueryBuilder()
      .update()
      .set({ remainingPickupsThisWeek: () => 'remaining_pickups_this_week - 1' })
      .where('id = :id AND remaining_pickups_this_week > 0', { id: sub.id })
      .execute();

    const consumed = (result.affected ?? 0) > 0;
    if (consumed) {
      this.logger.log(
        `Consumed 1 pickup for user ${userId}. Remaining: ${sub.remainingPickupsThisWeek - 1}`,
      );
    } else {
      this.logger.warn(`Pickup quota already exhausted for user ${userId} — job creation blocked`);
    }
    return consumed;
  }

  async getActiveSubscription(userId: string): Promise<UserSubscription | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.subRepo
      .findOne({
        where: { userId, status: SubscriptionStatus.ACTIVE },
        relations: ['plan'],
        order: { createdAt: 'DESC' },
      })
      .then((sub) => {
        if (!sub) return null;
        if (sub.endDate < today) return null;
        return sub;
      });
  }

  private async resetWeeklyPickupsIfNeeded(sub: UserSubscription): Promise<void> {
    const today = new Date();
    const monday = this.getMondayOfWeek(today);
    const mondayStr = monday.toISOString().split('T')[0];

    if (sub.weekResetDate !== mondayStr) {
      sub.remainingPickupsThisWeek = sub.plan?.pickupsPerWeek ?? 2;
      sub.weekResetDate = mondayStr;
      await this.subRepo.save(sub);
      this.logger.log(
        `Reset weekly pickups for user ${sub.userId} to ${sub.remainingPickupsThisWeek}`,
      );
    }
  }

  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private async buildSavingsMessage(
    perPickupPrice: number,
    subscriptionPrice?: number,
    pickupsPerWeek?: number,
  ): Promise<string | null> {
    if (!subscriptionPrice) return null;

    const defaultPickupsPerWeek = pickupsPerWeek ?? 2;
    const weeksPerMonth = await this.getRequiredNumber('pricing.weeks_per_month');
    const monthlyPickups = defaultPickupsPerWeek * weeksPerMonth;
    const payAsYouGoCost = monthlyPickups * perPickupPrice;
    const savings = payAsYouGoCost - subscriptionPrice;
    if (savings <= 0) return null;
    return `Subscribe for ${subscriptionPrice.toLocaleString()} XAF/month — save up to ${savings.toLocaleString()} XAF/month`;
  }
}
