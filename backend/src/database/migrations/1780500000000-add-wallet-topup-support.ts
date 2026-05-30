import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletTopupSupport1780500000000 implements MigrationInterface {
  name = 'AddWalletTopupSupport1780500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Add WALLET_TOPUP to transaction_type enum ─────────────────────
    // First check if the enum exists
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum'
    `);

    if (enumExists.length > 0) {
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TYPE "public"."transaction_type_enum"
          ADD VALUE IF NOT EXISTS 'WALLET_TOPUP';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `);
    }

    // ── Add payment_source column to payment_transactions ───────────────
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN IF NOT EXISTS "payment_source" varchar(50) DEFAULT 'JOB_PAYMENT'
    `);

    // ── Add wallet top-up config keys ────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "system_config" (id, key, value, data_type, category, description, is_feature_flag, updated_by, updated_at)
      VALUES
        (uuid_generate_v4(), 'wallet.topup_min_amount', '500', 'number', 'wallet', 'Minimum wallet top-up amount (XAF)', false, NULL, NOW()),
        (uuid_generate_v4(), 'wallet.topup_max_amount', '500000', 'number', 'wallet', 'Maximum wallet top-up amount (XAF)', false, NULL, NOW()),
        (uuid_generate_v4(), 'wallet.topup_quick_amounts', '1000,3500,5000,10000', 'string', 'wallet', 'Comma-separated quick top-up amounts (XAF)', false, NULL, NOW()),
        (uuid_generate_v4(), 'wallet.topup_enabled', 'true', 'boolean', 'wallet', 'Enable wallet top-up feature', true, NULL, NOW())
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Remove wallet top-up config keys ─────────────────────────────────
    await queryRunner.query(`DELETE FROM "system_config" WHERE key LIKE 'wallet.topup%'`);

    // ── Remove payment_source column ────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" DROP COLUMN IF EXISTS "payment_source"`,
    );

    // ── Note: We don't remove WALLET_TOPUP from enum as it's not easily reversible
    // The enum value will remain but won't be used if this migration is rolled back
  }
}
