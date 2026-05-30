import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPaymentMethods1779100000000 implements MigrationInterface {
  name = 'AddUserPaymentMethods1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create usage_type enum
    await queryRunner.query(`
      CREATE TYPE "user_payment_methods_usage_type_enum" AS ENUM ('CASHIN', 'CASHOUT', 'BOTH')
    `);

    // 2. Create user_payment_methods table
    await queryRunner.query(`
      CREATE TABLE "user_payment_methods" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "payment_code" varchar(20) NOT NULL,
        "account_number" varchar(100) NOT NULL,
        "account_name" varchar(100),
        "usage_type" "user_payment_methods_usage_type_enum" NOT NULL DEFAULT 'BOTH',
        "is_default" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        "deleted_at" timestamptz,

        CONSTRAINT "FK_user_payment_methods_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 3. Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_user_payment_methods_user_id" ON "user_payment_methods"("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_payment_methods_user_payment_code" ON "user_payment_methods"("user_id", "payment_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_payment_methods_user_default" ON "user_payment_methods"("user_id", "is_default") WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_payment_methods_user_default"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_payment_methods_user_payment_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_payment_methods_user_id"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "user_payment_methods"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE "user_payment_methods_usage_type_enum"`);
  }
}
