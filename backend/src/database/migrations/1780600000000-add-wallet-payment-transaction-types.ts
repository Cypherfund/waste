import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletPaymentTransactionTypes1780600000000 implements MigrationInterface {
  name = 'AddWalletPaymentTransactionTypes1780600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if enum exists before adding values
    const enumExists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum'`,
    );

    if (enumExists.length > 0) {
      // Add new transaction types for wallet payments
      await queryRunner.query(`
        ALTER TYPE "transaction_type_enum"
        ADD VALUE IF NOT EXISTS 'JOB_PAYMENT'
      `);

      await queryRunner.query(`
        ALTER TYPE "transaction_type_enum"
        ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_PAYMENT'
      `);
    }

    const statusEnumExists = await queryRunner.query(
      `SELECT 1 FROM pg_type WHERE typname = 'transaction_status_enum'`,
    );

    if (statusEnumExists.length > 0) {
      // Add VERIFIED status for wallet payments
      await queryRunner.query(`
        ALTER TYPE "transaction_status_enum"
        ADD VALUE IF NOT EXISTS 'VERIFIED'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // To rollback, you would need to recreate the enum without these values
    // This is typically not done in production
  }
}
