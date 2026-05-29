import { IsString, IsNumber, IsOptional, IsEnum, Min, MaxLength, Matches } from 'class-validator';
import { TransactionType, PaymentSource } from '../entities/payment-transaction.entity';

export class InitiatePaymentDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @MaxLength(20)
  paymentCode: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^6[0-9]{8}$/, { message: 'Phone must be a valid Cameroon mobile number (9 digits starting with 6)' })
  phone: string;

  @IsOptional()
  @IsEnum(PaymentSource)
  paymentSource?: PaymentSource;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsString()
  payoutRequestId?: string;
}
