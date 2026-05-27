import { IsEnum, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { AppPlatform, AppType, UpdateType } from '../entities/app-version.entity';

export class CreateAppVersionDto {
  @IsEnum(AppPlatform)
  platform: AppPlatform;

  @IsEnum(AppType)
  appType: AppType;

  @IsString()
  @MaxLength(20)
  versionName: string;

  @IsInt()
  @Min(1)
  buildNumber: number;

  @IsInt()
  @Min(1)
  minSupportedBuild: number;

  @IsInt()
  @Min(1)
  latestBuild: number;

  @IsEnum(UpdateType)
  updateType: UpdateType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  storeUrl?: string;

  @IsOptional()
  @IsString()
  releaseNotes?: string;
}
