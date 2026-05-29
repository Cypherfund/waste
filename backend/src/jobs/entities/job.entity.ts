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
import { JobStatus } from '../../common/enums/job-status.enum';
import { PricingType } from '../../common/enums/pricing-type.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { PaymentMode } from '../../common/enums/payment-mode.enum';
import { UserSubscription } from '../../subscriptions/entities/user-subscription.entity';
import { CashCollectionType } from '../../common/enums/cash-collection-type.enum';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'household_id' })
  householdId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'household_id' })
  household: User;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'collector_id' })
  collectorId: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'collector_id' })
  collector: User | null;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'subscription_id' })
  subscriptionId: string | null;

  @ManyToOne(() => UserSubscription)
  @JoinColumn({ name: 'subscription_id' })
  subscription: UserSubscription | null;

  @Index()
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.REQUESTED })
  status: JobStatus;

  @Column({ type: 'date', name: 'scheduled_date' })
  scheduledDate: string;

  @Column({ type: 'varchar', length: 50, name: 'scheduled_time' })
  scheduledTime: string;

  @Column({ type: 'varchar', length: 500, name: 'location_address' })
  locationAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true, name: 'location_lat' })
  locationLat: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true, name: 'location_lng' })
  locationLng: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'assigned_at' })
  assignedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'validated_at' })
  validatedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
  cancellationReason: string | null;

  @Column({ type: 'int', default: 0, name: 'assignment_attempts' })
  assignmentAttempts: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'quoted_price' })
  quotedPrice: number | null;

  @Column({ type: 'enum', enum: PricingType, nullable: true, name: 'pricing_type' })
  pricingType: PricingType | null;

  @Column({ type: 'boolean', default: false, name: 'is_covered_by_subscription' })
  isCoveredBySubscription: boolean;

  @Column({ type: 'varchar', length: 30, default: PaymentStatus.NOT_REQUIRED, name: 'payment_status' })
  paymentStatus: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_method' })
  paymentMethod: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'payment_ref' })
  paymentRef: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'payment_verified_by' })
  paymentVerifiedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'payment_verified_at' })
  paymentVerifiedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'payment_rejection_reason' })
  paymentRejectionReason: string | null;

  @Column({ type: 'enum', enum: PaymentMode, nullable: true, name: 'payment_mode' })
  paymentMode: PaymentMode | null;

  @Column({ type: 'text', nullable: true, name: 'payment_proof_url' })
  paymentProofUrl: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_phone' })
  paymentPhone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'provider_transaction_id' })
  providerTransactionId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'cash_to_collect_amount' })
  cashToCollectAmount: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'cash_collection_type' })
  cashCollectionType: CashCollectionType | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
