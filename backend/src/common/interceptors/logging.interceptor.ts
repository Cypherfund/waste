import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url, ip } = request;
    const correlationId = request.headers['x-correlation-id'] || '-';
    const userId = (request as any).user?.sub || 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse<Response>();
          const duration = Date.now() - startTime;
          this.logger.log(
            JSON.stringify({
              correlationId,
              method,
              url,
              statusCode: response.statusCode,
              userId,
              ip,
              duration: `${duration}ms`,
            }),
          );
        },
        error: (error: any) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            JSON.stringify({
              correlationId,
              method,
              url,
              statusCode: error.status || 500,
              userId,
              ip,
              duration: `${duration}ms`,
              error: error.message,
            }),
          );
        },
      }),
    );
  }
}
