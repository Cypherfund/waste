import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelJobDto {
  @ApiPropertyOptional({ example: 'No longer needed' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
