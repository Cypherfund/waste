import { IsString, IsEnum, IsNumber, IsOptional, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetPeriodStatus } from '../entities';
import { PartialType } from '@nestjs/swagger';
import { CreateBudgetPeriodDto } from './create-budget-period.dto';

export class UpdateBudgetPeriodDto extends PartialType(CreateBudgetPeriodDto) {
  @ApiPropertyOptional({ description: 'Reason for budget adjustment' })
  @IsOptional()
  @IsString()
  adjustmentReason?: string;
}
