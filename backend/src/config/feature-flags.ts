import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { SystemConfigService } from './system-config.service';

export const FEATURE_FLAGS = {
  COLLECTOR_SELF_REGISTRATION: 'feature.collector_self_registration',
  AUTO_ASSIGNMENT: 'feature.auto_assignment',
  FRAUD_DETECTION: 'feature.fraud_detection',
  SMS_NOTIFICATIONS: 'feature.sms_notifications',
  SURGE_PRICING: 'feature.surge_pricing',
  LOCATION_TRACKING: 'feature.location_tracking',
  OFFLINE_QUEUE: 'feature.offline_queue',
  PAYMENT_INTEGRATION: 'feature.payment_integration',
} as const;

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async isEnabled(flagKey: string, defaultValue = true): Promise<boolean> {
    try {
      const cached = await this.redis.get(`ff:${flagKey}`);
      if (cached !== null) {
        return cached === 'true';
      }
    } catch (error) {
      this.logger.warn(`Redis unavailable for feature flag ${flagKey}, falling back to database`);
    }

    // Fall back to database when Redis cache is empty or unavailable
    try {
      const dbValue = await this.systemConfigService.getBoolean(flagKey, defaultValue);
      // Cache the value in Redis for future reads
      try {
        await this.redis.set(`ff:${flagKey}`, String(dbValue), 'EX', 60);
      } catch (cacheError) {
        // Ignore cache errors - we still have the value from database
        this.logger.warn(`Failed to cache feature flag ${flagKey} in Redis`);
      }
      return dbValue;
    } catch (dbError) {
      this.logger.error(`Failed to read feature flag ${flagKey} from database`, dbError);
      return defaultValue;
    }
  }

  async setFlag(flagKey: string, enabled: boolean): Promise<void> {
    await this.redis.set(`ff:${flagKey}`, String(enabled), 'EX', 60);
  }

  async clearCache(flagKey?: string): Promise<{ cleared: number }> {
    try {
      if (flagKey) {
        await this.redis.del(`ff:${flagKey}`);
        return { cleared: 1 };
      } else {
        const keys = await this.redis.keys('ff:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return { cleared: keys.length };
      }
    } catch (error) {
      throw new Error(`Failed to clear feature flag cache: ${error.message}`);
    }
  }
}
