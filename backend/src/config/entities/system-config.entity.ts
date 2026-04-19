import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('system_config')
export class SystemConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 100, unique: true })
  key: string;

  @Column({ type: 'varchar', length: 500 })
  value: string;

  @Column({ type: 'varchar', length: 20, default: 'string', name: 'data_type' })
  dataType: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_feature_flag' })
  isFeatureFlag: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()', name: 'updated_at' })
  updatedAt: Date;
}
