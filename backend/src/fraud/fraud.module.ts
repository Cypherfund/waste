import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudFlag } from './entities/fraud-flag.entity';
import { Proof } from '../jobs/entities/proof.entity';
import { Job } from '../jobs/entities/job.entity';
import { FraudService } from './fraud.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FraudFlag, Proof, Job]),
    UsersModule,
  ],
  providers: [FraudService],
  exports: [FraudService],
})
export class FraudModule {}
