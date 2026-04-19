import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = request.headers['x-correlation-id'] || '-';

    let status: number;
    let message: string | object;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? { message: exceptionResponse }
          : (exceptionResponse as object);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = { message: 'Internal server error' };

      this.logger.error(
        JSON.stringify({
          correlationId,
          path: request.url,
          method: request.method,
          error: exception instanceof Error ? exception.message : 'Unknown error',
          stack: exception instanceof Error ? exception.stack : undefined,
        }),
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
      ...(typeof message === 'object' ? message : { message }),
    });
  }
}
