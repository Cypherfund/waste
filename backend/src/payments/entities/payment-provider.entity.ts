import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payment_providers')
@Index(['paymentCode', 'countryCode'], { unique: true })
export class PaymentProviderEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, name: 'payment_code' })
  paymentCode: string;

  @Column({ type: 'varchar', length: 10, name: 'country_code' })
  countryCode: string;

  @Column({ type: 'varchar', length: 100, name: 'provider_name' })
  providerName: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'min_deposit' })
  minDeposit: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'max_deposit' })
  maxDeposit: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'min_withdrawal' })
  minWithdrawal: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'max_withdrawal' })
  maxWithdrawal: number | null;

  @Column({ type: 'boolean', default: true, name: 'supports_cashin' })
  supportsCashin: boolean;

  @Column({ type: 'boolean', default: false, name: 'supports_cashout' })
  supportsCashout: boolean;

  @Column({ type: 'text', nullable: true, name: 'image_url' })
  imageUrl: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_global' })
  isGlobal: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_enabled' })
  isEnabled: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'manual_payment_phone' })
  manualPaymentPhone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'manual_payment_account_name' })
  manualPaymentAccountName: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()', name: 'synced_at' })
  syncedAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
