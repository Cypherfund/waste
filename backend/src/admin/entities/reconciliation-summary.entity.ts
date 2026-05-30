import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('reconciliation_summaries')
export class ReconciliationSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'date', name: 'summary_date' })
  summaryDate: string;

  // Money In
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'integrated_provider_payments',
  })
  integratedProviderPayments: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'manual_provider_payments',
  })
  manualProviderPayments: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'wallet_topups' })
  walletTopups: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'cash_collected' })
  cashCollected: number;

  // Money Out / Liabilities
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'collector_earnings' })
  collectorEarnings: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'marketer_commissions' })
  marketerCommissions: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'approved_payouts' })
  approvedPayouts: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'wallet_balance_liabilities',
  })
  walletBalanceLiabilities: number;

  // Internal Movements
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'wallet_debits' })
  walletDebits: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'collector_float_deductions',
  })
  collectorFloatDeductions: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'platform_share_cash_jobs',
  })
  platformShareCashJobs: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'platform_share_cash_first_pickup',
  })
  platformShareCashFirstPickup: number;

  // Pending / Risk
  @Column({ type: 'int', default: 0, name: 'manual_payments_pending' })
  manualPaymentsPending: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'manual_payments_pending_amount',
  })
  manualPaymentsPendingAmount: number;

  @Column({ type: 'int', default: 0, name: 'failed_provider_payments' })
  failedProviderPayments: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'failed_provider_payments_amount',
  })
  failedProviderPaymentsAmount: number;

  @Column({ type: 'int', default: 0, name: 'unreconciled_items' })
  unreconciledItems: number;

  @Column({ type: 'text', nullable: true, name: 'notes' })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
