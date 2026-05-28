import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangePaymentStatusToVarchar1780300000000 implements MigrationInterface {
  name = 'ChangePaymentStatusToVarchar1780300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" 
      ALTER COLUMN "payment_status" TYPE varchar(30)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" 
      ALTER COLUMN "payment_status" TYPE varchar(20)
    `);
  }
}
