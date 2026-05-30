import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('sentry.enabled', false);
  }

  /**
   * Capture an exception with optional context
   */
  captureException(exception: unknown, context?: Record<string, any>): void {
    if (!this.enabled) {
      return;
    }

    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach((key) => {
          scope.setContext(key, context[key]);
        });
      }
      Sentry.captureException(exception);
    });

    this.logger.error(`Exception captured by Sentry: ${exception instanceof Error ? exception.message : 'Unknown error'}`);
  }

  /**
   * Capture a message with optional level
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>): void {
    if (!this.enabled) {
      return;
    }

    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach((key) => {
          scope.setContext(key, context[key]);
        });
      }
      Sentry.captureMessage(message, level);
    });

    this.logger.log(`Message captured by Sentry [${level}]: ${message}`);
  }

  /**
   * Add a breadcrumb for tracking events
   */
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.enabled) {
      return;
    }

    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string; role?: string }): void {
    if (!this.enabled) {
      return;
    }

    Sentry.setUser(user);
  }

  /**
   * Set custom context
   */
  setContext(key: string, context: Record<string, any>): void {
    if (!this.enabled) {
      return;
    }

    Sentry.setContext(key, context);
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    if (!this.enabled) {
      return;
    }

    Sentry.setUser(null);
  }

  /**
   * Check if Sentry is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
