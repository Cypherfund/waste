import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentRefProofColumns1780700000000 implements MigrationInterface {
  name = 'AddPaymentRefProofColumns1780700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add payment_ref column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN "payment_ref" varchar(100)
    `);

    // Add payment_proof_url column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ADD COLUMN "payment_proof_url" varchar(500)
    `);

    // Migrate existing data from failureReason to paymentRef for wallet top-ups
    // Use string literal comparison to avoid unsafe enum use
    await queryRunner.query(`
      UPDATE "payment_transactions"
      SET "payment_ref" = "failure_reason"
      WHERE "type"::text = 'WALLET_TOPUP' AND "failure_reason" IS NOT NULL
    `);

    // Clear failureReason for wallet top-ups that had payment references
    await queryRunner.query(`
      UPDATE "payment_transactions"
      SET "failure_reason" = NULL
      WHERE "type"::text = 'WALLET_TOPUP' AND "payment_ref" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop payment_proof_url column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      DROP COLUMN "payment_proof_url"
    `);

    // Drop payment_ref column
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      DROP COLUMN "payment_ref"
    `);
  }
}
