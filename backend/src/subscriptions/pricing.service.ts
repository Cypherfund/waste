import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { PricingType } from '../common/enums/pricing-type.enum';
import { SystemConfigService } from '../config/system-config.service';

export interface PricingQuote {
  quotedPrice: number;
  pricingType: PricingType;
  isCoveredBySubscription: boolean;
  remainingPickupsThisWeek: number | null;
  planName: string | null;
  perPickupPrice: number;
  subscriptionSavingsMessage: string | null;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    @InjectRepository(UserSubscription)
    private readonly subRepo: Repository<UserSubscription>,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async getQuoteForUser(userId: string): Promise<PricingQuote> {
    const perPickupPrice = await this.systemConfigService.getNumber(
      'pricing.per_pickup_price',
      1000,
    );

    const sub = await this.getActiveSubscription(userId);

    if (!sub) {
      return {
        quotedPrice: perPickupPrice,
        pricingType: PricingType.PAY_PER_PICKUP,
        isCoveredBySubscription: false,
        remainingPickupsThisWeek: null,
        planName: null,
        perPickupPrice,
        subscriptionSavingsMessage: await this.buildSavingsMessage(perPickupPrice),
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
        subscriptionSavingsMessage: null,
      };
    }

    return {
      quotedPrice: perPickupPrice,
      pricingType: PricingType.PAY_PER_PICKUP,
      isCoveredBySubscription: false,
      remainingPickupsThisWeek: 0,
      planName: sub.plan?.name ?? null,
      perPickupPrice,
      subscriptionSavingsMessage: null,
    };
  }

  async consumePickup(userId: string): Promise<void> {
    const sub = await this.getActiveSubscription(userId);
    if (!sub) return;

    await this.resetWeeklyPickupsIfNeeded(sub);

    if (sub.remainingPickupsThisWeek > 0) {
      sub.remainingPickupsThisWeek -= 1;
      await this.subRepo.save(sub);
      this.logger.log(
        `Consumed 1 pickup for user ${userId}. Remaining: ${sub.remainingPickupsThisWeek}`,
      );
    }
  }

  async getActiveSubscription(userId: string): Promise<UserSubscription | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    }).then((sub) => {
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
      this.logger.log(`Reset weekly pickups for user ${sub.userId} to ${sub.remainingPickupsThisWeek}`);
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

  private async buildSavingsMessage(perPickupPrice: number): Promise<string | null> {
    const planPrice = await this.systemConfigService.getNumber(
      'pricing.subscription_price',
      3500,
    );
    const pickupsPerWeek = await this.systemConfigService.getNumber(
      'pricing.subscription_pickups_per_week',
      2,
    );
    const monthlyPickups = pickupsPerWeek * 4;
    const payAsYouGoCost = monthlyPickups * perPickupPrice;
    const savings = payAsYouGoCost - planPrice;
    if (savings <= 0) return null;
    return `Subscribe for ${planPrice.toLocaleString()} XAF/month — save up to ${savings.toLocaleString()} XAF/month`;
  }
}
