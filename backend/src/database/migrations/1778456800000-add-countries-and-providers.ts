import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountriesAndProviders1778456800000 implements MigrationInterface {
  name = 'AddCountriesAndProviders1778456800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='supported_countries'`,
    );
    if (exists.length > 0) {
      console.log('Countries migration: already applied, skipping.');
      return;
    }

    // ── supported_countries ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "supported_countries" (
        "id"           SERIAL PRIMARY KEY,
        "country_code" VARCHAR(10) NOT NULL,
        "country_name" VARCHAR(100) NOT NULL,
        "phone_prefix" VARCHAR(5) NOT NULL,
        "flag_emoji"   VARCHAR(10) NULL,
        "currency"     VARCHAR(3) NOT NULL,
        "is_active"    BOOLEAN NOT NULL DEFAULT true,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_supported_countries_code" UNIQUE ("country_code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_supported_countries_code" ON "supported_countries" ("country_code")
    `);

    // ── Seed initial countries (only Cameroon active at launch) ──
    await queryRunner.query(`
      INSERT INTO "supported_countries"
        ("country_code", "country_name", "phone_prefix", "flag_emoji", "currency", "is_active")
      VALUES
        ('cmr', 'Cameroon',     '+237', '🇨🇲', 'XAF', true),
        ('ken', 'Kenya',        '+254', '🇰🇪', 'KES', false),
        ('nga', 'Nigeria',      '+234', '🇳🇬', 'NGN', false),
        ('gha', 'Ghana',        '+233', '🇬🇭', 'GHS', false),
        ('civ', 'Ivory Coast',  '+225', '🇨🇮', 'XOF', false)
    `);

    // ── payment_providers ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "payment_providers" (
        "id"                        SERIAL PRIMARY KEY,
        "payment_code"              VARCHAR(20) NOT NULL,
        "country_code"              VARCHAR(10) NOT NULL,
        "provider_name"             VARCHAR(100) NOT NULL,
        "currency"                  VARCHAR(3) NOT NULL,
        "min_deposit"               DECIMAL(12,2) NULL,
        "max_deposit"               DECIMAL(12,2) NULL,
        "min_withdrawal"            DECIMAL(12,2) NULL,
        "max_withdrawal"            DECIMAL(12,2) NULL,
        "supports_cashin"           BOOLEAN NOT NULL DEFAULT true,
        "supports_cashout"          BOOLEAN NOT NULL DEFAULT false,
        "image_url"                 TEXT NULL,
        "is_global"                 BOOLEAN NOT NULL DEFAULT false,
        "is_enabled"                BOOLEAN NOT NULL DEFAULT true,
        "manual_instructions"       TEXT NULL,
        "integration_enabled"       BOOLEAN NOT NULL DEFAULT false,
        "manual_instructions_enabled" BOOLEAN NOT NULL DEFAULT true,
        "manual_proof_required"     BOOLEAN NOT NULL DEFAULT false,
        "synced_at"                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "UQ_payment_providers_code_country" UNIQUE ("payment_code", "country_code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_providers_country" ON "payment_providers" ("country_code")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_providers_enabled" ON "payment_providers" ("is_enabled")
    `);

    // ── updated_at trigger for payment_providers ─────────────────
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_payment_providers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_payment_providers_updated_at
      BEFORE UPDATE ON "payment_providers"
      FOR EACH ROW EXECUTE FUNCTION update_payment_providers_updated_at()
    `);

    // ── Add country_code to users ────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "country_code" VARCHAR(10) NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_country_code" ON "users" ("country_code")
    `);

    // ── Back-fill existing users to Cameroon (only country at launch) ─
    await queryRunner.query(`
      UPDATE "users" SET "country_code" = 'cmr' WHERE "country_code" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_country_code"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "country_code"`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_payment_providers_updated_at ON "payment_providers"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_payment_providers_updated_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_providers_enabled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_providers_country"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_providers"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_supported_countries_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "supported_countries"`);
  }
}
