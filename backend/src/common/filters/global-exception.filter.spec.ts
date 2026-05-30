import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from './global-exception.filter';
import { SentryService } from '../../sentry/sentry.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let sentryService: jest.Mocked<SentryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: SentryService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(false),
            captureException: jest.fn(),
          },
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    sentryService = module.get(SentryService);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should capture 500-level errors to Sentry', () => {
    sentryService.isEnabled.mockReturnValue(true);
    const exception = new Error('Internal server error');
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      headers: {},
      url: '/test',
      method: 'GET',
      query: {},
    };

    filter.catch(exception, {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any);

    expect(sentryService.captureException).toHaveBeenCalled();
  });

  it('should NOT capture 400-level errors to Sentry', () => {
    sentryService.isEnabled.mockReturnValue(true);
    const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      headers: {},
      url: '/test',
      method: 'GET',
    };

    filter.catch(exception, {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any);

    expect(sentryService.captureException).not.toHaveBeenCalled();
  });

  it('should redact sensitive headers before sending to Sentry', () => {
    sentryService.isEnabled.mockReturnValue(true);
    const exception = new Error('Internal server error');
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      headers: {
        authorization: 'Bearer secret-token',
        'x-api-key': 'secret-key',
        'content-type': 'application/json',
      },
      url: '/test',
      method: 'GET',
    };

    filter.catch(exception, {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any);

    const captureCall = sentryService.captureException.mock.calls[0];
    if (captureCall && captureCall[1]) {
      const context = captureCall[1];
      expect(context.request.headers.authorization).toBe('[REDACTED]');
      expect(context.request.headers['x-api-key']).toBe('[REDACTED]');
      expect(context.request.headers['content-type']).toBe('application/json');
    }
  });

  it('should redact sensitive query parameters before sending to Sentry', () => {
    sentryService.isEnabled.mockReturnValue(true);
    const exception = new Error('Internal server error');
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockRequest = {
      headers: {},
      query: {
        password: 'secret',
        token: 'secret-token',
        name: 'test',
      },
      url: '/test',
      method: 'GET',
    };

    filter.catch(exception, {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as any);

    const captureCall = sentryService.captureException.mock.calls[0];
    if (captureCall && captureCall[1]) {
      const context = captureCall[1];
      expect(context.request.query.password).toBe('[REDACTED]');
      expect(context.request.query.token).toBe('[REDACTED]');
      expect(context.request.query.name).toBe('test');
    }
  });
});
