import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '+237670000000' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(1)
  password: string;
}
