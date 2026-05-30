import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePaymentPhoneNullable1781000000000 implements MigrationInterface {
  name = 'MakePaymentPhoneNullable1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make phone column nullable in payment_transactions
    // Wallet payments don't have an associated phone number
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ALTER COLUMN "phone" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_transactions"
      ALTER COLUMN "phone" SET NOT NULL
    `);
  }
}
