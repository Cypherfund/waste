import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationChannel, NotificationStatus } from '../../common/enums/notification-channel.enum';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', default: '{}' })
  data: Record<string, any>;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Index()
  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'sent_at' })
  sentAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
  readAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
