import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum UserPaymentMethodUsageType {
  CASHIN = 'CASHIN',
  CASHOUT = 'CASHOUT',
  BOTH = 'BOTH',
}

@Entity('user_payment_methods')
export class UserPaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ type: 'varchar', length: 20, name: 'payment_code' })
  paymentCode: string;

  @Column({ type: 'varchar', length: 100, name: 'account_number' })
  accountNumber: string;

  @Column({ type: 'varchar', length: 100, name: 'account_name', nullable: true })
  accountName: string | null;

  @Column({
    type: 'enum',
    enum: UserPaymentMethodUsageType,
    default: UserPaymentMethodUsageType.BOTH,
    name: 'usage_type',
  })
  usageType: UserPaymentMethodUsageType;

  @Index()
  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
