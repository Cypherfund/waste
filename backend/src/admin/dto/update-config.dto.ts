import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConfigDto {
  @ApiProperty({ example: 'assignment.max_radius_km' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({ example: '15' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  value: string;
}
