import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Job } from '../jobs/entities/job.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { JobsModule } from '../jobs/jobs.module';
import { AssignmentModule } from '../assignment/assignment.module';
import { DisputesModule } from '../disputes/disputes.module';
import { FraudModule } from '../fraud/fraud.module';
import { EarningsModule } from '../earnings/earnings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Dispute, Earning, Rating, User]),
    UsersModule,
    JobsModule,
    AssignmentModule,
    DisputesModule,
    FraudModule,
    EarningsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
