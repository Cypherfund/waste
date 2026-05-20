import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum FloatLedgerType {
  TOP_UP = 'TOP_UP',
  CASH_SETTLEMENT_DEDUCTION = 'CASH_SETTLEMENT_DEDUCTION',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('collector_float_ledger')
@Index(['collectorId'])
export class CollectorFloatLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'collector_id' })
  collectorId: string;

  @Column({ type: 'uuid', nullable: true, name: 'job_id' })
  jobId: string | null;

  @Column({ type: 'enum', enum: FloatLedgerType })
  type: FloatLedgerType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'balance_before' })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'balance_after' })
  balanceAfter: number;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
