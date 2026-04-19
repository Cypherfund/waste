import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserRole } from '../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string | null;

  @Index()
  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Index()
  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'fcm_token' })
  fcmToken: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'refresh_token_hash' })
  refreshTokenHash: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, name: 'avg_rating' })
  avgRating: number;

  @Column({ type: 'int', default: 0, name: 'total_completed' })
  totalCompleted: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
