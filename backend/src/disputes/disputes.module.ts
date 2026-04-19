import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dispute } from './entities/dispute.entity';
import { DisputesService } from './disputes.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispute]),
    forwardRef(() => JobsModule),
  ],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
