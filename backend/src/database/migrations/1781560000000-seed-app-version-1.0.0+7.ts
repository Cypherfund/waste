import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAppVersion1781560000000 implements MigrationInterface {
  name = 'SeedAppVersion1781560000000';

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
        7,
        1,
        7,
        'FORCE',
        'API Endpoint Update',
        'KmerTrash Pre Launch Version',
        'feat: Pre Launch Test',
        true,
        NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "app_versions" WHERE "version_name" = '1.0.0' AND "build_number" = 7
    `);
  }
}
