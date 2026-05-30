import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportPhoneEmailConfig1782000000000 implements MigrationInterface {
  name = 'AddSupportPhoneEmailConfig1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "system_config" (id, key, value, data_type, category, description, is_feature_flag, updated_by, updated_at)
      VALUES 
        (uuid_generate_v4(), 'support.phone_number', '+237670000000', 'string', 'support', 'Support phone number', false, uuid_generate_v4(), NOW()),
        (uuid_generate_v4(), 'support.email', 'support@kmertrash.com', 'string', 'support', 'Support email address', false, uuid_generate_v4(), NOW())
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "system_config" WHERE key IN ('support.phone_number', 'support.email')
    `);
  }
}
