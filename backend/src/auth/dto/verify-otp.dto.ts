import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Phone number to verify',
    example: '+237612345678',
  })
  @IsString()
  @IsNotEmpty()
  @Length(8, 20)
  @Matches(/^\+?[\d\s-]+$/, {
    message: 'Phone number must contain only digits, spaces, hyphens, and optional + prefix',
  })
  phone: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'OTP must be exactly 6 digits',
  })
  code: string;
}
