import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { join } from 'path';
import * as Sentry from '@sentry/node';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Initialize Sentry before NestJS app creation
  const sentryEnabled = process.env.SENTRY_ENABLED === 'true';
  const sentryDsn = process.env.SENTRY_DSN || '';

  if (sentryEnabled && sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || '',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    });
    logger.log('Sentry initialized');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const apiPrefix = configService.get<string>('apiPrefix', 'api/v1');
  const corsOrigins = configService.get<string[]>('cors.origins', ['http://localhost:5173']);
  const storageType = configService.get<string>('STORAGE_TYPE', 'local');
  const uploadsDir = configService.get<string>('UPLOADS_DIR', './uploads');

  logger.log(`CORS Origins: ${JSON.stringify(corsOrigins)}`);
  logger.log(`Storage Type: ${storageType}`);

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Serve static files if using local storage
  if (storageType === 'local') {
    app.useStaticAssets(join(__dirname, '..', uploadsDir), {
      prefix: '/uploads/',
    });
    logger.log(`Serving static files from: ${uploadsDir}`);
  }

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Correlation-ID', 'X-Idempotency-Key'],
    exposedHeaders: ['X-Request-Id', 'X-Correlation-ID'],
    credentials: true,
    maxAge: 3600,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger (non-production only)
  if (configService.get<string>('nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Waste Management API')
      .setDescription('Waste Management Platform — Douala, Cameroon')
      .setVersion('1.0')
      .addBearerAuth()
      .addServer(`http://localhost:${port}`)
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
    logger.log(`Swagger docs available at http://localhost:${port}/docs`);
  }

  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Environment: ${configService.get<string>('nodeEnv')}`);
}

bootstrap();
