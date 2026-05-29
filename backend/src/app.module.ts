import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { EventsModule } from './events/events.module';
import { SystemConfigModule } from './config/system-config.module';
import { TimeslotsModule } from './timeslots/timeslots.module';
import { AssignmentModule } from './assignment/assignment.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RatingsModule } from './ratings/ratings.module';
import { EarningsModule } from './earnings/earnings.module';
import { DisputesModule } from './disputes/disputes.module';
import { FraudModule } from './fraud/fraud.module';
import { WebSocketModule } from './websocket/websocket.module';
import { AdminModule } from './admin/admin.module';
import { FilesModule } from './files/files.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HealthModule } from './health/health.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentsModule } from './payments/payments.module';
import { CountriesModule } from './countries/countries.module';
import { GrowthModule } from './growth/growth.module';
import { AppUpdatesModule } from './app-updates/app-updates.module';
import { AppVersionMiddleware } from './app-updates/middleware/app-version.middleware';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

// Load .env.test file if in test environment
if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: '.env.test' });
}

@Module({
  imports: [
    // Configuration — loaded first, globally available
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),

    // Infrastructure
    DatabaseModule,
    RedisModule,

    // Event bus (global)
    EventsModule,

    // System config (global)
    SystemConfigModule,

    // Feature modules
    AuthModule,
    UsersModule,
    JobsModule,
    TimeslotsModule,
    AssignmentModule,
    NotificationsModule,
    RatingsModule,
    EarningsModule,
    DisputesModule,
    FraudModule,
    WebSocketModule,
    AdminModule,
    FilesModule,
    SchedulerModule,
    HealthModule,
    SubscriptionsModule,
    WalletModule,
    PaymentsModule,
    CountriesModule,
    GrowthModule,
    AppUpdatesModule,
  ],
  providers: [
    // Global JWT auth guard — all routes require auth unless @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global roles guard — checked after JWT auth
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global timeout interceptor (30s)
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new TimeoutInterceptor(30000),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    // Enforce minimum supported build on critical routes
    consumer
      .apply(AppVersionMiddleware)
      .forRoutes(
        'jobs',
        'wallet',
        'subscriptions',
        'payments',
      );
  }
}
