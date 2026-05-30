import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCashSubscriptionPlatformShareEnum1781100000000 implements MigrationInterface {
  name = 'AddCashSubscriptionPlatformShareEnum1781100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add CASH_SUBSCRIPTION_PLATFORM_SHARE to collector_float_ledger_type_enum
    await queryRunner.query(`
      ALTER TYPE "collector_float_ledger_type_enum"
      ADD VALUE IF NOT EXISTS 'CASH_SUBSCRIPTION_PLATFORM_SHARE'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot remove enum values in PostgreSQL, would need to recreate the type
    // This is a limitation of PostgreSQL
  }
}
