import { MigrationInterface, QueryRunner } from 'typeorm';

export class IncreaseScheduledTimeLength1780100000000 implements MigrationInterface {
  name = 'IncreaseScheduledTimeLength1780100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" 
      ALTER COLUMN "scheduled_time" TYPE varchar(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" 
      ALTER COLUMN "scheduled_time" TYPE varchar(20)
    `);
  }
}
