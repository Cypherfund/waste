import { Test, TestingModule } from '@nestjs/testing';
import { BusinessLoggerService, BusinessEventType } from './business-logger.service';

describe('BusinessLoggerService', () => {
  let service: BusinessLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessLoggerService],
    }).compile();

    service = module.get<BusinessLoggerService>(BusinessLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extract request context correctly', () => {
    const mockRequest = {
      headers: {
        'x-request-id': 'req-123',
        'x-correlation-id': 'corr-456',
      },
      user: {
        userId: 'user-789',
        role: 'COLLECTOR',
      },
    };

    const context = service.extractRequestContext(mockRequest as any);

    expect(context.requestId).toBe('req-123');
    expect(context.userId).toBe('user-789');
    expect(context.role).toBe('COLLECTOR');
  });

  it('should use X-Correlation-ID when X-Request-Id is not present', () => {
    const mockRequest = {
      headers: {
        'x-correlation-id': 'corr-456',
      },
      user: {
        userId: 'user-789',
        role: 'COLLECTOR',
      },
    };

    const context = service.extractRequestContext(mockRequest as any);

    expect(context.requestId).toBe('corr-456');
  });

  it('should handle missing user in request context', () => {
    const mockRequest = {
      headers: {
        'x-request-id': 'req-123',
      },
    };

    const context = service.extractRequestContext(mockRequest as any);

    expect(context.requestId).toBe('req-123');
    expect(context.userId).toBeUndefined();
    expect(context.role).toBeUndefined();
  });
});
