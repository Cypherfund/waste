import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentTransactions1778455655000 implements MigrationInterface {
  name = 'AddPaymentTransactions1778455655000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "transaction_type_enum" AS ENUM ('CASHIN', 'CASHOUT')
    `);

    await queryRunner.query(`
      CREATE TYPE "transaction_status_enum" AS ENUM ('PENDING', 'SUCCESS', 'FAILED')
    `);

    // Create payment_transactions table
    await queryRunner.query(`
      CREATE TABLE "payment_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "transaction_type_enum" NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'XAF',
        "payment_code" varchar(20) NOT NULL,
        "provider_name" varchar(100) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "internal_ref" varchar(100) NOT NULL,
        "gateway_transaction_id" varchar(100) NULL,
        "status" "transaction_status_enum" NOT NULL DEFAULT 'PENDING',
        "job_id" uuid NULL,
        "payout_request_id" uuid NULL,
        "callback_received_at" timestamptz NULL,
        "failure_reason" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_internal_ref" UNIQUE ("internal_ref"),
        CONSTRAINT "FK_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_payout_request" FOREIGN KEY ("payout_request_id") REFERENCES "payout_requests"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_tx_user_id" ON "payment_transactions"("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_tx_status" ON "payment_transactions"("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_tx_gateway_id" ON "payment_transactions"("gateway_transaction_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_tx_created_at" ON "payment_transactions"("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_tx_job_id" ON "payment_transactions"("job_id") WHERE "job_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_tx_payout_id" ON "payment_transactions"("payout_request_id") WHERE "payout_request_id" IS NOT NULL
    `);

    // Create trigger for updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_payment_transactions_updated_at
        BEFORE UPDATE ON "payment_transactions"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON "payment_transactions"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payment_tx_payout_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payment_tx_job_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payment_tx_created_at"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payment_tx_gateway_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payment_tx_status"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payment_tx_user_id"
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "payment_transactions"
    `);

    // Drop enum types
    await queryRunner.query(`
      DROP TYPE IF EXISTS "transaction_type_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "transaction_status_enum"
    `);
  }
}
