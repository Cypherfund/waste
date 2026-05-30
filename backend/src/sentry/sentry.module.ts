import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { SentryService } from './sentry.service';

@Global()
@Module({
  providers: [SentryService],
  exports: [SentryService],
})
export class SentryModule {
  constructor(private readonly configService: ConfigService) {
    this.initializeSentry();
  }

  private initializeSentry(): void {
    const enabled = this.configService.get<boolean>('sentry.enabled', false);
    const dsn = this.configService.get<string>('sentry.dsn', '');
    const environment = this.configService.get<string>('sentry.environment', 'development');
    const release = this.configService.get<string>('sentry.release', '');
    const tracesSampleRate = this.configService.get<number>('sentry.tracesSampleRate', 0.1);

    if (!enabled || !dsn) {
      return;
    }

    Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate,
      beforeSend(event, hint) {
        // Redact sensitive data from the event
        if (event.request) {
          if (event.request.headers) {
            event.request.headers = this.redactHeaders(event.request.headers);
          }
          if (event.request.cookies) {
            event.request.cookies = this.redactCookies(event.request.cookies);
          }
        }
        if (event.user) {
          event.user = this.redactUser(event.user);
        }
        return event;
      },
    });
  }

  private redactHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const redacted = { ...headers };

    for (const header of Object.keys(redacted)) {
      if (sensitiveHeaders.includes(header.toLowerCase())) {
        redacted[header] = '[REDACTED]';
      }
    }

    return redacted;
  }

  private redactCookies(cookies: Record<string, string>): Record<string, string> {
    const sensitiveCookies = ['jwt', 'token', 'session', 'auth'];
    const redacted = { ...cookies };

    for (const cookie of Object.keys(redacted)) {
      if (sensitiveCookies.some((sensitive) => cookie.toLowerCase().includes(sensitive))) {
        redacted[cookie] = '[REDACTED]';
      }
    }

    return redacted;
  }

  private redactUser(user: Sentry.User): Sentry.User {
    const redacted = { ...user };

    if (redacted.email) {
      redacted.email = this.redactEmail(redacted.email);
    }

    return redacted;
  }

  private redactEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return `${username[0]}*@${domain}`;
    }
    return `${username.slice(0, 2)}***@${domain}`;
  }
}
