import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CommissionType {
  HOUSEHOLD_ONBOARDING = 'HOUSEHOLD_ONBOARDING',
  COLLECTOR_ONBOARDING = 'COLLECTOR_ONBOARDING',
  SUBSCRIPTION_PAYMENT = 'SUBSCRIPTION_PAYMENT',
}

export enum CommissionValueType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

@Entity('commission_schemes')
export class CommissionScheme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 30 })
  type: CommissionType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, name: 'commission_type' })
  commissionType: CommissionValueType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_auto_assigned' })
  isAutoAssigned: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
