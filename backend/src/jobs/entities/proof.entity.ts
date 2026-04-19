import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Job } from './job.entity';

@Entity('proofs')
export class Proof {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'job_id', unique: true })
  jobId: string;

  @OneToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ type: 'varchar', length: 500, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true, name: 'collector_lat' })
  collectorLat: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true, name: 'collector_lng' })
  collectorLng: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'uploaded_at' })
  uploadedAt: Date;
}
