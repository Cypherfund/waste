import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Earning } from './entities/earning.entity';
import { Job } from '../jobs/entities/job.entity';
import { EarningsService } from './earnings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Earning, Job]),
  ],
  providers: [EarningsService],
  exports: [EarningsService],
})
export class EarningsModule {}
