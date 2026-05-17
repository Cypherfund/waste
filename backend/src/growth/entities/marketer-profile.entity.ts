import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MarketerStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

@Entity('marketer_profiles')
export class MarketerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', unique: true, name: 'user_id' })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ type: 'varchar', length: 50, unique: true, name: 'referral_code' })
  referralCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  territory: string | null;

  @Column({ type: 'varchar', length: 20, default: MarketerStatus.PENDING })
  status: MarketerStatus;

  @Column({ type: 'int', default: 0, name: 'total_leads' })
  totalLeads: number;

  @Column({ type: 'int', default: 0, name: 'total_registered' })
  totalRegistered: number;

  @Column({ type: 'int', default: 0, name: 'total_qualified' })
  totalQualified: number;

  @Column({ type: 'int', default: 0, name: 'total_expired' })
  totalExpired: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'conversion_rate' })
  conversionRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'qualification_rate' })
  qualificationRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_earned' })
  totalEarned: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_paid' })
  totalPaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'pending_amount' })
  pendingAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'approved_amount' })
  approvedAmount: number;

  @Column({ type: 'int', default: 0, name: 'daily_leads_created' })
  dailyLeadsCreated: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'daily_leads_reset_at' })
  dailyLeadsResetAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
