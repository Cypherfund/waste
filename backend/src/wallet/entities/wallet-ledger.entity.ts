import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum WalletLedgerDirection {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum WalletLedgerType {
  WALLET_TOPUP = 'WALLET_TOPUP',
  JOB_PAYMENT = 'JOB_PAYMENT',
  SUBSCRIPTION_PAYMENT = 'SUBSCRIPTION_PAYMENT',
  COLLECTOR_EARNING = 'COLLECTOR_EARNING',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

@Entity('wallet_ledger')
export class WalletLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: WalletLedgerDirection })
  direction: WalletLedgerDirection;

  @Column({ type: 'enum', enum: WalletLedgerType })
  type: WalletLedgerType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'balance_before' })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'balance_after' })
  balanceAfter: number;

  @Column({ type: 'uuid', nullable: true, name: 'payment_transaction_id' })
  paymentTransactionId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'job_id' })
  jobId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'subscription_id' })
  subscriptionId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'earning_id' })
  earningId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'payout_request_id' })
  payoutRequestId: string | null;

  @Column({ type: 'text', nullable: true, name: 'reference' })
  reference: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: Record<string, any> | null;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
