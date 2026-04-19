import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectJobDto {
  @ApiPropertyOptional({ example: 'Too far from my location' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
