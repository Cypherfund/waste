import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PricingService } from './pricing.service';
import { Job } from '../jobs/entities/job.entity';
import { SystemConfigModule } from '../config/system-config.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlan, UserSubscription, Job]),
    SystemConfigModule,
    PaymentsModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PricingService],
  exports: [SubscriptionsService, PricingService],
})
export class SubscriptionsModule {}
