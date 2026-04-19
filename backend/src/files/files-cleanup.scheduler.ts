import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SystemConfigService } from '../config/system-config.service';
import { FilesService } from './files.service';

@Injectable()
export class FilesCleanupScheduler {
  private readonly logger = new Logger(FilesCleanupScheduler.name);

  constructor(
    private readonly filesService: FilesService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup(): Promise<void> {
    const thresholdHours = await this.systemConfigService.getNumber(
      'files.cleanup_hours',
      24,
    );

    this.logger.log(`Starting file cleanup (threshold: ${thresholdHours}h)`);

    try {
      const deleted = await this.filesService.cleanupUnused(thresholdHours);
      this.logger.log(`File cleanup finished: ${deleted} files removed`);
    } catch (err) {
      this.logger.error(`File cleanup failed: ${err.message}`);
    }
  }
}
