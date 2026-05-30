import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReconciliationRuns1781300000000 implements MigrationInterface {
  name = 'AddReconciliationRuns1781300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "reconciliation_run_status_enum" AS ENUM (
        'RUNNING',
        'SUCCESS',
        'SUCCESS_WITH_WARNINGS',
        'FAILED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "reconciliation_run_trigger_enum" AS ENUM (
        'SCHEDULED',
        'MANUAL'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "reconciliation_runs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "reconciliation_date" date NOT NULL,
        "status" "reconciliation_run_status_enum" NOT NULL,
        "summary_id" uuid,
        "unreconciled_count" integer DEFAULT 0,
        "error_message" text,
        "started_at" timestamptz NOT NULL DEFAULT now(),
        "finished_at" timestamptz,
        "attempt_count" integer DEFAULT 1,
        "triggered_by" "reconciliation_run_trigger_enum" NOT NULL DEFAULT 'SCHEDULED',
        "triggered_by_admin_id" uuid,
        CONSTRAINT "FK_reconciliation_run_summary" FOREIGN KEY ("summary_id") REFERENCES "reconciliation_summaries"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_reconciliation_run_admin" FOREIGN KEY ("triggered_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_reconciliation_run_date" UNIQUE ("reconciliation_date")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_reconciliation_runs_date" ON "reconciliation_runs"("reconciliation_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_reconciliation_runs_status" ON "reconciliation_runs"("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_reconciliation_runs_started_at" ON "reconciliation_runs"("started_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reconciliation_runs_started_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reconciliation_runs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reconciliation_runs_date"`);
    await queryRunner.query(`DROP TABLE "reconciliation_runs"`);
    await queryRunner.query(`DROP TYPE "reconciliation_run_trigger_enum"`);
    await queryRunner.query(`DROP TYPE "reconciliation_run_status_enum"`);
  }
}
