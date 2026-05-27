import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AppPlatform {
  ANDROID = 'ANDROID',
  IOS = 'IOS',
  ALL = 'ALL',
}

export enum AppType {
  HOUSEHOLD = 'HOUSEHOLD',
  COLLECTOR = 'COLLECTOR',
  MARKETER = 'MARKETER',
  ALL = 'ALL',
}

export enum UpdateType {
  OPTIONAL = 'OPTIONAL',
  FORCE = 'FORCE',
}

@Entity('app_versions')
export class AppVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: AppPlatform, default: AppPlatform.ALL })
  platform: AppPlatform;

  @Column({ type: 'enum', enum: AppType, name: 'app_type', default: AppType.ALL })
  appType: AppType;

  @Column({ type: 'varchar', length: 20, name: 'version_name' })
  versionName: string;

  @Column({ type: 'int', name: 'build_number' })
  buildNumber: number;

  @Column({ type: 'int', name: 'min_supported_build' })
  minSupportedBuild: number;

  @Column({ type: 'int', name: 'latest_build' })
  latestBuild: number;

  @Column({ type: 'enum', enum: UpdateType, name: 'update_type', default: UpdateType.OPTIONAL })
  updateType: UpdateType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true, name: 'store_url' })
  storeUrl: string | null;

  @Column({ type: 'text', nullable: true, name: 'release_notes' })
  releaseNotes: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'published_at' })
  publishedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
