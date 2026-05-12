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

export enum TransactionType {
  CASHIN = 'CASHIN',
  CASHOUT = 'CASHOUT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
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

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'XAF' })
  currency: string;

  @Column({ type: 'varchar', length: 20, name: 'payment_code' })
  paymentCode: string;

  @Column({ type: 'varchar', length: 100, name: 'provider_name' })
  providerName: string;

  @Column({ type: 'varchar', length: 20, name: 'phone' })
  phone: string;

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

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
