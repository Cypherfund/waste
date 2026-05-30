import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SentryService } from './sentry.service';

describe('SentryService', () => {
  let service: SentryService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              if (key === 'sentry.enabled') return false;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SentryService>(SentryService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be disabled by default', () => {
    configService.get.mockReturnValue(false);
    expect(service.isEnabled()).toBe(false);
  });

  it('should not capture exceptions when disabled', () => {
    configService.get.mockReturnValue(false);
    const exception = new Error('Test error');
    
    service.captureException(exception);
    
    // Should not throw and should silently return
    expect(service.isEnabled()).toBe(false);
  });

  it('should not capture messages when disabled', () => {
    configService.get.mockReturnValue(false);
    
    service.captureMessage('Test message', 'info');
    
    // Should not throw and should silently return
    expect(service.isEnabled()).toBe(false);
  });

  it('should not add breadcrumbs when disabled', () => {
    configService.get.mockReturnValue(false);
    
    service.addBreadcrumb({
      category: 'test',
      message: 'Test breadcrumb',
      level: 'info',
    });
    
    // Should not throw and should silently return
    expect(service.isEnabled()).toBe(false);
  });

  it('should not set user context when disabled', () => {
    configService.get.mockReturnValue(false);
    
    service.setUser({ id: '123', email: 'test@example.com' });
    
    // Should not throw and should silently return
    expect(service.isEnabled()).toBe(false);
  });

  it('should not set custom context when disabled', () => {
    configService.get.mockReturnValue(false);
    
    service.setContext('test', { key: 'value' });
    
    // Should not throw and should silently return
    expect(service.isEnabled()).toBe(false);
  });

  it('should not clear user when disabled', () => {
    configService.get.mockReturnValue(false);
    
    service.clearUser();
    
    // Should not throw and should silently return
    expect(service.isEnabled()).toBe(false);
  });
});
