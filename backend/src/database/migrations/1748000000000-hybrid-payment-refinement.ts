import { MigrationInterface, QueryRunner } from 'typeorm';

export class HybridPaymentRefinement1748000000000 implements MigrationInterface {
  name = 'HybridPaymentRefinement1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Guard: idempotent ───────────────────────────────────────────────────
    const alreadyApplied = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='payment_mode'`,
    );
    if (alreadyApplied.length > 0) {
      console.log('HybridPaymentRefinement: already applied, skipping.');
      return;
    }

    // ─── 1. payment_status enum — add new values (if enum exists; production uses varchar) ─────────────────────────────
    const paymentStatusEnumExists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'jobs_payment_status_enum'`
    );
    if (paymentStatusEnumExists.length > 0) {
      await queryRunner.query(`ALTER TYPE "jobs_payment_status_enum" ADD VALUE IF NOT EXISTS 'AWAITING_ADMIN_VERIFICATION'`);
      await queryRunner.query(`ALTER TYPE "jobs_payment_status_enum" ADD VALUE IF NOT EXISTS 'PROVIDER_PENDING'`);
      await queryRunner.query(`ALTER TYPE "jobs_payment_status_enum" ADD VALUE IF NOT EXISTS 'FAILED'`);
    }

    // ─── 2. job_status enum — add PAYMENT_FAILED (if enum exists) ─────────────────────────────
    const jobStatusEnumExists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'jobs_status_enum'`
    );
    if (jobStatusEnumExists.length > 0) {
      await queryRunner.query(`ALTER TYPE "jobs_status_enum" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED'`);
    }

    // ─── 3. payment_mode enum (new) — only if not already created by sync ────────────────────────────────
    const paymentModeEnumExists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'jobs_payment_mode_enum'`
    );
    if (paymentModeEnumExists.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "jobs_payment_mode_enum" AS ENUM ('NONE', 'MANUAL_PROVIDER', 'INTEGRATED_PROVIDER', 'CASH');
      `);
    }

    // ─── 4. float_ledger_type enum (new) — only if not already created by sync ────────────────────────────────
    const floatLedgerTypeEnumExists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'collector_float_ledger_type_enum'`
    );
    if (floatLedgerTypeEnumExists.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "collector_float_ledger_type_enum" AS ENUM ('TOP_UP', 'CASH_SETTLEMENT_DEDUCTION', 'ADJUSTMENT');
      `);
    }

    // ─── 5. jobs — add new columns ────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "payment_mode" "jobs_payment_mode_enum" NULL`);
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "payment_proof_url" TEXT NULL`);
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "payment_phone" VARCHAR(20) NULL`);
    await queryRunner.query(`ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "provider_transaction_id" VARCHAR(100) NULL`);

    // ─── 6. payment_providers — add new columns ───────────────────────────────
    await queryRunner.query(`ALTER TABLE "payment_providers" ADD COLUMN IF NOT EXISTS "manual_instructions" TEXT NULL`);
    await queryRunner.query(`ALTER TABLE "payment_providers" ADD COLUMN IF NOT EXISTS "integration_enabled" BOOLEAN NOT NULL DEFAULT FALSE`);
    await queryRunner.query(`ALTER TABLE "payment_providers" ADD COLUMN IF NOT EXISTS "manual_instructions_enabled" BOOLEAN NOT NULL DEFAULT TRUE`);
    await queryRunner.query(`ALTER TABLE "payment_providers" ADD COLUMN IF NOT EXISTS "manual_proof_required" BOOLEAN NOT NULL DEFAULT FALSE`);

    // ─── 7. users — add collector_float_balance ───────────────────────────────
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "collector_float_balance" DECIMAL(12,2) NOT NULL DEFAULT 0`);

    // ─── 8. collector_float_ledger table (new) ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "collector_float_ledger" (
        "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
        "collector_id"   UUID NOT NULL,
        "job_id"         UUID NULL,
        "type"           "collector_float_ledger_type_enum" NOT NULL,
        "amount"         DECIMAL(12,2) NOT NULL,
        "balance_before" DECIMAL(12,2) NOT NULL,
        "balance_after"  DECIMAL(12,2) NOT NULL,
        "created_by"     UUID NULL,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_collector_float_ledger" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_float_ledger_collector" ON "collector_float_ledger" ("collector_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_float_ledger_job" ON "collector_float_ledger" ("job_id") WHERE "job_id" IS NOT NULL`);

    // ─── 9. system_config seed rows ───────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "system_config" ("key", "value", "category", "description")
      VALUES
        ('payments.cash_enabled',        'true',            'payment', 'Allow cash payment method (collector collects at pickup)')
      ON CONFLICT ("key") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "system_config" ("key", "value", "category", "description")
      VALUES
        ('marketer.payout_mode',         'MANUAL_APPROVAL', 'payout',   'Marketer commission payout mode: MANUAL_APPROVAL or AUTO_PROVIDER_PAYOUT')
      ON CONFLICT ("key") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "system_config" ("key", "value", "category", "is_feature_flag", "description")
      VALUES
        ('feature.marketer_auto_payout', 'false',           'feature', true, 'Feature flag: enable automatic marketer payout via provider')
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── seed rows ───────────────────────────────────────────────────────────
    await queryRunner.query(`DELETE FROM "system_config" WHERE "key" IN ('payments.cash_enabled','marketer.payout_mode','feature.marketer_auto_payout')`);

    // ─── collector_float_ledger ───────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_float_ledger_job"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_float_ledger_collector"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "collector_float_ledger"`);

    // ─── users ───────────────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "collector_float_balance"`);

    // ─── payment_providers ────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "payment_providers" DROP COLUMN IF EXISTS "manual_proof_required"`);
    await queryRunner.query(`ALTER TABLE "payment_providers" DROP COLUMN IF EXISTS "manual_instructions_enabled"`);
    await queryRunner.query(`ALTER TABLE "payment_providers" DROP COLUMN IF EXISTS "integration_enabled"`);
    await queryRunner.query(`ALTER TABLE "payment_providers" DROP COLUMN IF EXISTS "manual_instructions"`);

    // ─── jobs ────────────────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "provider_transaction_id"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "payment_phone"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "payment_proof_url"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "payment_mode"`);

    // Note: PostgreSQL does not support removing enum values; enum changes require manual intervention on rollback.
    await queryRunner.query(`DROP TYPE IF EXISTS "collector_float_ledger_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "jobs_payment_mode_enum"`);
  }
}
