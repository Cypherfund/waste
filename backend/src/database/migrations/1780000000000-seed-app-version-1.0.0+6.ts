import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAppVersion1780000000000 implements MigrationInterface {
  name = 'SeedAppVersion1780000000000';

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
        6,
        1,
        6,
        'OPTIONAL',
        'API Endpoint Update',
        'This update switches to the new api.kmertrash.com endpoint with improved API timeout handling.',
        'feat: switch to api.kmertrash.com endpoint, increase API timeout to 30s',
        true,
        NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "app_versions" WHERE "version_name" = '1.0.0' AND "build_number" = 6
    `);
  }
}
