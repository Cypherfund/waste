import { IsString, IsEnum, IsOptional } from 'class-validator';
import { TransactionStatus } from '../entities/payment-transaction.entity';

export class PaymentCallbackDto {
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsString()
  transactionId: string;

  @IsOptional()
  data?: any;
}
