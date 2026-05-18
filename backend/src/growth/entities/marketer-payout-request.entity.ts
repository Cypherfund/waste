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
import { User } from '../../users/entities/user.entity';

export enum PayoutMethod {
  MTN_MOMO = 'MTN_MOMO',
  ORANGE_MONEY = 'ORANGE_MONEY',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

@Entity('marketer_payout_requests')
export class MarketerPayoutRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'marketer_profile_id' })
  marketerProfileId: string;

  @ManyToOne(() => MarketerProfile)
  @JoinColumn({ name: 'marketer_profile_id' })
  marketerProfile: MarketerProfile;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  method: PayoutMethod;

  @Column({ type: 'varchar', length: 20, name: 'account_number' })
  accountNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'account_name' })
  accountName: string | null;

  @Column({ type: 'varchar', length: 20, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column({ type: 'text', nullable: true, name: 'admin_note' })
  adminNote: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'paid_reference' })
  paidReference: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
