import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MarketerProfile } from './marketer-profile.entity';

export enum NotificationType {
  LEAD_REGISTERED = 'LEAD_REGISTERED',
  LEAD_QUALIFIED = 'LEAD_QUALIFIED',
  COMMISSION_APPROVED = 'COMMISSION_APPROVED',
  COMMISSION_PAID = 'COMMISSION_PAID',
  PAYOUT_PROCESSED = 'PAYOUT_PROCESSED',
  SYSTEM = 'SYSTEM',
}

@Entity('marketer_notifications')
export class MarketerNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'marketer_profile_id' })
  marketerProfileId: string;

  @ManyToOne(() => MarketerProfile)
  @JoinColumn({ name: 'marketer_profile_id' })
  marketerProfile: MarketerProfile;

  @Column({ type: 'varchar', length: 30 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
