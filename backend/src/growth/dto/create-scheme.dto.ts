import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionType, CommissionValueType } from '../entities';

export class CreateSchemeDto {
  @ApiProperty({ example: 'Special Promotion' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: CommissionType })
  @IsEnum(CommissionType)
  type: CommissionType;

  @ApiPropertyOptional({ example: 'Holiday promotion for new households' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CommissionValueType })
  @IsEnum(CommissionValueType)
  commissionType: CommissionValueType;

  @ApiProperty({ example: 500, description: 'Fixed amount or percentage value' })
  @IsNumber()
  @Min(0)
  @Max(1000000)
  amount: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAutoAssigned?: boolean;
}
