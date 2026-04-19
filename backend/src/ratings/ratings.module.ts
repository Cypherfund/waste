import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rating } from './entities/rating.entity';
import { User } from '../users/entities/user.entity';
import { RatingsService } from './ratings.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rating, User]),
    forwardRef(() => JobsModule),
  ],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
