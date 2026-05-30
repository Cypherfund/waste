import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashOnFirstPickupFields1780900000000 implements MigrationInterface {
  name = 'AddCashOnFirstPickupFields1780900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CASH_ON_FIRST_PICKUP to jobs_payment_mode_enum
    await queryRunner.query(`
      ALTER TYPE "jobs_payment_mode_enum" 
      ADD VALUE IF NOT EXISTS 'CASH_ON_FIRST_PICKUP'
    `);

    // Add linked_first_job_id to user_subscriptions
    await queryRunner.query(`
      ALTER TABLE "user_subscriptions"
      ADD COLUMN "linked_first_job_id" uuid NULL
    `);

    // Add foreign key constraint for linked_first_job_id
    await queryRunner.query(`
      ALTER TABLE "user_subscriptions"
      ADD CONSTRAINT "FK_user_subscriptions_linked_first_job" 
      FOREIGN KEY ("linked_first_job_id") REFERENCES "jobs"(id) ON DELETE SET NULL
    `);

    // Add subscription_id to jobs
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN "subscription_id" uuid NULL
    `);

    // Add foreign key constraint for subscription_id
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD CONSTRAINT "FK_jobs_subscription" 
      FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"(id) ON DELETE SET NULL
    `);

    // Add cash_to_collect_amount to jobs
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN "cash_to_collect_amount" decimal(10, 2) NULL
    `);

    // Add cash_collection_type to jobs
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN "cash_collection_type" varchar(50) NULL
    `);

    // Add index for subscription_id on jobs for faster lookups
    await queryRunner.query(`
      CREATE INDEX "idx_jobs_subscription_id" ON "jobs"("subscription_id")
    `);

    // Add index for linked_first_job_id on user_subscriptions
    await queryRunner.query(`
      CREATE INDEX "idx_user_subscriptions_linked_first_job_id" ON "user_subscriptions"("linked_first_job_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_jobs_subscription_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_subscriptions_linked_first_job_id"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "cash_collection_type"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "cash_to_collect_amount"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_jobs_subscription"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "subscription_id"`);
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP CONSTRAINT "FK_user_subscriptions_linked_first_job"`,
    );
    await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP COLUMN "linked_first_job_id"`);

    // Note: PostgreSQL doesn't support removing enum values directly
    // To rollback CASH_ON_FIRST_PICKUP from jobs_payment_mode_enum, you would need to recreate the enum
    // This is typically not done in production
  }
}
