import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('supported_countries')
export class SupportedCountry {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 10, name: 'country_code' })
  countryCode: string;

  @Column({ type: 'varchar', length: 100, name: 'country_name' })
  countryName: string;

  @Column({ type: 'varchar', length: 5, name: 'phone_prefix' })
  phonePrefix: string;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'flag_emoji' })
  flagEmoji: string | null;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
