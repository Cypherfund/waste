import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PaymentSource {
  JOB_PAYMENT = 'JOB_PAYMENT',
  SUBSCRIPTION_PAYMENT = 'SUBSCRIPTION_PAYMENT',
  WALLET_TOPUP = 'WALLET_TOPUP',
}

export enum TransactionType {
  CASHIN = 'CASHIN',
  CASHOUT = 'CASHOUT',
  WALLET_TOPUP = 'WALLET_TOPUP',
  JOB_PAYMENT = 'JOB_PAYMENT',
  SUBSCRIPTION_PAYMENT = 'SUBSCRIPTION_PAYMENT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  VERIFIED = 'VERIFIED',
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    default: 'JOB_PAYMENT',
    name: 'payment_source',
  })
  paymentSource: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'XAF' })
  currency: string;

  @Column({ type: 'varchar', length: 20, name: 'payment_code' })
  paymentCode: string;

  @Column({ type: 'varchar', length: 100, name: 'provider_name' })
  providerName: string;

  @Column({ type: 'varchar', length: 20, name: 'phone', nullable: true })
  phone: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, name: 'internal_ref' })
  internalRef: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'gateway_transaction_id' })
  gatewayTransactionId: string | null;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ type: 'uuid', nullable: true, name: 'job_id' })
  jobId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'payout_request_id' })
  payoutRequestId: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'callback_received_at' })
  callbackReceivedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'failure_reason' })
  failureReason: string | null;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    default: ProcessingStatus.PENDING,
    name: 'processing_status',
  })
  processingStatus: ProcessingStatus;

  @Column({ type: 'text', nullable: true, name: 'processing_failure_reason' })
  processingFailureReason: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'processed_at' })
  processedAt: Date | null;

  @Column({ type: 'int', default: 0, name: 'processing_attempts' })
  processingAttempts: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'processing_started_at' })
  processingStartedAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'payment_ref' })
  paymentRef: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'payment_proof_url' })
  paymentProofUrl: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
