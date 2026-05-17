import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectCommissionDto {
  @ApiProperty({ example: 'Suspected fraudulent account', description: 'Reason for rejection' })
  @IsString()
  @MaxLength(500)
  reason: string;
}
