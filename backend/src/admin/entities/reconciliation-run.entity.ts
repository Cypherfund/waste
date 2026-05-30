import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum ReconciliationRunStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  SUCCESS_WITH_WARNINGS = 'SUCCESS_WITH_WARNINGS',
  FAILED = 'FAILED',
}

export enum ReconciliationRunTrigger {
  SCHEDULED = 'SCHEDULED',
  MANUAL = 'MANUAL',
}

@Entity('reconciliation_runs')
@Index(['reconciliationDate'])
@Index(['status'])
@Index(['startedAt'])
@Unique(['reconciliationDate'])
export class ReconciliationRun {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @Column({ type: 'date', name: 'reconciliation_date' })
  @ApiProperty({ description: 'Date being reconciled' })
  reconciliationDate: string;

  @Column({
    type: 'enum',
    enum: ReconciliationRunStatus,
    default: ReconciliationRunStatus.RUNNING,
  })
  @ApiProperty({ description: 'Run status' })
  status: ReconciliationRunStatus;

  @Column({ type: 'uuid', nullable: true, name: 'summary_id' })
  @ApiProperty({ description: 'Reference to reconciliation summary', required: false })
  summaryId: string | null;

  @Column({ type: 'integer', default: 0, name: 'unreconciled_count' })
  @ApiProperty({ description: 'Number of unreconciled items found' })
  unreconciledCount: number;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  @ApiProperty({ description: 'Error message if failed', required: false })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'started_at' })
  @ApiProperty({ description: 'When the run started' })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'finished_at' })
  @ApiProperty({ description: 'When the run finished', required: false })
  finishedAt: Date | null;

  @Column({ type: 'integer', default: 1, name: 'attempt_count' })
  @ApiProperty({ description: 'Number of retry attempts' })
  attemptCount: number;

  @Column({
    type: 'enum',
    enum: ReconciliationRunTrigger,
    default: ReconciliationRunTrigger.SCHEDULED,
    name: 'triggered_by',
  })
  @ApiProperty({ description: 'What triggered this run' })
  triggeredBy: ReconciliationRunTrigger;

  @Column({ type: 'uuid', nullable: true, name: 'triggered_by_admin_id' })
  @ApiProperty({ description: 'Admin who triggered manual run', required: false })
  triggeredByAdminId: string | null;
}
