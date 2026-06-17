import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairStuckRejectedProviderJobs1786000000000 implements MigrationInterface {
  name = 'RepairStuckRejectedProviderJobs1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isEnumAddedInTransaction = await queryRunner.query(`
      SELECT 1
      FROM pg_enum e
      INNER JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'jobs_status_enum'
        AND e.enumlabel = 'PAYMENT_FAILED'
        AND e.xmin::text = txid_current()::text
      LIMIT 1
    `);

    if (isEnumAddedInTransaction.length > 0) return;

    await queryRunner.query(`
      UPDATE "jobs"
      SET "status" = 'PAYMENT_FAILED'::text::"jobs_status_enum",
          "updated_at" = NOW()
      WHERE "status"::text = 'PAYMENT_PENDING'
        AND "payment_status" IN ('REJECTED', 'FAILED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data repair only. Do not restore stale PAYMENT_PENDING rows on rollback.
  }
}
