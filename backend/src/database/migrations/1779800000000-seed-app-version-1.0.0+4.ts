import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAppVersion1779800000000 implements MigrationInterface {
  name = 'SeedAppVersion1779800000000';

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
        4,
        1,
        4,
        'OPTIONAL',
        'Notification Deep-Link Routing',
        'This update adds notification deep-link routing for payment, subscription, dispute, commission, and payout events. Users will now be routed to the correct screen when tapping notifications.',
        'feat: add notification deep-link routing for payment, subscription, dispute, commission, and payout events',
        true,
        NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "app_versions" WHERE "version_name" = '1.0.0' AND "build_number" = 4
    `);
  }
}
