import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MarketerProfile } from './marketer-profile.entity';
import { CommissionScheme } from './commission-scheme.entity';
import { Lead } from './lead.entity';
import { User } from '../../users/entities/user.entity';

export enum TriggerType {
  FIRST_SUCCESSFUL_BOOKING = 'FIRST_SUCCESSFUL_BOOKING',
  FIRST_PICKUP_COMPLETED = 'FIRST_PICKUP_COMPLETED',
  SUBSCRIPTION_PAID = 'SUBSCRIPTION_PAID',
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

@Entity('commission_transactions')
export class CommissionTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'marketer_profile_id' })
  marketerProfileId: string;

  @ManyToOne(() => MarketerProfile)
  @JoinColumn({ name: 'marketer_profile_id' })
  marketerProfile: MarketerProfile;

  @Column({ type: 'uuid', name: 'scheme_id' })
  schemeId: string;

  @ManyToOne(() => CommissionScheme)
  @JoinColumn({ name: 'scheme_id' })
  scheme: CommissionScheme;

  @Column({ type: 'uuid', name: 'lead_id' })
  leadId: string;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ type: 'varchar', length: 30, name: 'trigger_type' })
  triggerType: TriggerType;

  @Column({ type: 'varchar', length: 100, name: 'reference_id' })
  referenceId: string;

  @Column({ type: 'varchar', length: 20, name: 'reference_type' })
  referenceType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20, default: CommissionStatus.PENDING })
  status: CommissionStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'paid_reference' })
  paidReference: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
