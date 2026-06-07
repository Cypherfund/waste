import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpTable1787000000000 implements MigrationInterface {
  name = 'AddOtpTable1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "otps" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "phone" varchar(20) NOT NULL,
        "code" varchar(10) NOT NULL,
        "expires_at" timestamp NOT NULL,
        "verified" boolean DEFAULT false NOT NULL,
        "verified_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_otps_phone" ON "otps"("phone")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_otps_expires_at" ON "otps"("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_otps_expires_at"`);
    await queryRunner.query(`DROP INDEX "idx_otps_phone"`);
    await queryRunner.query(`DROP TABLE "otps"`);
  }
}
