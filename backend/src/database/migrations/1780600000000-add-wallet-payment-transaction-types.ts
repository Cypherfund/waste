import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletPaymentTransactionTypes1780600000000 implements MigrationInterface {
  name = 'AddWalletPaymentTransactionTypes1780600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new transaction types for wallet payments
    await queryRunner.query(`
      ALTER TYPE "transaction_type_enum" 
      ADD VALUE IF NOT EXISTS 'JOB_PAYMENT'
    `);

    await queryRunner.query(`
      ALTER TYPE "transaction_type_enum" 
      ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_PAYMENT'
    `);

    // Add VERIFIED status for wallet payments
    await queryRunner.query(`
      ALTER TYPE "transaction_status_enum" 
      ADD VALUE IF NOT EXISTS 'VERIFIED'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // To rollback, you would need to recreate the enum without these values
    // This is typically not done in production
  }
}
