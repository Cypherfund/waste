import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingJobPaymentColumns1778600000000 implements MigrationInterface {
  name = 'AddMissingJobPaymentColumns1778600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing payment-related columns to jobs table
    await queryRunner.query(`
      ALTER TABLE "jobs" 
      ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS "payment_ref" VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS "payment_verified_by" UUID NULL,
      ADD COLUMN IF NOT EXISTS "payment_verified_at" TIMESTAMPTZ NULL,
      ADD COLUMN IF NOT EXISTS "payment_rejection_reason" TEXT NULL
    `);

    // Create indexes for the new columns
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_payment_method" ON "jobs" ("payment_method") WHERE "payment_method" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_payment_verified_by" ON "jobs" ("payment_verified_by") WHERE "payment_verified_by" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_payment_verified_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_payment_method"`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "jobs" 
      DROP COLUMN IF EXISTS "payment_rejection_reason",
      DROP COLUMN IF EXISTS "payment_verified_at",
      DROP COLUMN IF EXISTS "payment_verified_by",
      DROP COLUMN IF EXISTS "payment_ref",
      DROP COLUMN IF EXISTS "payment_method"
    `);
  }
}
