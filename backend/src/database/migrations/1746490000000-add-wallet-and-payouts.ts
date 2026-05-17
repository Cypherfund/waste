import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWalletAndPayouts1746490000000 implements MigrationInterface {
  name = 'AddWalletAndPayouts1746490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payout_requests'`);
    if (exists.length > 0) { console.log('Wallet migration: already applied, skipping.'); return; }

    // ── wallet_balance on users ─────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "wallet_balance" numeric(12,2) NOT NULL DEFAULT 0
    `);

    // ── payout_requests ────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payout_requests_status_enum"
          AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payout_requests" (
        "id"              uuid NOT NULL DEFAULT uuid_generate_v4(),
        "collector_id"    uuid NOT NULL,
        "amount"          numeric(12,2) NOT NULL,
        "method"          character varying(50) NOT NULL,
        "account_number"  character varying(100),
        "account_name"    character varying(100),
        "status"          "public"."payout_requests_status_enum" NOT NULL DEFAULT 'PENDING',
        "admin_note"      text,
        "reviewed_by"     uuid,
        "reviewed_at"     TIMESTAMP WITH TIME ZONE,
        "paid_at"         TIMESTAMP WITH TIME ZONE,
        "created_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payout_requests" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payout_requests_collector_id"
      ON "payout_requests" ("collector_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payout_requests_status"
      ON "payout_requests" ("status")
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "payout_requests"
        ADD CONSTRAINT "FK_payout_requests_collector"
        FOREIGN KEY ("collector_id") REFERENCES "users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "payout_requests"
        ADD CONSTRAINT "FK_payout_requests_reviewed_by"
        FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    // ── config keys ────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "system_config" (id, key, value, data_type, category, description, is_feature_flag, updated_by, updated_at)
      VALUES
        (uuid_generate_v4(), 'payout.min_withdrawal',    '1000',  'number',  'payout', 'Minimum withdrawal amount (XAF)',             false, NULL, NOW()),
        (uuid_generate_v4(), 'payout.max_withdrawal',    '500000','number',  'payout', 'Maximum withdrawal amount (XAF)',             false, NULL, NOW()),
        (uuid_generate_v4(), 'payout.methods_enabled',   'MOBILE_MONEY,BANK_TRANSFER', 'string', 'payout', 'Comma-separated list of enabled payout methods', false, NULL, NOW()),
        (uuid_generate_v4(), 'payout.mobile_money_label','MTN Mobile Money / Orange Money', 'string', 'payout', 'Label shown for mobile money in collector app', false, NULL, NOW()),
        (uuid_generate_v4(), 'payout.bank_transfer_label','Bank Transfer',  'string',  'payout', 'Label shown for bank transfer in collector app',  false, NULL, NOW())
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "system_config" WHERE key LIKE 'payout.%'`);

    await queryRunner.query(`ALTER TABLE "payout_requests" DROP CONSTRAINT IF EXISTS "FK_payout_requests_reviewed_by"`);
    await queryRunner.query(`ALTER TABLE "payout_requests" DROP CONSTRAINT IF EXISTS "FK_payout_requests_collector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_payout_requests_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_payout_requests_collector_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_requests"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payout_requests_status_enum"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "wallet_balance"`);
  }
}
