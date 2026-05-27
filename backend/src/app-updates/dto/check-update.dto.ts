import { IsEnum, IsInt, IsString, Min } from 'class-validator';
import { AppPlatform, AppType } from '../entities/app-version.entity';

export class CheckUpdateDto {
  @IsEnum(AppPlatform)
  platform: AppPlatform;

  @IsEnum(AppType)
  appType: AppType;

  @IsString()
  versionName: string;

  @IsInt()
  @Min(1)
  buildNumber: number;
}
