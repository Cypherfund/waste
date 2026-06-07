import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagService } from './feature-flags';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let redis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    keys: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        {
          provide: 'REDIS_CLIENT',
          useValue: redis,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isEnabled', () => {
    it('should return cached value when available', async () => {
      redis.get.mockResolvedValue('true');

      const result = await service.isEnabled('test.flag', false);

      expect(redis.get).toHaveBeenCalledWith('ff:test.flag');
      expect(result).toBe(true);
    });

    it('should return cached false value', async () => {
      redis.get.mockResolvedValue('false');

      const result = await service.isEnabled('test.flag', true);

      expect(result).toBe(false);
    });

    it('should return default value when cache miss', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.isEnabled('test.flag', true);

      expect(result).toBe(true);
    });

    it('should return default value when Redis error', async () => {
      redis.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.isEnabled('test.flag', false);

      expect(result).toBe(false);
    });
  });

  describe('setFlag', () => {
    it('should set flag in Redis with TTL', async () => {
      await service.setFlag('test.flag', true);

      expect(redis.set).toHaveBeenCalledWith('ff:test.flag', 'true', 'EX', 60);
    });

    it('should set flag to false', async () => {
      await service.setFlag('test.flag', false);

      expect(redis.set).toHaveBeenCalledWith('ff:test.flag', 'false', 'EX', 60);
    });
  });

  describe('clearCache', () => {
    it('should clear specific flag cache when flagKey is provided', async () => {
      redis.del.mockResolvedValue(1);

      const result = await service.clearCache('test.flag');

      expect(redis.del).toHaveBeenCalledWith('ff:test.flag');
      expect(result).toEqual({ cleared: 1 });
    });

    it('should clear all feature flag caches when no flagKey provided', async () => {
      redis.keys.mockResolvedValue(['ff:flag1', 'ff:flag2', 'ff:flag3']);
      redis.del.mockResolvedValue(3);

      const result = await service.clearCache();

      expect(redis.keys).toHaveBeenCalledWith('ff:*');
      expect(redis.del).toHaveBeenCalledWith('ff:flag1', 'ff:flag2', 'ff:flag3');
      expect(result).toEqual({ cleared: 3 });
    });

    it('should return 0 cleared when no keys found', async () => {
      redis.keys.mockResolvedValue([]);

      const result = await service.clearCache();

      expect(redis.keys).toHaveBeenCalledWith('ff:*');
      expect(redis.del).not.toHaveBeenCalled();
      expect(result).toEqual({ cleared: 0 });
    });

    it('should not call del when keys is empty array', async () => {
      redis.keys.mockResolvedValue([]);

      await service.clearCache();

      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should throw error when Redis operation fails', async () => {
      redis.del.mockRejectedValue(new Error('Redis connection error'));

      await expect(service.clearCache('test.flag')).rejects.toThrow(
        'Failed to clear feature flag cache: Redis connection error',
      );
    });

    it('should throw error when keys operation fails', async () => {
      redis.keys.mockRejectedValue(new Error('Redis connection error'));

      await expect(service.clearCache()).rejects.toThrow(
        'Failed to clear feature flag cache: Redis connection error',
      );
    });
  });
});
