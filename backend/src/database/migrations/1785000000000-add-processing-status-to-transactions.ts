import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessingStatusToTransactions1785000000000 implements MigrationInterface {
  name = 'AddProcessingStatusToTransactions1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create processing_status enum
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "processing_status_enum" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // Add processing_status column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN "processing_status" "processing_status_enum" DEFAULT 'PENDING'
    `);

    // Add processing_failure_reason column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN "processing_failure_reason" text
    `);

    // Add processed_at column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN "processed_at" timestamptz
    `);

    // Add processing_attempts column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN "processing_attempts" integer DEFAULT 0
    `);

    // Create index for querying by processing status
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_transactions_processing_status"
      ON "payment_transactions"("processing_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns
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

    // Drop enum
    await queryRunner.query(`
      DROP TYPE IF EXISTS "processing_status_enum"
    `);
  }
}
