import { Global, Module } from '@nestjs/common';
import { BusinessLoggerService } from './services/business-logger.service';

@Global()
@Module({
  providers: [BusinessLoggerService],
  exports: [BusinessLoggerService],
})
export class CommonServicesModule {}
