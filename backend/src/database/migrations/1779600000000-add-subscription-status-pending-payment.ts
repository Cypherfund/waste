import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionStatusPendingPayment1779600000000 implements MigrationInterface {
  name = 'AddSubscriptionStatusPendingPayment1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."user_subscriptions_status_enum" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT'`);
    await queryRunner.query(`ALTER TYPE "public"."user_subscriptions_status_enum" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres does not support removing enum values directly.
    // To rollback: recreate the enum without the added values and alter the column.
    await queryRunner.query(`
      ALTER TABLE "user_subscriptions"
        ALTER COLUMN "status" TYPE varchar(50)
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_subscriptions_status_enum"`);
    await queryRunner.query(`CREATE TYPE "public"."user_subscriptions_status_enum" AS ENUM('ACTIVE', 'EXPIRED', 'CANCELLED')`);
    await queryRunner.query(`
      ALTER TABLE "user_subscriptions"
        ALTER COLUMN "status" TYPE "public"."user_subscriptions_status_enum"
        USING "status"::"public"."user_subscriptions_status_enum"
    `);
  }
}
