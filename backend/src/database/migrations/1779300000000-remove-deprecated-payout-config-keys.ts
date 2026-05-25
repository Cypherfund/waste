import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDeprecatedPayoutConfigKeys1779300000000 implements MigrationInterface {
  name = 'RemoveDeprecatedPayoutConfigKeys1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "system_config"
      WHERE key IN (
        'payout.methods_enabled',
        'payout.mobile_money_label',
        'payout.bank_transfer_label'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "system_config" (id, key, value, data_type, category, description, is_feature_flag, updated_by, updated_at)
      VALUES
        (uuid_generate_v4(), 'payout.methods_enabled',    'MOBILE_MONEY,BANK_TRANSFER',          'string', 'payout', 'Comma-separated list of enabled payout methods',        false, NULL, NOW()),
        (uuid_generate_v4(), 'payout.mobile_money_label', 'MTN Mobile Money / Orange Money',      'string', 'payout', 'Label shown for mobile money in collector app',          false, NULL, NOW()),
        (uuid_generate_v4(), 'payout.bank_transfer_label','Bank Transfer',                        'string', 'payout', 'Label shown for bank transfer in collector app',         false, NULL, NOW())
      ON CONFLICT (key) DO NOTHING
    `);
  }
}
