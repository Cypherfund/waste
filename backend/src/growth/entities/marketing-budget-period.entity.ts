import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum BudgetPeriodStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Entity('marketing_budget_periods')
export class MarketingBudgetPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ type: 'timestamptz', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamptz', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_budget' })
  totalBudget: number;

  @Column({ type: 'varchar', length: 3, default: 'XAF' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'committed_amount' })
  committedAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'spent_amount' })
  spentAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'remaining_amount', readonly: true })
  remainingAmount: number;

  @Column({ type: 'int', default: 80, name: 'alert_threshold_pct' })
  alertThresholdPct: number;

  @Index()
  @Column({ type: 'varchar', length: 20, default: BudgetPeriodStatus.ACTIVE })
  status: BudgetPeriodStatus;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
