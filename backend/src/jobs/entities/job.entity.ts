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
  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.REQUESTED })
  status: JobStatus;

  @Column({ type: 'date', name: 'scheduled_date' })
  scheduledDate: string;

  @Column({ type: 'varchar', length: 20, name: 'scheduled_time' })
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

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
