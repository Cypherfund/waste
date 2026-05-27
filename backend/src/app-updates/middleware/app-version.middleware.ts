import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppUpdatesService } from '../app-updates.service';
import { AppPlatform, AppType } from '../entities/app-version.entity';

const PLATFORM_MAP: Record<string, AppPlatform> = {
  android: AppPlatform.ANDROID,
  ios: AppPlatform.IOS,
};

const APP_TYPE_MAP: Record<string, AppType> = {
  household: AppType.HOUSEHOLD,
  collector: AppType.COLLECTOR,
  marketer: AppType.MARKETER,
};

@Injectable()
export class AppVersionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AppVersionMiddleware.name);

  constructor(private readonly appUpdatesService: AppUpdatesService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const buildHeader = req.headers['x-app-build'];
    const platformHeader = (req.headers['x-app-platform'] as string)?.toLowerCase();
    const appTypeHeader = (req.headers['x-app-type'] as string)?.toLowerCase();

    // Skip if headers not present (web dashboard, Postman, etc.)
    if (!buildHeader || !platformHeader) {
      return next();
    }

    const buildNumber = parseInt(String(buildHeader), 10);
    if (isNaN(buildNumber)) return next();

    const platform = PLATFORM_MAP[platformHeader] ?? AppPlatform.ALL;
    const appType = APP_TYPE_MAP[appTypeHeader ?? ''] ?? AppType.ALL;

    try {
      const supported = await this.appUpdatesService.isVersionSupported(
        platform,
        appType,
        buildNumber,
      );

      if (!supported) {
        throw new HttpException(
          {
            statusCode: 426,
            error: 'APP_UPDATE_REQUIRED',
            message: 'Please update your app to continue.',
          },
          426,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // DB not yet set up or query fails — allow request through
      this.logger.warn(`App version check failed: ${err.message}`);
    }

    next();
  }
}
