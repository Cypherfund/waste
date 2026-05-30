import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryService } from '../../sentry/sentry.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly sentryService: SentryService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = request.headers['x-correlation-id'] as string || request.headers['x-request-id'] as string || '-';
    const requestId = request.headers['x-request-id'] as string || correlationId;

    let status: number;
    let message: string | object;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? { message: exceptionResponse }
          : (exceptionResponse as object);

      // Only capture 500-level errors and unexpected exceptions to Sentry
      if (status >= 500) {
        this.captureToSentry(exception, request, requestId);
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = { message: 'Internal server error' };

      this.logger.error(
        JSON.stringify({
          requestId,
          path: request.url,
          method: request.method,
          error: exception instanceof Error ? exception.message : 'Unknown error',
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      );

      // Capture unexpected exceptions to Sentry
      this.captureToSentry(exception, request, requestId);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      ...(typeof message === 'object' ? message : { message }),
    });
  }

  private captureToSentry(exception: unknown, request: Request, requestId: string): void {
    if (!this.sentryService.isEnabled()) {
      return;
    }

    const user = (request as any).user;
    const context = {
      request: {
        path: request.url,
        method: request.method,
        headers: this.redactHeaders(request.headers),
        query: this.redactQuery(request.query),
      },
      user: user ? {
        id: user.userId || user.sub,
        role: user.role,
      } : undefined,
      requestId,
    };

    this.sentryService.captureException(exception, context);
  }

  private redactHeaders(headers: any): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'password', 'token', 'secret'];
    const redacted: Record<string, string> = {};

    for (const key of Object.keys(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = headers[key];
      }
    }

    return redacted;
  }

  private redactQuery(query: any): Record<string, any> {
    if (!query) {
      return {};
    }
    const sensitiveParams = ['password', 'token', 'secret', 'api_key', 'apikey'];
    const redacted: Record<string, any> = {};

    for (const key of Object.keys(query)) {
      if (sensitiveParams.includes(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = query[key];
      }
    }

    return redacted;
  }
}
