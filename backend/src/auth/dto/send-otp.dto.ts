import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    description: 'Phone number to send OTP to',
    example: '+237612345678',
  })
  @IsString()
  @IsNotEmpty()
  @Length(8, 20)
  @Matches(/^\+?[\d\s-]+$/, {
    message: 'Phone number must contain only digits, spaces, hyphens, and optional + prefix',
  })
  phone: string;
}
