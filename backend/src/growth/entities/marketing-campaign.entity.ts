import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MarketingBudgetPeriod } from './marketing-budget-period.entity';
import { CampaignMarketerAssignment } from './campaign-marketer-assignment.entity';
import { CampaignCommissionScheme } from './campaign-commission-scheme.entity';

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

@Entity('marketing_campaigns')
export class MarketingCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'budget_period_id' })
  budgetPeriodId: string;

  @ManyToOne(() => MarketingBudgetPeriod)
  @JoinColumn({ name: 'budget_period_id' })
  budgetPeriod: MarketingBudgetPeriod;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  territory: string | null;

  @Index()
  @Column({ type: 'timestamptz', name: 'start_date' })
  startDate: Date;

  @Column({ type: 'timestamptz', name: 'end_date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'budget_amount' })
  budgetAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'XAF' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'committed_amount' })
  committedAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'spent_amount' })
  spentAmount: number;

  @Column({ type: 'int', default: 80, name: 'alert_threshold_pct' })
  alertThresholdPct: number;

  @Index()
  @Column({ type: 'varchar', length: 20, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CampaignMarketerAssignment, (assignment) => assignment.campaign)
  marketerAssignments: CampaignMarketerAssignment[];

  @OneToMany(() => CampaignCommissionScheme, (scheme) => scheme.campaign)
  commissionSchemes: CampaignCommissionScheme[];
}
