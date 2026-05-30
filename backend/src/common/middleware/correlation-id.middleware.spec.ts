import { Test, TestingModule } from '@nestjs/testing';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorrelationIdMiddleware],
    }).compile();

    middleware = module.get<CorrelationIdMiddleware>(CorrelationIdMiddleware);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should use X-Request-Id header when present', () => {
    const mockRequest = {
      headers: {
        'x-request-id': 'test-request-id',
        'x-correlation-id': 'test-correlation-id',
      },
    };
    const mockResponse = {
      setHeader: jest.fn(),
    };
    const mockNext = jest.fn();

    middleware.use(mockRequest as any, mockResponse as any, mockNext);

    expect(mockRequest.headers['x-request-id']).toBe('test-request-id');
    expect(mockRequest.headers['x-correlation-id']).toBe('test-request-id');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'test-request-id');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-request-id');
  });

  it('should use X-Correlation-ID header when X-Request-Id is not present', () => {
    const mockRequest = {
      headers: {
        'x-correlation-id': 'test-correlation-id',
      } as any,
    };
    const mockResponse = {
      setHeader: jest.fn(),
    };
    const mockNext = jest.fn();

    middleware.use(mockRequest as any, mockResponse as any, mockNext);

    expect(mockRequest.headers['x-request-id']).toBe('test-correlation-id');
    expect(mockRequest.headers['x-correlation-id']).toBe('test-correlation-id');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'test-correlation-id');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-correlation-id');
  });

  it('should generate UUID v4 when neither header is present', () => {
    const mockRequest = {
      headers: {} as any,
    };
    const mockResponse = {
      setHeader: jest.fn(),
    };
    const mockNext = jest.fn();

    middleware.use(mockRequest as any, mockResponse as any, mockNext);

    const requestId = mockRequest.headers['x-request-id'];
    expect(requestId).toBeDefined();
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(mockRequest.headers['x-correlation-id']).toBe(requestId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', requestId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', requestId);
  });

  it('should return both headers in response for backward compatibility', () => {
    const mockRequest = {
      headers: {
        'x-request-id': 'test-request-id',
      },
    };
    const mockResponse = {
      setHeader: jest.fn(),
    };
    const mockNext = jest.fn();

    middleware.use(mockRequest as any, mockResponse as any, mockNext);

    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'test-request-id');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'test-request-id');
  });
});
