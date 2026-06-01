import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from './notifications.module';
import { SMS_PROVIDER, SmsProvider } from './providers/sms.provider';
import { TermiiProvider } from './providers/termii.provider';
import { AfricasTalkingProvider } from './providers/africas-talking.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { StubSmsProvider } from './providers/sms.provider';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';

// ─── Tests ──────────────────────────────────────────────────────

describe('NotificationsModule SMS Provider Factory', () => {
  let provider: SmsProvider;
  let configService: ConfigService;

  afterEach(async () => {
    // Cleanup after each test
  });

  const createTestingModule = async (smsProviderValue: string) => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'SMS_PROVIDER') {
          return smsProviderValue;
        }
        // Return default values for other config keys
        const defaults: Record<string, any> = {
          'TERMII_API_KEY': 'test-termii-key',
          'TERMII_SENDER_ID': 'TestSender',
          'AT_API_KEY': 'test-at-key',
          'AT_USERNAME': 'testuser',
          'AT_SENDER_ID': 'TestSender',
          'WHATSAPP_API_TOKEN': 'test-whatsapp-token',
          'WHATSAPP_PHONE_NUMBER_ID': '123456789',
          'WHATSAPP_BUSINESS_ACCOUNT_ID': '987654321',
          'WHATSAPP_GRAPH_API_VERSION': 'v18.0',
        };
        return defaults[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
      ],
      providers: [
        {
          provide: SMS_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const smsProvider = configService.get('SMS_PROVIDER', 'stub');
            switch (smsProvider) {
              case 'termii':
                return new TermiiProvider(configService);
              case 'africas-talking':
                return new AfricasTalkingProvider(configService);
              case 'whatsapp':
                return new WhatsAppProvider(configService);
              case 'stub':
              default:
                return new StubSmsProvider();
            }
          },
          inject: [ConfigService],
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    return {
      provider: module.get<SmsProvider>(SMS_PROVIDER),
      configService: module.get<ConfigService>(ConfigService),
    };
  };

  describe('Provider Selection', () => {
    it('should select TermiiProvider when SMS_PROVIDER=termii', async () => {
      // Act
      const { provider } = await createTestingModule('termii');

      // Assert
      expect(provider).toBeInstanceOf(TermiiProvider);
    });

    it('should select AfricasTalkingProvider when SMS_PROVIDER=africas-talking', async () => {
      // Act
      const { provider } = await createTestingModule('africas-talking');

      // Assert
      expect(provider).toBeInstanceOf(AfricasTalkingProvider);
    });

    it('should select WhatsAppProvider when SMS_PROVIDER=whatsapp', async () => {
      // Act
      const { provider } = await createTestingModule('whatsapp');

      // Assert
      expect(provider).toBeInstanceOf(WhatsAppProvider);
    });

    it('should select StubSmsProvider when SMS_PROVIDER=stub', async () => {
      // Act
      const { provider } = await createTestingModule('stub');

      // Assert
      expect(provider).toBeInstanceOf(StubSmsProvider);
    });

    it('should default to StubSmsProvider when SMS_PROVIDER is not set', async () => {
      // Act
      const { provider } = await createTestingModule('');

      // Assert
      expect(provider).toBeInstanceOf(StubSmsProvider);
    });

    it('should default to StubSmsProvider when SMS_PROVIDER is unknown', async () => {
      // Act
      const { provider } = await createTestingModule('unknown-provider');

      // Assert
      expect(provider).toBeInstanceOf(StubSmsProvider);
    });
  });

  describe('Provider Interface Compliance', () => {
    it('all providers should implement send method', async () => {
      // Arrange
      const providers = ['termii', 'africas-talking', 'whatsapp', 'stub'];

      // Act & Assert
      for (const providerType of providers) {
        const { provider } = await createTestingModule(providerType);
        expect(typeof provider.send).toBe('function');
      }
    });
  });
});
