import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairStuckRejectedProviderJobs1786000000000 implements MigrationInterface {
  name = 'RepairStuckRejectedProviderJobs1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "jobs"
      SET "status" = 'PAYMENT_FAILED',
          "updated_at" = NOW()
      WHERE "status" = 'PAYMENT_PENDING'
        AND "payment_status" IN ('REJECTED', 'FAILED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data repair only. Do not restore stale PAYMENT_PENDING rows on rollback.
  }
}
