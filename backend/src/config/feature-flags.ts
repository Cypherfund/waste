import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export const FEATURE_FLAGS = {
  COLLECTOR_SELF_REGISTRATION: 'feature.collector_self_registration',
  AUTO_ASSIGNMENT: 'feature.auto_assignment',
  FRAUD_DETECTION: 'feature.fraud_detection',
  SMS_NOTIFICATIONS: 'feature.sms_notifications',
  SURGE_PRICING: 'feature.surge_pricing',
  LOCATION_TRACKING: 'feature.location_tracking',
  OFFLINE_QUEUE: 'feature.offline_queue',
} as const;

@Injectable()
export class FeatureFlagService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async isEnabled(flagKey: string, defaultValue = true): Promise<boolean> {
    try {
      const cached = await this.redis.get(`ff:${flagKey}`);
      if (cached !== null) {
        return cached === 'true';
      }
    } catch {
      // Redis unavailable — fall back to default
    }

    return defaultValue;
  }

  async setFlag(flagKey: string, enabled: boolean): Promise<void> {
    await this.redis.set(`ff:${flagKey}`, String(enabled), 'EX', 60);
  }
}
