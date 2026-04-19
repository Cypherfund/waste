import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import { REDIS_CLIENT } from '../redis/redis.provider';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: any;
  let redis: any;

  beforeEach(async () => {
    dataSource = {
      isInitialized: true,
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    redis = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: DataSource, useValue: dataSource },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  // ─── LIVENESS ───────────────────────────────────────────────────

  describe('GET /health', () => {
    it('should return ok status with timestamp and uptime', () => {
      const result = controller.liveness();

      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toMatch(/^\d+s$/);
    });
  });

  // ─── READINESS ──────────────────────────────────────────────────

  describe('GET /health/ready', () => {
    it('should return ready when all dependencies are up', async () => {
      const result = await controller.readiness();

      expect(result.status).toBe('ready');
      expect(result.database).toBe('up');
      expect(result.redis).toBe('up');
      expect(result.timestamp).toBeDefined();
    });

    it('should return degraded when database is down', async () => {
      dataSource.query.mockRejectedValue(new Error('Connection refused'));

      const result = await controller.readiness();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('down');
      expect(result.redis).toBe('up');
    });

    it('should return degraded when redis is down', async () => {
      redis.ping.mockRejectedValue(new Error('Connection refused'));

      const result = await controller.readiness();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('up');
      expect(result.redis).toBe('down');
    });

    it('should return degraded when both dependencies are down', async () => {
      dataSource.query.mockRejectedValue(new Error('DB down'));
      redis.ping.mockRejectedValue(new Error('Redis down'));

      const result = await controller.readiness();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('down');
      expect(result.redis).toBe('down');
    });

    it('should return degraded when database is not initialized', async () => {
      dataSource.isInitialized = false;

      const result = await controller.readiness();

      expect(result.status).toBe('degraded');
      expect(result.database).toBe('down');
    });

    it('should return degraded when redis ping returns unexpected value', async () => {
      redis.ping.mockResolvedValue('ERROR');

      const result = await controller.readiness();

      expect(result.status).toBe('degraded');
      expect(result.redis).toBe('down');
    });

    it('should not throw even when all checks fail', async () => {
      dataSource.query.mockRejectedValue(new Error('DB crash'));
      redis.ping.mockRejectedValue(new Error('Redis crash'));

      await expect(controller.readiness()).resolves.not.toThrow();
    });
  });
});
