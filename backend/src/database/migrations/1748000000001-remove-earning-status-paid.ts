import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveEarningStatusPaid1748000000001 implements MigrationInterface {
  name = 'RemoveEarningStatusPaid1748000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Update any existing PAID earnings to CONFIRMED
    await queryRunner.query(`
      UPDATE "earnings" 
      SET "status" = 'CONFIRMED', "confirmed_at" = "paid_at" 
      WHERE "status" = 'PAID'
    `);

    // Step 2: PostgreSQL doesn't support removing enum values directly.
    // We need to create a new enum, migrate the column, drop the old one.
    await queryRunner.query(`
      CREATE TYPE "public"."earnings_status_enum_new" AS ENUM('PENDING', 'CONFIRMED')
    `);

    // Step 3: Alter column to use new enum type
    await queryRunner.query(`
      ALTER TABLE "earnings" 
      ALTER COLUMN "status" DROP DEFAULT,
      ALTER COLUMN "status" TYPE "public"."earnings_status_enum_new" 
      USING "status"::text::"public"."earnings_status_enum_new",
      ALTER COLUMN "status" SET DEFAULT 'PENDING'
    `);

    // Step 4: Drop old enum and rename new one
    await queryRunner.query(`DROP TYPE "public"."earnings_status_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."earnings_status_enum_new" RENAME TO "earnings_status_enum"`);

    // Step 5: Drop the paid_at column (no longer needed)
    await queryRunner.query(`ALTER TABLE "earnings" DROP COLUMN IF EXISTS "paid_at"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse the migration
    await queryRunner.query(`
      CREATE TYPE "public"."earnings_status_enum_old" AS ENUM('PENDING', 'CONFIRMED', 'PAID')
    `);

    await queryRunner.query(`
      ALTER TABLE "earnings" 
      ADD COLUMN "paid_at" timestamptz NULL,
      ALTER COLUMN "status" DROP DEFAULT,
      ALTER COLUMN "status" TYPE "public"."earnings_status_enum_old" 
      USING "status"::text::"public"."earnings_status_enum_old",
      ALTER COLUMN "status" SET DEFAULT 'PENDING'
    `);

    await queryRunner.query(`DROP TYPE "public"."earnings_status_enum"`);
    await queryRunner.query(`ALTER TYPE "public"."earnings_status_enum_old" RENAME TO "earnings_status_enum"`);
  }
}
