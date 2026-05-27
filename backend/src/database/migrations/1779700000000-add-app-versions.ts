import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppVersions1779700000000 implements MigrationInterface {
  name = 'AddAppVersions1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."app_versions_platform_enum" AS ENUM ('ANDROID', 'IOS', 'ALL')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."app_versions_app_type_enum" AS ENUM ('HOUSEHOLD', 'COLLECTOR', 'MARKETER', 'ALL')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."app_versions_update_type_enum" AS ENUM ('OPTIONAL', 'FORCE')
    `);
    await queryRunner.query(`
      CREATE TABLE "app_versions" (
        "id"                  SERIAL PRIMARY KEY,
        "platform"            "public"."app_versions_platform_enum"    NOT NULL DEFAULT 'ALL',
        "app_type"            "public"."app_versions_app_type_enum"    NOT NULL DEFAULT 'ALL',
        "version_name"        VARCHAR(20)                               NOT NULL,
        "build_number"        INTEGER                                   NOT NULL,
        "min_supported_build" INTEGER                                   NOT NULL,
        "latest_build"        INTEGER                                   NOT NULL,
        "update_type"         "public"."app_versions_update_type_enum" NOT NULL DEFAULT 'OPTIONAL',
        "title"               VARCHAR(200)                              NOT NULL,
        "message"             TEXT                                      NOT NULL,
        "store_url"           TEXT,
        "release_notes"       TEXT,
        "is_active"           BOOLEAN                                   NOT NULL DEFAULT FALSE,
        "published_at"        TIMESTAMPTZ,
        "created_at"          TIMESTAMPTZ                               NOT NULL DEFAULT NOW(),
        "updated_at"          TIMESTAMPTZ                               NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "app_versions"`);
    await queryRunner.query(`DROP TYPE "public"."app_versions_update_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."app_versions_app_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."app_versions_platform_enum"`);
  }
}
