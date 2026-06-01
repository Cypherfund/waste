import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsAppProvider } from './whatsapp.provider';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ─── Tests ──────────────────────────────────────────────────────

describe('WhatsAppProvider', () => {
  let provider: WhatsAppProvider;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          'WHATSAPP_API_TOKEN': 'test-token',
          'WHATSAPP_PHONE_NUMBER_ID': '123456789',
          'WHATSAPP_BUSINESS_ACCOUNT_ID': '987654321',
          'WHATSAPP_GRAPH_API_VERSION': 'v18.0',
          'WHATSAPP_OTP_TEMPLATE_NAME': 'otp_code',
          'WHATSAPP_OTP_TEMPLATE_LANGUAGE': 'en_US',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppProvider,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    provider = module.get<WhatsAppProvider>(WhatsAppProvider);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('send', () => {
    it('should send text message for non-OTP messages', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: {
          messages: [{ id: 'wamid.123' }],
        },
      });

      // Act
      const result = await provider.send({
        phone: '+237612345678',
        body: 'Hello, this is a test message',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.123');
      
      // Verify text message was sent (not template)
      const callArg = mockedAxios.post.mock.calls[0][1] as { type: string; text: { body: string } };
      expect(callArg.type).toBe('text');
      expect(callArg.text.body).toBe('Hello, this is a test message');
    });

    it('should send template message for OTP messages', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: {
          messages: [{ id: 'wamid.456' }],
        },
      });

      // Act
      const result = await provider.send({
        phone: '+237612345678',
        body: 'Your verification code is: 123456. Valid for 5 minutes.',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wamid.456');
      
      // Verify template message was sent
      const callArg = mockedAxios.post.mock.calls[0][1] as { 
        type: string; 
        template: { 
          name: string; 
          language: { code: string }; 
          components: { parameters: { text: string }[] }[] 
        } 
      };
      expect(callArg.type).toBe('template');
      expect(callArg.template.name).toBe('otp_code');
      expect(callArg.template.language.code).toBe('en_US');
      expect(callArg.template.components[0].parameters[0].text).toBe('123456');
    });

    it('should return error when phone number is missing', async () => {
      // Act
      const result = await provider.send({
        phone: '',
        body: 'Test message',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('No phone number provided');
    });

    it('should return error when WhatsApp is not configured', async () => {
      // Arrange - override config to return empty values
      const mockEmptyConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WhatsAppProvider,
          { provide: ConfigService, useValue: mockEmptyConfigService },
        ],
      }).compile();

      const unconfiguredProvider = module.get<WhatsAppProvider>(WhatsAppProvider);

      // Act
      const result = await unconfiguredProvider.send({
        phone: '+237612345678',
        body: 'Test message',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('WhatsApp not configured');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange - generic error without specific code
      mockedAxios.post.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Network timeout',
            },
          },
        },
      });

      // Act
      const result = await provider.send({
        phone: '+237612345678',
        body: 'Test message',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle "user not opted in" error specifically', async () => {
      // Arrange
      mockedAxios.post.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'User is not opted in',
              code: 131026,
            },
          },
        },
      });

      // Act
      const result = await provider.send({
        phone: '+237612345678',
        body: 'Test message',
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('24-hour session expired');
    });

    it('should use configurable API version in URL', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: { messages: [{ id: 'wamid.123' }] },
      });

      // Act
      await provider.send({
        phone: '+237612345678',
        body: 'Test message',
      });

      // Assert
      const url = mockedAxios.post.mock.calls[0][0];
      expect(url).toContain('/v18.0/');
    });

    it('should normalize phone numbers correctly', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: { messages: [{ id: 'wamid.123' }] },
      });

      // Act - phone with + and spaces
      await provider.send({
        phone: '+237 612 345 678',
        body: 'Test message',
      });

      // Assert - should be normalized to digits only
      const callArg = mockedAxios.post.mock.calls[0][1] as { to: string };
      expect(callArg.to).toBe('237612345678');
    });

    it('should add Cameroon country code if missing', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: { messages: [{ id: 'wamid.123' }] },
      });

      // Act - phone without country code
      await provider.send({
        phone: '612345678',
        body: 'Test message',
      });

      // Assert - should add 237 prefix
      const callArg = mockedAxios.post.mock.calls[0][1] as { to: string };
      expect(callArg.to).toBe('237612345678');
    });
  });

  describe('sendTemplate', () => {
    it('should send template with custom parameters', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({
        data: { messages: [{ id: 'wamid.template.123' }] },
      });

      // Act
      const result = await provider.sendTemplate(
        '+237612345678',
        'custom_template',
        'fr_FR',
        [{ type: 'body', parameters: [{ type: 'text', text: 'param1' }] }],
      );

      // Assert
      expect(result.success).toBe(true);
      
      const callArg = mockedAxios.post.mock.calls[0][1] as { 
        template: { name: string; language: { code: string } } 
      };
      expect(callArg.template.name).toBe('custom_template');
      expect(callArg.template.language.code).toBe('fr_FR');
    });
  });

  describe('checkPhoneNumber', () => {
    it('should return true when phone number is registered', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: {
          data: [
            {
              display_phone_number: '237612345678',
              id: '123456',
            },
          ],
        },
      });

      // Act
      const result = await provider.checkPhoneNumber('+237612345678');

      // Assert
      expect(result.exists).toBe(true);
      expect(result.waId).toBe('123456');
    });

    it('should return false when phone number is not registered', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({
        data: { data: [] },
      });

      // Act
      const result = await provider.checkPhoneNumber('+237612345678');

      // Assert
      expect(result.exists).toBe(false);
      expect(result.waId).toBeUndefined();
    });
  });
});
