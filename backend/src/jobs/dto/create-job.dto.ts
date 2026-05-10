import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Matches,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ example: '2026-04-21', description: 'Scheduled date (YYYY-MM-DD)' })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({
    example: '08:00-10:00',
    description: 'Time window (HH:mm-HH:mm)',
  })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'scheduledTime must be in format HH:mm-HH:mm (e.g. 08:00-10:00)',
  })
  scheduledTime: string;

  @ApiProperty({ example: 'Rue de la Joie, Akwa, Douala' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  locationAddress: string;

  @ApiPropertyOptional({ example: 4.0435 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  locationLat?: number;

  @ApiPropertyOptional({ example: 9.6966 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  locationLng?: number;

  @ApiPropertyOptional({ example: 'Gate is blue, ring the bell' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: 'MOBILE_MONEY', description: 'Payment method (for manual payments)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'TX123456789', description: 'Payment reference/transaction ID (for manual verification)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentRef?: string;

  @ApiPropertyOptional({ example: '105', description: 'Payment provider code (e.g. 105 for MTN, 106 for Orange) for real payments' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  paymentCode?: string;

  @ApiPropertyOptional({ example: '650931636', description: 'Phone number for mobile money payment (Cameroon format, 9 digits starting with 6)' })
  @IsOptional()
  @IsString()
  @Matches(/^6[0-9]{8}$/, { message: 'paymentPhone must be a valid Cameroon mobile number (9 digits starting with 6)' })
  paymentPhone?: string;
}
