import { IsEnum, IsNumber, IsString, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PayoutMethod } from '../entities';

export class CreatePayoutRequestDto {
  @ApiProperty({ example: 50000, description: 'Amount in XAF' })
  @IsNumber()
  @Min(1000)
  @Max(1000000)
  amount: number;

  @ApiProperty({ enum: PayoutMethod })
  @IsEnum(PayoutMethod)
  method: PayoutMethod;

  @ApiProperty({ example: '+237670000000', description: 'Phone number for mobile money' })
  @IsString()
  @MaxLength(20)
  accountNumber: string;

  @ApiProperty({ example: 'John Doe', description: 'Account holder name' })
  @IsString()
  @MaxLength(100)
  accountName: string;
}
