import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum CleanupStatus {
  ANALYZED = 'ANALYZED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('system_cleanup_logs')
export class SystemCleanupLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({ type: 'jsonb' })
  filters: Record<string, any>;

  @Column({ type: 'jsonb' })
  components: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  analysisBefore: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  deletedCounts: Record<string, any>;

  @Column({ type: 'jsonb', default: [] })
  errors: string[];

  @Column({
    type: 'enum',
    enum: CleanupStatus,
    default: CleanupStatus.ANALYZED,
  })
  status: CleanupStatus;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
