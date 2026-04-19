import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const apiPrefix = configService.get<string>('apiPrefix', 'api/v1');
  const corsOrigins = configService.get<string[]>('cors.origins', ['http://localhost:5173']);

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-ID',
      'X-Idempotency-Key',
    ],
    exposedHeaders: ['X-Correlation-ID'],
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
