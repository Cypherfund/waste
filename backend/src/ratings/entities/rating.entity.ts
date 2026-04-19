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

@Entity('ratings')
export class Rating {
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

  @Index()
  @Column({ type: 'uuid', name: 'collector_id' })
  collectorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'collector_id' })
  collector: User;

  @Column({ type: 'smallint' })
  value: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
