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

export enum FileType {
  PROOF = 'PROOF',
  AVATAR = 'AVATAR',
  OTHER = 'OTHER',
}

@Entity('files')
export class FileRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'file_key', unique: true })
  fileKey: string;

  @Column({ type: 'varchar', length: 1000 })
  url: string;

  @Column({ type: 'varchar', length: 1000, nullable: true, name: 'delete_url' })
  deleteUrl: string | null;

  @Index()
  @Column({ type: 'uuid', name: 'uploaded_by' })
  uploadedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @Column({ type: 'enum', enum: FileType, default: FileType.OTHER, name: 'file_type' })
  fileType: FileType;

  @Column({ type: 'boolean', default: false, name: 'is_used' })
  isUsed: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
  deletedAt: Date | null;
}
