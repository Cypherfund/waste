import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({ example: 'Waste was not fully collected', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;
}
