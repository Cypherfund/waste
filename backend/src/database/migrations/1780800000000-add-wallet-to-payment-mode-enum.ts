import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletToPaymentModeEnum1780800000000 implements MigrationInterface {
  name = 'AddWalletToPaymentModeEnum1780800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add WALLET to the jobs_payment_mode_enum
    await queryRunner.query(`
      ALTER TYPE "jobs_payment_mode_enum" 
      ADD VALUE IF NOT EXISTS 'WALLET'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // To rollback, you would need to recreate the enum without WALLET
    // This is typically not done in production
  }
}
