import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { User } from '../../users/entities/user.entity';
import { EarningStatus } from '../../common/enums/earning-status.enum';

@Entity('earnings')
export class Earning {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'job_id', unique: true })
  jobId: string;

  @OneToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Index()
  @Column({ type: 'uuid', name: 'collector_id' })
  collectorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'collector_id' })
  collector: User;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'base_amount' })
  baseAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'distance_amount' })
  distanceAmount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0, name: 'surge_multiplier' })
  surgeMultiplier: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Index()
  @Column({ type: 'enum', enum: EarningStatus, default: EarningStatus.PENDING })
  status: EarningStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'confirmed_at' })
  confirmedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
