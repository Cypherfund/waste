import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReconciliationConfig1781400000000 implements MigrationInterface {
  name = 'AddReconciliationConfig1781400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "system_config" (id, key, value, data_type, category, description, is_feature_flag, updated_by, updated_at)
      VALUES
        (uuid_generate_v4(), 'reconciliation.enabled', 'true', 'boolean', 'reconciliation', 'Enable automated daily reconciliation', true, NULL, NOW()),
        (uuid_generate_v4(), 'reconciliation.business_timezone', 'Africa/Douala', 'string', 'reconciliation', 'Business timezone for reconciliation scheduling (e.g., Africa/Douala, Africa/Nairobi)', false, NULL, NOW()),
        (uuid_generate_v4(), 'reconciliation.run_time', '00:15', 'string', 'reconciliation', 'Daily reconciliation run time in HH:mm format (business timezone)', false, NULL, NOW()),
        (uuid_generate_v4(), 'reconciliation.retry_attempts', '3', 'number', 'reconciliation', 'Number of retry attempts for failed reconciliation runs', false, NULL, NOW()),
        (uuid_generate_v4(), 'reconciliation.retry_delay_minutes', '5', 'number', 'reconciliation', 'Delay between retry attempts in minutes', false, NULL, NOW()),
        (uuid_generate_v4(), 'reconciliation.alert_on_success', 'false', 'boolean', 'reconciliation', 'Send admin notification on successful reconciliation (no issues)', false, NULL, NOW()),
        (uuid_generate_v4(), 'reconciliation.alert_on_unreconciled', 'true', 'boolean', 'reconciliation', 'Send admin notification when unreconciled items are found', false, NULL, NOW()),
        (uuid_generate_v4(), 'reconciliation.alert_on_failure', 'true', 'boolean', 'reconciliation', 'Send admin notification when reconciliation fails', false, NULL, NOW())
      ON CONFLICT (key) DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "system_config" WHERE key LIKE 'reconciliation.%'`);
  }
}
