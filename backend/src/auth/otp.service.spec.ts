import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { SystemConfigService } from '../config/system-config.service';
import { SmsProvider } from '../notifications/providers/sms.provider';

// ─── Mocks ──────────────────────────────────────────────────────

const createMockRedis = () => ({
  setex: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(0),
});

const createMockSmsProvider = (): Partial<SmsProvider> => ({
  send: jest.fn().mockResolvedValue({ success: true, messageId: 'sms-123' }),
});

const createMockConfigService = (overrides: Record<string, any> = {}) => ({
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, any> = {
      'OTP_DEV_MODE': 'false',
      'NODE_ENV': 'development',
      ...overrides,
    };
    return config[key] ?? defaultValue;
  }),
});

const createMockSystemConfigService = (devModeEnabled: boolean = false) => ({
  getBoolean: jest.fn().mockResolvedValue(devModeEnabled),
});

// ─── Tests ──────────────────────────────────────────────────────

describe('OtpService', () => {
  let service: OtpService;

  const createTestingModule = async (
    configOverrides: Record<string, any> = {},
    sysConfigDevMode: boolean = false,
  ) => {
    const mockRedis = createMockRedis();
    const mockSmsProvider = createMockSmsProvider();
    const mockConfigService = createMockConfigService(configOverrides);
    const mockSystemConfigService = createMockSystemConfigService(sysConfigDevMode);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: 'SMS_PROVIDER', useValue: mockSmsProvider },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SystemConfigService, useValue: mockSystemConfigService },
      ],
    }).compile();

    return {
      service: module.get<OtpService>(OtpService),
      mockRedis,
      mockSmsProvider,
      mockConfigService,
      mockSystemConfigService,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('should return OTP when OTP_DEV_MODE is true', async () => {
      // Arrange - OTP_DEV_MODE enabled
      const { service } = await createTestingModule(
        { 'OTP_DEV_MODE': 'true' },
        false, // system config not used in simple implementation
      );

      // Act
      const result = await service.sendOtp('+237612345678');

      // Assert - OTP should be returned when env var is set
      expect(result.success).toBe(true);
      expect(result.otp).toBeDefined();
      expect(result.otp?.length).toBe(6);
      expect(result.devMode).toBe(true);
    });

    it('should return success without OTP when OTP_DEV_MODE is false', async () => {
      // Arrange - OTP_DEV_MODE disabled
      const { service } = await createTestingModule(
        { 'OTP_DEV_MODE': 'false' },
        false,
      );

      // Act
      const result = await service.sendOtp('+237612345678');

      // Assert - OTP should NOT be returned when env var is false
      expect(result.success).toBe(true);
      expect(result.otp).toBeUndefined();
      expect(result.devMode).toBeUndefined();
    });

    it('should return success without OTP when OTP_DEV_MODE is not set', async () => {
      // Arrange - OTP_DEV_MODE not set (defaults to false)
      const { service } = await createTestingModule(
        {}, // no OTP_DEV_MODE set
        false,
      );

      // Act
      const result = await service.sendOtp('+237612345678');

      // Assert - OTP should NOT be returned when env var not set
      expect(result.success).toBe(true);
      expect(result.otp).toBeUndefined();
      expect(result.devMode).toBeUndefined();
    });


    it('should apply rate limiting when OTP was recently sent', async () => {
      // Arrange
      const { service, mockRedis } = await createTestingModule();
      mockRedis.ttl = jest.fn().mockResolvedValue(250); // Less than 60 seconds passed

      // Act
      const result = await service.sendOtp('+237612345678');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Please wait');
    });

    it('should store OTP in Redis with correct expiry', async () => {
      // Arrange
      const { service, mockRedis } = await createTestingModule();

      // Act
      await service.sendOtp('+237612345678');

      // Assert
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'otp:+237612345678',
        300, // 5 minutes
        expect.any(String),
      );
    });

    it('should normalize phone numbers correctly', async () => {
      // Arrange
      const { service, mockRedis } = await createTestingModule();

      // Act
      await service.sendOtp('612345678'); // Without country code

      // Assert - should normalize to +237612345678
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('+237612345678'),
        expect.any(Number),
        expect.any(String),
      );
    });
  });

  describe('verifyOtp', () => {
    it('should return success when OTP matches', async () => {
      // Arrange
      const { service, mockRedis } = await createTestingModule();
      mockRedis.get = jest.fn().mockResolvedValue('123456');

      // Act
      const result = await service.verifyOtp('+237612345678', '123456');

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Verification successful');
    });

    it('should return error when OTP does not match', async () => {
      // Arrange
      const { service, mockRedis } = await createTestingModule();
      mockRedis.get = jest.fn().mockResolvedValue('123456');

      // Act
      const result = await service.verifyOtp('+237612345678', '999999');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    it('should return error when OTP has expired', async () => {
      // Arrange
      const { service, mockRedis } = await createTestingModule();
      mockRedis.get = jest.fn().mockResolvedValue(null);

      // Act
      const result = await service.verifyOtp('+237612345678', '123456');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should delete OTP after successful verification', async () => {
      // Arrange
      const { service, mockRedis } = await createTestingModule();
      mockRedis.get = jest.fn().mockResolvedValue('123456');

      // Act
      await service.verifyOtp('+237612345678', '123456');

      // Assert
      expect(mockRedis.del).toHaveBeenCalledWith('otp:+237612345678');
    });
  });

  describe('getRecentOtp', () => {
    it('should return OTP if it exists', async () => {
      // Arrange
      const { service, mockRedis } = await createTestingModule();
      mockRedis.get = jest.fn().mockResolvedValue('123456');
      mockRedis.ttl = jest.fn().mockResolvedValue(3600);

      // Act
      const result = await service.getRecentOtp('+237612345678');

      // Assert
      expect(result.otp).toBe('123456');
      expect(result.phone).toBe('+237612345678');
      expect(result.ttl).toBe(3600);
    });

    it('should return null OTP if not found', async () => {
      // Arrange
      const { service, mockRedis } = await createTestingModule();
      mockRedis.get = jest.fn().mockResolvedValue(null);
      mockRedis.ttl = jest.fn().mockResolvedValue(0);

      // Act
      const result = await service.getRecentOtp('+237612345678');

      // Assert
      expect(result.otp).toBeNull();
    });
  });
});
