import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionStatus } from '../../common/enums/subscription-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { Job } from '../../jobs/entities/job.entity';

@Entity('user_subscriptions')
export class UserSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'plan_id' })
  planId: string;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'linked_first_job_id' })
  linkedFirstJobId: string | null;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'linked_first_job_id' })
  linkedFirstJob: Job | null;

  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  @Column({ type: 'int', default: 0, name: 'remaining_pickups_this_week' })
  remainingPickupsThisWeek: number;

  @Column({ type: 'date', nullable: true, name: 'week_reset_date' })
  weekResetDate: string | null;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_mode' })
  paymentMode: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true, name: 'payment_status' })
  paymentStatus: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'payment_ref' })
  paymentRef: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'payment_proof_url' })
  paymentProofUrl: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_phone' })
  paymentPhone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_transaction_id' })
  providerTransactionId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
