import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobsModule } from '../jobs/jobs.module';
import { TimeslotsModule } from '../timeslots/timeslots.module';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Job]),
    JobsModule,
    TimeslotsModule,
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
