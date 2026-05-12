import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentConfig1778456587000 implements MigrationInterface {
  name = 'AddPaymentConfig1778456587000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert payment gateway configuration defaults
    await queryRunner.query(`
      INSERT INTO "system_config" ("key", "value", "description", "category", "is_public")
      VALUES 
        ('payment.gateway_url', 'http://127.0.0.1:8081', 'Base URL for payment gateway API', 'payment', false),
        ('payment.callback_base_url', 'http://localhost:3000', 'Base URL for payment callbacks (must be publicly accessible)', 'payment', false),
        ('payment.country_code', 'cmr', 'Country code for payment providers (e.g. cmr for Cameroon)', 'payment', true),
        ('payment.pending_timeout_minutes', '15', 'Minutes before pending payment transactions auto-fail', 'payment', false),
        ('payment.poll_interval_seconds', '30', 'Seconds between polling pending transactions', 'payment', false)
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove payment config entries
    await queryRunner.query(`
      DELETE FROM "system_config" 
      WHERE "key" IN (
        'payment.gateway_url',
        'payment.callback_base_url', 
        'payment.country_code',
        'payment.pending_timeout_minutes',
        'payment.poll_interval_seconds'
      )
    `);
  }
}
