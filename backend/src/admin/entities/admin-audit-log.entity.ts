import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum AdminAuditAction {
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  WALLET_TOPUP_APPROVED = 'WALLET_TOPUP_APPROVED',
  WALLET_TOPUP_REJECTED = 'WALLET_TOPUP_REJECTED',
  SUBSCRIPTION_PAYMENT_VERIFIED = 'SUBSCRIPTION_PAYMENT_VERIFIED',
  SUBSCRIPTION_PAYMENT_REJECTED = 'SUBSCRIPTION_PAYMENT_REJECTED',
  COLLECTOR_PAYOUT_APPROVED = 'COLLECTOR_PAYOUT_APPROVED',
  COLLECTOR_PAYOUT_REJECTED = 'COLLECTOR_PAYOUT_REJECTED',
  COLLECTOR_PAYOUT_MARKED_PAID = 'COLLECTOR_PAYOUT_MARKED_PAID',
  MARKETER_PAYOUT_APPROVED = 'MARKETER_PAYOUT_APPROVED',
  MARKETER_PAYOUT_REJECTED = 'MARKETER_PAYOUT_REJECTED',
  MARKETER_PAYOUT_MARKED_PAID = 'MARKETER_PAYOUT_MARKED_PAID',
  SYSTEM_CONFIG_UPDATED = 'SYSTEM_CONFIG_UPDATED',
  PAYMENT_PROVIDER_CREATED = 'PAYMENT_PROVIDER_CREATED',
  PAYMENT_PROVIDER_UPDATED = 'PAYMENT_PROVIDER_UPDATED',
  PAYMENT_PROVIDER_DELETED = 'PAYMENT_PROVIDER_DELETED',
  COLLECTOR_FLOAT_TOPPED_UP = 'COLLECTOR_FLOAT_TOPPED_UP',
  COLLECTOR_FLOAT_ADJUSTED = 'COLLECTOR_FLOAT_ADJUSTED',
  SYSTEM_CLEANUP_ANALYZED = 'SYSTEM_CLEANUP_ANALYZED',
  SYSTEM_CLEANUP_EXECUTED = 'SYSTEM_CLEANUP_EXECUTED',
  OTP_LOOKUP = 'OTP_LOOKUP',
}

export enum AdminAuditEntityType {
  JOB = 'JOB',
  PAYMENT_TRANSACTION = 'PAYMENT_TRANSACTION',
  WALLET_TOPUP = 'WALLET_TOPUP',
  SUBSCRIPTION = 'SUBSCRIPTION',
  PAYOUT_REQUEST = 'PAYOUT_REQUEST',
  MARKETER_PAYOUT_REQUEST = 'MARKETER_PAYOUT_REQUEST',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  PAYMENT_PROVIDER = 'PAYMENT_PROVIDER',
  COLLECTOR_FLOAT_LEDGER = 'COLLECTOR_FLOAT_LEDGER',
  SYSTEM_CLEANUP = 'SYSTEM_CLEANUP',
  OTP_LOOKUP = 'OTP_LOOKUP',
}

@Entity('admin_audit_logs')
@Index(['adminId'])
@Index(['action'])
@Index(['entityType'])
@Index(['entityId'])
@Index(['createdAt'])
@Index(['adminId', 'action'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @Column({ type: 'uuid', name: 'admin_id', nullable: true })
  @ApiProperty({ description: 'Admin who performed the action', required: false })
  adminId: string | null;

  @Column({
    type: 'enum',
    enum: AdminAuditAction,
  })
  @ApiProperty({ description: 'Action performed' })
  action: AdminAuditAction;

  @Column({
    type: 'enum',
    enum: AdminAuditEntityType,
    name: 'entity_type',
  })
  @ApiProperty({ description: 'Type of entity affected' })
  entityType: AdminAuditEntityType;

  @Column({ type: 'uuid', name: 'entity_id', nullable: true })
  @ApiProperty({ description: 'ID of entity affected', required: false })
  entityId: string | null;

  @Column({ type: 'jsonb', name: 'old_value', nullable: true })
  @ApiProperty({ description: 'Value before change', required: false })
  oldValue: Record<string, any> | null;

  @Column({ type: 'jsonb', name: 'new_value', nullable: true })
  @ApiProperty({ description: 'Value after change', required: false })
  newValue: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  @ApiProperty({ description: 'IP address of request', required: false })
  ipAddress: string | null;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  @ApiProperty({ description: 'User agent of request', required: false })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty({ description: 'When the action was performed' })
  createdAt: Date;
}
