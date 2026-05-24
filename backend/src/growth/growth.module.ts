import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import {
  Lead,
  MarketerProfile,
  CommissionScheme,
  CommissionTransaction,
  MarketerSchemeAssignment,
  MarketerPayoutRequest,
  MarketerNotification,
  MarketingBudgetPeriod,
  MarketingCampaign,
  CampaignMarketerAssignment,
  CampaignCommissionScheme,
  BudgetTransaction,
} from './entities';
import { User } from '../users/entities/user.entity';
import { Job } from '../jobs/entities/job.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import {
  LeadService,
  MarketerService,
  CommissionService,
  CommissionEngineService,
  MarketerPayoutService,
  SMSService,
  MarketerNotificationService,
  LeadCleanupService,
  BudgetService,
  CampaignService,
  CommissionReconciliationService,
} from './services';
import {
  GrowthAdminController,
  GrowthMobileController,
  WebhookController,
  BudgetAdminController,
  CampaignAdminController,
} from './controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      MarketerProfile,
      CommissionScheme,
      CommissionTransaction,
      MarketerSchemeAssignment,
      MarketerPayoutRequest,
      MarketerNotification,
      MarketingBudgetPeriod,
      MarketingCampaign,
      CampaignMarketerAssignment,
      CampaignCommissionScheme,
      BudgetTransaction,
      User,
      Job,
      UserSubscription,
    ]),
    ScheduleModule.forRoot(),
    NotificationsModule,
    SubscriptionsModule,
  ],
  controllers: [
    GrowthAdminController,
    GrowthMobileController,
    WebhookController,
    BudgetAdminController,
    CampaignAdminController,
  ],
  providers: [
    LeadService,
    MarketerService,
    CommissionService,
    CommissionEngineService,
    MarketerPayoutService,
    SMSService,
    MarketerNotificationService,
    LeadCleanupService,
    BudgetService,
    CampaignService,
    CommissionReconciliationService,
  ],
  exports: [
    LeadService,
    MarketerService,
    CommissionService,
    CommissionEngineService,
    MarketerPayoutService,
    SMSService,
    MarketerNotificationService,
    BudgetService,
    CampaignService,
  ],
})
export class GrowthModule {}
