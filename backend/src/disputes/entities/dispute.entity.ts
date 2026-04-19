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
import { DisputeStatus } from '../../common/enums/dispute-status.enum';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'job_id', unique: true })
  jobId: string;

  @OneToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ type: 'uuid', name: 'household_id' })
  householdId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'household_id' })
  household: User;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({ type: 'text', nullable: true, name: 'admin_notes' })
  adminNotes: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'resolved_by' })
  resolvedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver: User;

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
