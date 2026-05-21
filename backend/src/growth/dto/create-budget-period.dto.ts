import { IsString, IsEnum, IsNumber, IsOptional, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetPeriodStatus } from '../entities';

export class CreateBudgetPeriodDto {
  @ApiProperty({ example: 'June 2026 Marketing Budget' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2026-06-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-30T23:59:59Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 2000000, description: 'Total budget in XAF' })
  @IsNumber()
  @Min(0)
  totalBudget: number;

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

  @ApiPropertyOptional({ default: BudgetPeriodStatus.ACTIVE })
  @IsOptional()
  @IsEnum(BudgetPeriodStatus)
  status?: BudgetPeriodStatus;
}
