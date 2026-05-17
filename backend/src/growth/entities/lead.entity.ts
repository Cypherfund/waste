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
import { User } from '../../users/entities/user.entity';

export enum LeadType {
  HOUSEHOLD = 'HOUSEHOLD',
  COLLECTOR = 'COLLECTOR',
}

export enum LeadStatus {
  INVITED = 'INVITED',
  REGISTERED = 'REGISTERED',
  QUALIFIED = 'QUALIFIED',
  EXPIRED = 'EXPIRED',
}

export enum LeadSource {
  FIELD = 'FIELD',
  QR_CODE = 'QR_CODE',
  WHATSAPP = 'WHATSAPP',
  MANUAL = 'MANUAL',
}

export enum SMSSStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'marketer_id' })
  marketerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'marketer_id' })
  marketer: User;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 20 })
  type: LeadType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  area: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 20, default: LeadSource.FIELD })
  source: LeadSource;

  @Index()
  @Column({ type: 'varchar', length: 100, unique: true, name: 'referral_token' })
  referralToken: string;

  @Column({ type: 'varchar', length: 50, name: 'referral_code' })
  referralCode: string;

  @Column({ type: 'varchar', length: 20, default: LeadStatus.INVITED })
  status: LeadStatus;

  @Column({ type: 'timestamptz', name: 'invited_at' })
  invitedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'registered_at' })
  registeredAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'qualified_at' })
  qualifiedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 20, default: SMSSStatus.PENDING, name: 'sms_status' })
  smsStatus: SMSSStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'sms_sent_at' })
  smsSentAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'sms_delivered_at' })
  smsDeliveredAt: Date | null;

  @Column({ type: 'int', default: 0, name: 'sms_retry_count' })
  smsRetryCount: number;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'sms_provider_message_id' })
  smsProviderMessageId: string | null;

  @Column({ type: 'boolean', default: false, name: 'sms_opt_out' })
  smsOptOut: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'registered_user_id' })
  registeredUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'registered_user_id' })
  registeredUser: User | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
