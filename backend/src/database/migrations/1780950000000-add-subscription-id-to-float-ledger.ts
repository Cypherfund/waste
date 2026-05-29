import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionIdToFloatLedger1780950000000 implements MigrationInterface {
  name = 'AddSubscriptionIdToFloatLedger1780950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add subscription_id column to collector_float_ledger
    await queryRunner.query(`
      ALTER TABLE "collector_float_ledger"
      ADD COLUMN "subscription_id" uuid NULL
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "collector_float_ledger"
      ADD CONSTRAINT "FK_collector_float_ledger_subscription" 
      FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"(id) ON DELETE SET NULL
    `);

    // Add index for subscription_id
    await queryRunner.query(`
      CREATE INDEX "idx_collector_float_ledger_subscription_id" ON "collector_float_ledger"("subscription_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_collector_float_ledger_subscription_id"`);

    // Drop foreign key
    await queryRunner.query(`ALTER TABLE "collector_float_ledger" DROP CONSTRAINT "FK_collector_float_ledger_subscription"`);

    // Drop column
    await queryRunner.query(`ALTER TABLE "collector_float_ledger" DROP COLUMN "subscription_id"`);
  }
}
