import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAppVersion1783000000000 implements MigrationInterface {
  name = 'SeedAppVersion1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "app_versions" (
        "platform",
        "app_type",
        "version_name",
        "build_number",
        "min_supported_build",
        "latest_build",
        "update_type",
        "title",
        "message",
        "release_notes",
        "is_active",
        "published_at"
      ) VALUES (
        'ANDROID',
        'ALL',
        '1.0.1',
        8,
        1,
        8,
        'OPTIONAL',
        'OTP Verification & WhatsApp Support',
        'This update adds secure OTP verification for phone authentication and WhatsApp as an alternative messaging channel.',
        'feat: OTP verification with SMS/WhatsApp, secure phone authentication, admin OTP support dashboard',
        true,
        NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "app_versions" WHERE "version_name" = '1.0.1' AND "build_number" = 8
    `);
  }
}
