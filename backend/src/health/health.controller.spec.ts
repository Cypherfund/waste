import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.provider';
import { HttpException } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: jest.Mocked<DataSource>;
  let redis: jest.Mocked<Redis>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: {
            isInitialized: true,
            query: jest.fn().mockResolvedValue([{ 1: 1 }]),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            ping: jest.fn().mockResolvedValue('PONG'),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    dataSource = module.get(DataSource);
    redis = module.get(REDIS_CLIENT);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('liveness', () => {
    it('should return ok status with timestamp and requestId', () => {
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      };

      const result = controller.liveness(mockRequest as any);

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
    });

    it('should use X-Correlation-ID when X-Request-Id is not present', () => {
      const mockRequest = {
        headers: {
          'x-correlation-id': 'test-correlation-id',
        },
      };

      const result = controller.liveness(mockRequest as any);

      expect(result.requestId).toBe('test-correlation-id');
    });

    it('should use dash when neither header is present', () => {
      const mockRequest = {
        headers: {},
      };

      const result = controller.liveness(mockRequest as any);

      expect(result.requestId).toBe('-');
    });
  });

  describe('livenessAlias', () => {
    it('should return same result as liveness', () => {
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      };

      const result = controller.livenessAlias(mockRequest as any);

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
    });
  });

  describe('readiness', () => {
    it('should return ok status when all checks pass', async () => {
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      };

      const result = await controller.readiness(mockRequest as any);

      expect(result).toEqual({
        status: 'ok',
        database: 'ok',
        redis: 'ok',
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
    });

    it('should return degraded status when database fails', async () => {
      dataSource.query.mockRejectedValue(new Error('DB error'));
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      };

      await expect(controller.readiness(mockRequest as any)).rejects.toThrow(HttpException);
      
      try {
        await controller.readiness(mockRequest as any);
      } catch (error) {
        expect(error.status).toBe(503);
        expect(error.response).toEqual({
          status: 'degraded',
          database: 'down',
          redis: 'ok',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        });
      }
    });

    it('should return degraded status when redis fails', async () => {
      redis.ping.mockRejectedValue(new Error('Redis error'));
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      };

      await expect(controller.readiness(mockRequest as any)).rejects.toThrow(HttpException);
      
      try {
        await controller.readiness(mockRequest as any);
      } catch (error) {
        expect(error.status).toBe(503);
        expect(error.response).toEqual({
          status: 'degraded',
          database: 'ok',
          redis: 'down',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        });
      }
    });

    it('should include requestId in response', async () => {
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      };

      const result = await controller.readiness(mockRequest as any);

      expect(result.requestId).toBe('test-request-id');
    });

    it('should not expose sensitive information', async () => {
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      };

      const result = await controller.readiness(mockRequest as any);

      expect(result).not.toHaveProperty('databaseUrl');
      expect(result).not.toHaveProperty('redisHost');
      expect(result).not.toHaveProperty('error');
      expect(result).not.toHaveProperty('stackTrace');
    });
  });

  describe('readinessAlias', () => {
    it('should return same result as readiness', async () => {
      const mockRequest = {
        headers: {
          'x-request-id': 'test-request-id',
        },
      };

      const result = await controller.readinessAlias(mockRequest as any);

      expect(result).toEqual({
        status: 'ok',
        database: 'ok',
        redis: 'ok',
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
    });
  });
});
