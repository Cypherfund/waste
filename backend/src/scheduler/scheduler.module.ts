import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { Job } from '../jobs/entities/job.entity';
import { JobsModule } from '../jobs/jobs.module';
import { AssignmentModule } from '../assignment/assignment.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Job]),
    JobsModule,
    AssignmentModule,
    FilesModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
