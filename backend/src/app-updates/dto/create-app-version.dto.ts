import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MaxLength,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { AppPlatform, AppType, UpdateType } from '../entities/app-version.entity';

function MinBuildGte(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'minBuildGte',
      target: (object as any).constructor,
      propertyName,
      constraints: [property],
      options: {
        message: `latestBuild must be greater than or equal to minSupportedBuild`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return typeof value === 'number' &&
            typeof relatedValue === 'number' &&
            value >= relatedValue;
        },
      },
    });
  };
}

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
  @MinBuildGte('minSupportedBuild')
  latestBuild: number;

  @IsEnum(UpdateType)
  updateType: UpdateType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @ValidateIf((o) => o.storeUrl != null && o.storeUrl !== '')
  @IsUrl({ require_protocol: true })
  storeUrl?: string;

  @IsOptional()
  @IsString()
  releaseNotes?: string;
}
