import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DayOfWeek } from '../../common/enums/day-of-week.enum';

@Entity('collector_availability')
@Unique('uq_collector_day_slot', ['collectorId', 'dayOfWeek', 'startTime'])
export class CollectorAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'collector_id' })
  collectorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'collector_id' })
  collector: User;

  @Index()
  @Column({ type: 'enum', enum: DayOfWeek, name: 'day_of_week' })
  dayOfWeek: DayOfWeek;

  @Column({ type: 'time', name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
