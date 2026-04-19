import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { Public } from '../common/decorators/public.decorator';
import { REDIS_CLIENT } from '../redis/redis.provider';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ─── LIVENESS ──────────────────────────────────────────────────

  @Public()
  @Get()
  liveness() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: `${uptimeSeconds}s`,
    };
  }

  // ─── READINESS ─────────────────────────────────────────────────

  @Public()
  @Get('ready')
  async readiness() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const database = checks[0].status === 'fulfilled' ? 'up' : 'down';
    const redis = checks[1].status === 'fulfilled' ? 'up' : 'down';

    const allUp = database === 'up' && redis === 'up';

    if (database === 'down') {
      this.logger.warn('Readiness check: database is down');
    }
    if (redis === 'down') {
      this.logger.warn('Readiness check: redis is down');
    }

    return {
      status: allUp ? 'ready' : 'degraded',
      database,
      redis,
      timestamp: new Date().toISOString(),
    };
  }

  // ─── PRIVATE CHECKS ────────────────────────────────────────────

  private async checkDatabase(): Promise<void> {
    if (!this.dataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    await this.dataSource.query('SELECT 1');
  }

  private async checkRedis(): Promise<void> {
    const result = await this.redis.ping();
    if (result !== 'PONG') {
      throw new Error(`Redis ping returned: ${result}`);
    }
  }
}
