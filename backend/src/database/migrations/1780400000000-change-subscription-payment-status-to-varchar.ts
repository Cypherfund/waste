import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeSubscriptionPaymentStatusToVarchar1780400000000 implements MigrationInterface {
  name = 'ChangeSubscriptionPaymentStatusToVarchar1780400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_subscriptions 
      ALTER COLUMN payment_status TYPE varchar(30)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_subscriptions 
      ALTER COLUMN payment_status TYPE varchar(20)
    `);
  }
}
