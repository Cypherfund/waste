import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveCommissionDto {
  @ApiPropertyOptional({ example: 'Verified legitimate lead with successful booking' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
