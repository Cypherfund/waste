import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ReconciliationController } from './controllers/reconciliation.controller';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { ReconciliationService } from './services/reconciliation.service';
import { AdminAuditService } from './services/admin-audit.service';
import { Job } from '../jobs/entities/job.entity';
import { Proof } from '../jobs/entities/proof.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { User } from '../users/entities/user.entity';
import { UserAddress } from '../users/entities/user-address.entity';
import { SystemCleanupLog } from './entities/system-cleanup-log.entity';
import { ReconciliationSummary } from './entities/reconciliation-summary.entity';
import { ReconciliationRun } from './entities/reconciliation-run.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { SystemCleanupService } from './services/system-cleanup.service';
import { ReconciliationSchedulerService } from './services/reconciliation-scheduler.service';
import { UsersModule } from '../users/users.module';
import { JobsModule } from '../jobs/jobs.module';
import { AssignmentModule } from '../assignment/assignment.module';
import { DisputesModule } from '../disputes/disputes.module';
import { FraudModule } from '../fraud/fraud.module';
import { FraudFlag } from '../fraud/entities/fraud-flag.entity';
import { EarningsModule } from '../earnings/earnings.module';
import { WalletModule } from '../wallet/wallet.module';
import { PayoutRequest } from '../wallet/entities/payout-request.entity';
import { CollectorFloatLedger } from '../wallet/entities/collector-float-ledger.entity';
import { WalletLedger } from '../wallet/entities/wallet-ledger.entity';
import { UserPaymentMethod } from '../wallet/entities/user-payment-method.entity';
import { CountriesModule } from '../countries/countries.module';
import { PaymentsModule } from '../payments/payments.module';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { GrowthModule } from '../growth/growth.module';
import { Lead } from '../growth/entities/lead.entity';
import { MarketerProfile } from '../growth/entities/marketer-profile.entity';
import { CommissionTransaction } from '../growth/entities/commission-transaction.entity';
import { MarketerPayoutRequest } from '../growth/entities/marketer-payout-request.entity';
import { MarketerNotification } from '../growth/entities/marketer-notification.entity';
import { MarketingCampaign } from '../growth/entities/marketing-campaign.entity';
import { MarketingBudgetPeriod } from '../growth/entities/marketing-budget-period.entity';
import { BudgetTransaction } from '../growth/entities/budget-transaction.entity';
import { CampaignMarketerAssignment } from '../growth/entities/campaign-marketer-assignment.entity';
import { CampaignCommissionScheme } from '../growth/entities/campaign-commission-scheme.entity';
import { MarketerSchemeAssignment } from '../growth/entities/marketer-scheme-assignment.entity';
import { FilesModule } from '../files/files.module';
import { FileRecord } from '../files/entities/file.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { Notification } from '../notifications/entities/notification.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import { LocationUpdate } from '../websocket/entities/location-update.entity';
import { CollectorAvailability } from '../timeslots/entities/collector-availability.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Job,
      Proof,
      Dispute,
      Earning,
      Rating,
      User,
      UserAddress,
      SystemCleanupLog,
      ReconciliationSummary,
      ReconciliationRun,
      AdminAuditLog,
      FraudFlag,
      PayoutRequest,
      CollectorFloatLedger,
      WalletLedger,
      UserPaymentMethod,
      PaymentTransaction,
      Lead,
      MarketerProfile,
      CommissionTransaction,
      MarketerPayoutRequest,
      MarketerNotification,
      MarketingCampaign,
      MarketingBudgetPeriod,
      BudgetTransaction,
      CampaignMarketerAssignment,
      CampaignCommissionScheme,
      MarketerSchemeAssignment,
      FileRecord,
      Notification,
      UserSubscription,
      LocationUpdate,
      CollectorAvailability,
    ]),
    UsersModule,
    JobsModule,
    AssignmentModule,
    DisputesModule,
    FraudModule,
    EarningsModule,
    WalletModule,
    CountriesModule,
    PaymentsModule,
    GrowthModule,
    FilesModule,
    NotificationsModule,
    SubscriptionsModule,
  ],
  controllers: [AdminController, ReconciliationController, AdminAuditController],
  providers: [AdminService, SystemCleanupService, ReconciliationService, ReconciliationSchedulerService, AdminAuditService],
})
export class AdminModule {}
