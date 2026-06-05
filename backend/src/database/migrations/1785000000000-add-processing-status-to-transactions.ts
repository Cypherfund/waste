import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessingStatusToTransactions1785000000000 implements MigrationInterface {
  name = 'AddProcessingStatusToTransactions1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create processing_status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "processing_status_enum" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Add PROCESSING value if enum already exists (for environments with earlier migration version)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TYPE "processing_status_enum" ADD VALUE IF NOT EXISTS 'PROCESSING';
      EXCEPTION
        WHEN invalid_object_definition THEN null;
      END $$
    `);

    // Add processing_status column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN IF NOT EXISTS "processing_status" "processing_status_enum" DEFAULT 'PENDING'
    `);

    // Add processing_failure_reason column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN IF NOT EXISTS "processing_failure_reason" text
    `);

    // Add processed_at column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN IF NOT EXISTS "processed_at" timestamptz
    `);

    // Add processing_attempts column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN IF NOT EXISTS "processing_attempts" integer DEFAULT 0
    `);

    // Add processing_started_at column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN IF NOT EXISTS "processing_started_at" timestamptz
    `);

    // Create index for querying by processing status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_processing_status"
      ON "payment_transactions"("processing_status")
    `);

    // Backfill historical transactions - mark completed ones as COMPLETED
    // These are transactions that were already processed before this feature
    await queryRunner.query(`
      UPDATE "payment_transactions"
      SET
        "processing_status" = 'COMPLETED',
        "processed_at" = COALESCE("callback_received_at", "updated_at", "created_at"),
        "processing_attempts" = CASE
          WHEN "processing_attempts" = 0 THEN 1
          ELSE "processing_attempts"
        END
      WHERE "status" IN ('SUCCESS', 'VERIFIED', 'FAILED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      DROP COLUMN IF EXISTS "processing_started_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      DROP COLUMN IF EXISTS "processing_attempts"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      DROP COLUMN IF EXISTS "processed_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      DROP COLUMN IF EXISTS "processing_failure_reason"
    `);
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      DROP COLUMN IF EXISTS "processing_status"
    `);

    // Remove index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payment_transactions_processing_status"
    `);

    // Note: Dropping columns is sufficient; dropping the enum type
    // will fail if any columns still reference it, which is handled by IF EXISTS

    // Drop enum
    await queryRunner.query(`
      DROP TYPE IF EXISTS "processing_status_enum"
    `);
  }
}
