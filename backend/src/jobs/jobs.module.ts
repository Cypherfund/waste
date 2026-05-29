import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';
import { Proof } from './entities/proof.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { RatingsModule } from '../ratings/ratings.module';
import { EarningsModule } from '../earnings/earnings.module';
import { DisputesModule } from '../disputes/disputes.module';
import { FilesModule } from '../files/files.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PaymentsModule } from '../payments/payments.module';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Proof, UserSubscription]),
    forwardRef(() => RatingsModule),
    forwardRef(() => EarningsModule),
    forwardRef(() => DisputesModule),
    FilesModule,
    SubscriptionsModule,
    PaymentsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
