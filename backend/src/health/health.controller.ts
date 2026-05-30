import { Controller, Get, Inject, Logger, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { Public } from '../common/decorators/public.decorator';
import { REDIS_CLIENT } from '../redis/redis.provider';
import { Request } from 'express';

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
  liveness(@Req() req: Request) {
    const requestId = req.headers['x-request-id'] as string || req.headers['x-correlation-id'] as string || '-';
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  @Public()
  @Get('liveness')
  livenessAlias(@Req() req: Request) {
    return this.liveness(req);
  }

  // ─── READINESS ─────────────────────────────────────────────────

  @Public()
  @Get('ready')
  async readiness(@Req() req: Request) {
    const requestId = req.headers['x-request-id'] as string || req.headers['x-correlation-id'] as string || '-';
    const checks = await Promise.allSettled([this.checkDatabase(), this.checkRedis()]);

    const database = checks[0].status === 'fulfilled' ? 'ok' : 'down';
    const redis = checks[1].status === 'fulfilled' ? 'ok' : 'down';

    const allUp = database === 'ok' && redis === 'ok';

    if (database === 'down') {
      this.logger.warn('Readiness check: database is down');
    }
    if (redis === 'down') {
      this.logger.warn('Readiness check: redis is down');
    }

    const response = {
      status: allUp ? 'ok' : 'degraded',
      database,
      redis,
      timestamp: new Date().toISOString(),
      requestId,
    };

    if (!allUp) {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return response;
  }

  @Public()
  @Get('readiness')
  readinessAlias(@Req() req: Request) {
    return this.readiness(req);
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
