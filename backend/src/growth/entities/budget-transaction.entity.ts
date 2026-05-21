import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MarketingBudgetPeriod } from './marketing-budget-period.entity';
import { MarketingCampaign } from './marketing-campaign.entity';
import { CommissionTransaction } from './commission-transaction.entity';
import { MarketerProfile } from './marketer-profile.entity';
import { User } from '../../users/entities/user.entity';

export enum BudgetTransactionType {
  COMMITTED = 'COMMITTED',
  RELEASED = 'RELEASED',
  SPENT = 'SPENT',
  ADJUSTMENT = 'ADJUSTMENT',
}

@Entity('budget_transactions')
export class BudgetTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'budget_period_id' })
  budgetPeriodId: string;

  @ManyToOne(() => MarketingBudgetPeriod)
  @JoinColumn({ name: 'budget_period_id' })
  budgetPeriod: MarketingBudgetPeriod;

  @Index()
  @Column({ type: 'uuid', name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => MarketingCampaign)
  @JoinColumn({ name: 'campaign_id' })
  campaign: MarketingCampaign;

  @Index()
  @Column({ type: 'uuid', name: 'commission_transaction_id', nullable: true })
  commissionTransactionId: string | null;

  @ManyToOne(() => CommissionTransaction)
  @JoinColumn({ name: 'commission_transaction_id' })
  commissionTransaction: CommissionTransaction | null;

  @Column({ type: 'uuid', name: 'marketer_profile_id', nullable: true })
  marketerProfileId: string | null;

  @ManyToOne(() => MarketerProfile)
  @JoinColumn({ name: 'marketer_profile_id' })
  marketerProfile: MarketerProfile | null;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  type: BudgetTransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'balance_before' })
  balanceBefore: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'balance_after' })
  balanceAfter: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
