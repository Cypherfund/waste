import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManualPaymentColumns1778800000000 implements MigrationInterface {
  name = 'AddManualPaymentColumns1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='payment_providers' AND column_name='manual_payment_phone'`,
    );
    if (exists.length > 0) {
      console.log('Manual payment columns migration: already applied, skipping.');
      return;
    }

    // Add manual payment columns to payment_providers table
    await queryRunner.query(`
      ALTER TABLE "payment_providers" 
      ADD COLUMN IF NOT EXISTS "manual_payment_phone" VARCHAR(20) NULL,
      ADD COLUMN IF NOT EXISTS "manual_payment_account_name" VARCHAR(100) NULL
    `);

    // Create index for manual payment phone lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_providers_manual_phone" 
      ON "payment_providers" ("manual_payment_phone") 
      WHERE "manual_payment_phone" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_providers_manual_phone"`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "payment_providers" 
      DROP COLUMN IF EXISTS "manual_payment_account_name",
      DROP COLUMN IF EXISTS "manual_payment_phone"
    `);
  }
}
