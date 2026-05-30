import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus } from '../entities';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Bonabéri Household Launch' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'uuid-of-budget-period' })
  @IsUUID()
  budgetPeriodId: string;

  @ApiPropertyOptional({ example: 'Onboard households in Bonabéri area' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Bonabéri' })
  @IsOptional()
  @IsString()
  territory?: string;

  @ApiProperty({ example: '2026-06-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-30T23:59:59Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 500000, description: 'Campaign budget in XAF' })
  @IsNumber()
  @Min(0)
  budgetAmount: number;

  @ApiPropertyOptional({ default: 'XAF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: 80, description: 'Alert threshold percentage' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  alertThresholdPct?: number;

  @ApiPropertyOptional({ default: CampaignStatus.DRAFT })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
