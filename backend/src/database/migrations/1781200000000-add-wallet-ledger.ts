import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletLedger1781200000000 implements MigrationInterface {
  name = 'AddWalletLedger1781200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create wallet_ledger_direction enum (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "wallet_ledger_direction_enum" AS ENUM ('CREDIT', 'DEBIT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create wallet_ledger_type enum (idempotent)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "wallet_ledger_type_enum" AS ENUM (
          'WALLET_TOPUP',
          'JOB_PAYMENT',
          'SUBSCRIPTION_PAYMENT',
          'COLLECTOR_EARNING',
          'ADMIN_ADJUSTMENT'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create wallet_ledger table
    await queryRunner.query(`
      CREATE TABLE "wallet_ledger" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "direction" "wallet_ledger_direction_enum" NOT NULL,
        "type" "wallet_ledger_type_enum" NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "balance_before" decimal(12,2) NOT NULL,
        "balance_after" decimal(12,2) NOT NULL,
        "payment_transaction_id" uuid,
        "job_id" uuid,
        "subscription_id" uuid,
        "earning_id" uuid,
        "payout_request_id" uuid,
        "reference" text,
        "metadata" jsonb,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_wallet_ledger_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_wallet_ledger_payment_transaction" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wallet_ledger_job" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wallet_ledger_subscription" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wallet_ledger_earning" FOREIGN KEY ("earning_id") REFERENCES "earnings"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wallet_ledger_payout_request" FOREIGN KEY ("payout_request_id") REFERENCES "marketer_payout_requests"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_wallet_ledger_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_wallet_ledger_user_id" ON "wallet_ledger"("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wallet_ledger_created_at" ON "wallet_ledger"("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wallet_ledger_type" ON "wallet_ledger"("type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_ledger_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_ledger_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wallet_ledger_user_id"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "wallet_ledger"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "wallet_ledger_type_enum"`);
    await queryRunner.query(`DROP TYPE "wallet_ledger_direction_enum"`);
  }
}
