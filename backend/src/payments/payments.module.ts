import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentEventsService } from './payment-events.service';
import { PaymentSchedulerService } from './payment-scheduler.service';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { SystemConfigModule } from '../config/system-config.module';
import { Job } from '../jobs/entities/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, Job]),
    HttpModule,
    SystemConfigModule,
  ],
  providers: [PaymentService, PaymentEventsService, PaymentSchedulerService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentsModule {}
