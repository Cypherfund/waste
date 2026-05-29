import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReconciliationSummaries1780800000000 implements MigrationInterface {
  name = 'AddReconciliationSummaries1780800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reconciliation_summaries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "summary_date" date NOT NULL,
        "integrated_provider_payments" decimal(12,2) NOT NULL DEFAULT 0,
        "manual_provider_payments" decimal(12,2) NOT NULL DEFAULT 0,
        "wallet_topups" decimal(12,2) NOT NULL DEFAULT 0,
        "cash_collected" decimal(12,2) NOT NULL DEFAULT 0,
        "collector_earnings" decimal(12,2) NOT NULL DEFAULT 0,
        "marketer_commissions" decimal(12,2) NOT NULL DEFAULT 0,
        "approved_payouts" decimal(12,2) NOT NULL DEFAULT 0,
        "wallet_balance_liabilities" decimal(12,2) NOT NULL DEFAULT 0,
        "wallet_debits" decimal(12,2) NOT NULL DEFAULT 0,
        "collector_float_deductions" decimal(12,2) NOT NULL DEFAULT 0,
        "platform_share_cash_jobs" decimal(12,2) NOT NULL DEFAULT 0,
        "platform_share_cash_first_pickup" decimal(12,2) NOT NULL DEFAULT 0,
        "manual_payments_pending" integer NOT NULL DEFAULT 0,
        "manual_payments_pending_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "failed_provider_payments" integer NOT NULL DEFAULT 0,
        "failed_provider_payments_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "unreconciled_items" integer NOT NULL DEFAULT 0,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reconciliation_summaries" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_reconciliation_summary_date" ON "reconciliation_summaries"("summary_date")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_reconciliation_summary_date" ON "reconciliation_summaries"("summary_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_reconciliation_summary_date"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_reconciliation_summary_date"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "reconciliation_summaries"
    `);
  }
}
