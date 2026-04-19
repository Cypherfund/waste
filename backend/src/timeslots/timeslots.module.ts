import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectorAvailability } from './entities/collector-availability.entity';
import { TimeslotsService } from './timeslots.service';
import { TimeslotsController } from './timeslots.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CollectorAvailability])],
  controllers: [TimeslotsController],
  providers: [TimeslotsService],
  exports: [TimeslotsService],
})
export class TimeslotsModule {}
