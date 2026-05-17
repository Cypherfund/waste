import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentPendingToJobStatusEnum1778700000000 implements MigrationInterface {
  name = 'AddPaymentPendingToJobStatusEnum1778700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`SELECT 1 FROM pg_enum WHERE enumlabel='PAYMENT_PENDING' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='jobs_status_enum')`);
    if (exists.length > 0) { console.log('Job status enum migration: already applied, skipping.'); return; }

    // Add PAYMENT_PENDING to the jobs_status_enum
    await queryRunner.query(`
      ALTER TYPE "jobs_status_enum" ADD VALUE 'PAYMENT_PENDING';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL doesn't support removing enum values directly
    // To properly downgrade, we would need to:
    // 1. Create a new enum without the value
    // 2. Update columns to use the new enum
    // 3. Drop the old enum
    // This is a complex operation that's rarely done in production
    // For now, we'll leave this as a no-op with a warning
    console.warn(
      'Downgrade not implemented: PostgreSQL does not support removing enum values directly. ' +
      'Manual intervention required to remove PAYMENT_PENDING from jobs_status_enum.'
    );
  }
}
