import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Redis => {
    const logger = new Logger('RedisModule');

    const redis = new Redis({
      host: configService.get<string>('redis.host'),
      port: configService.get<number>('redis.port'),
      password: configService.get<string>('redis.password') || undefined,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });

    redis.on('connect', () => {
      logger.log('Redis connected');
    });

    redis.on('error', (error: Error) => {
      logger.error(`Redis error: ${error.message}`);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    return redis;
  },
};
