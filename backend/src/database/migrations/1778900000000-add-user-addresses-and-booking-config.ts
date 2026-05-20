import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAddressesAndBookingConfig1778900000000 implements MigrationInterface {
  name = 'AddUserAddressesAndBookingConfig1778900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_addresses'`);
    if (exists.length > 0) { console.log('User addresses migration: already applied, skipping.'); return; }

    // ── user_addresses table ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_addresses" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"     uuid NOT NULL,
        "label"       character varying(100) NOT NULL,
        "address"     character varying(500) NOT NULL,
        "landmark"    character varying(300) NULL,
        "lat"         numeric(10,8) NULL,
        "lng"         numeric(11,8) NULL,
        "is_default"  boolean NOT NULL DEFAULT false,
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_addresses" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_addresses_user_id" ON "user_addresses" ("user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "user_addresses"
      ADD CONSTRAINT "FK_user_addresses_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ── system_config seed rows ───────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "system_config" (id, key, value, data_type, category, description, is_feature_flag, updated_by, updated_at)
      VALUES
        (
          uuid_generate_v4(),
          'booking.min_advance_hours',
          '24',
          'number',
          'booking',
          'Minimum hours in advance that a pickup must be booked before the scheduled time',
          false,
          NULL,
          NOW()
        ),
        (
          uuid_generate_v4(),
          'booking.max_advance_days',
          '30',
          'number',
          'booking',
          'Maximum days ahead a pickup can be scheduled',
          false,
          NULL,
          NOW()
        ),
        (
          uuid_generate_v4(),
          'pricing.weeks_per_month',
          '4',
          'number',
          'pricing',
          'Number of weeks per month used for subscription savings calculations',
          false,
          NULL,
          NOW()
        )
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove system_config seed rows
    await queryRunner.query(`
      DELETE FROM "system_config"
      WHERE key IN ('booking.min_advance_hours', 'booking.max_advance_days', 'pricing.weeks_per_month')
    `);

    // Drop user_addresses table
    await queryRunner.query(`
      ALTER TABLE "user_addresses" DROP CONSTRAINT IF EXISTS "FK_user_addresses_user"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_addresses_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_addresses"`);
  }
}
