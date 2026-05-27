import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAppVersion1779900000000 implements MigrationInterface {
  name = 'SeedAppVersion1779900000000';

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
        '1.0.0',
        5,
        1,
        5,
        'OPTIONAL',
        'Crashlytics Error Tracking',
        'This update adds Firebase Crashlytics for comprehensive error tracking and crash reporting, improving app stability and debugging capabilities.',
        'feat: add Firebase Crashlytics error tracking with user context, breadcrumbs, and non-fatal error logging',
        true,
        NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "app_versions" WHERE "version_name" = '1.0.0' AND "build_number" = 5
    `);
  }
}
