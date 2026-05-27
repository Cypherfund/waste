import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreasePaymentPhoneLength1780200000000 implements MigrationInterface {
  name = 'IncreasePaymentPhoneLength1780200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" 
      ALTER COLUMN "payment_phone" TYPE varchar(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" 
      ALTER COLUMN "payment_phone" TYPE varchar(20)
    `);
  }
}
