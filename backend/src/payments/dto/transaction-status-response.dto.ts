import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus, ProcessingStatus } from '../entities/payment-transaction.entity';

export class TransactionStatusResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({
    description: 'Effective status for mobile (considers both gateway status and processing status)',
    enum: TransactionStatus,
  })
  status: TransactionStatus;

  @ApiProperty({
    description: 'Raw gateway payment status',
    enum: TransactionStatus,
    nullable: true,
  })
  gatewayStatus: TransactionStatus | null;

  @ApiProperty({
    description: 'Downstream processing status',
    enum: ProcessingStatus,
    nullable: true,
  })
  processingStatus: ProcessingStatus | null;

  @ApiProperty({ description: 'Number of processing attempts' })
  processingAttempts: number;

  @ApiProperty({ description: 'Amount in XAF' })
  amount: number;

  @ApiProperty({ description: 'Currency code', example: 'XAF' })
  currency: string;

  @ApiProperty({ description: 'Transaction type' })
  type: string;

  @ApiProperty({ description: 'Payment source', nullable: true })
  paymentSource: string | null;

  @ApiProperty({ description: 'When transaction was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When transaction was last updated' })
  updatedAt: Date;

  @ApiProperty({ description: 'When callback was received', nullable: true })
  callbackReceivedAt: Date | null;

  @ApiProperty({ description: 'When processing completed', nullable: true })
  processedAt: Date | null;

  @ApiProperty({ description: 'Failure reason if payment failed', nullable: true })
  failureReason: string | null;

  @ApiProperty({ description: 'Processing failure reason if processing failed', nullable: true })
  processingFailureReason: string | null;

  @ApiProperty({ description: 'Payment provider code', nullable: true })
  paymentCode: string | null;

  @ApiProperty({ description: 'Linked job ID', nullable: true })
  jobId: string | null;
}
