import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { User } from '../../users/entities/user.entity';

@Entity('location_updates')
export class LocationUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'job_id', unique: true })
  jobId: string;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ type: 'uuid', name: 'collector_id' })
  collectorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'collector_id' })
  collector: User;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  accuracy: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  speed: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  heading: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'network_type' })
  networkType: string | null;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
