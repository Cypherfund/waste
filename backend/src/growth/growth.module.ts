import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  Lead,
  MarketerProfile,
  CommissionScheme,
  CommissionTransaction,
  MarketerSchemeAssignment,
  MarketerPayoutRequest,
  MarketerNotification,
} from './entities';
import { User } from '../users/entities/user.entity';
import {
  LeadService,
  MarketerService,
  CommissionService,
  CommissionEngineService,
  MarketerPayoutService,
  SMSService,
  MarketerNotificationService,
  LeadCleanupService,
} from './services';
import {
  GrowthAdminController,
  GrowthMobileController,
  WebhookController,
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
      User,
    ]),
    ScheduleModule.forRoot(),
    NotificationsModule,
  ],
  controllers: [
    GrowthAdminController,
    GrowthMobileController,
    WebhookController,
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
  ],
  exports: [
    LeadService,
    MarketerService,
    CommissionService,
    CommissionEngineService,
    MarketerPayoutService,
    SMSService,
    MarketerNotificationService,
  ],
})
export class GrowthModule {}
