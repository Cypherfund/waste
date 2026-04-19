import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from './entities/system-config.entity';
import { SystemConfigService } from './system-config.service';
import { FeatureFlagService } from './feature-flags';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  providers: [SystemConfigService, FeatureFlagService],
  exports: [SystemConfigService, FeatureFlagService],
})
export class SystemConfigModule {}
