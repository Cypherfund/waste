import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { User } from '../../users/entities/user.entity';
import { FraudType, FraudFlagStatus } from '../../common/enums/fraud-type.enum';
import { FraudSeverity } from '../../common/enums/fraud-severity.enum';

@Entity('fraud_flags')
export class FraudFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'job_id' })
  jobId: string;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Index()
  @Column({ type: 'uuid', name: 'collector_id' })
  collectorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'collector_id' })
  collector: User;

  @Column({ type: 'enum', enum: FraudType })
  type: FraudType;

  @Column({ type: 'enum', enum: FraudSeverity })
  severity: FraudSeverity;

  @Column({ type: 'jsonb', default: {} })
  details: Record<string, any>;

  @Column({ type: 'enum', enum: FraudFlagStatus, default: FraudFlagStatus.OPEN })
  status: FraudFlagStatus;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by' })
  reviewedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @Column({ type: 'text', nullable: true, name: 'review_notes' })
  reviewNotes: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
