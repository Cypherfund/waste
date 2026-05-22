import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPaymentProviders1779000000002 implements MigrationInterface {
  name = 'SeedPaymentProviders1779000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if providers already exist
    const existing = await queryRunner.query(`
      SELECT COUNT(*) as count FROM "payment_providers" WHERE "country_code" = 'cmr'
    `);
    if (existing[0].count > 0) {
      console.log('Payment providers already seeded, skipping.');
      return;
    }

    // Seed payment providers for Cameroon
    await queryRunner.query(`
      INSERT INTO "payment_providers"
        ("payment_code", "country_code", "provider_name", "currency", "min_deposit", "max_deposit", "min_withdrawal", "max_withdrawal", "supports_cashin", "supports_cashout", "image_url", "is_global", "is_enabled", "manual_payment_phone", "manual_payment_account_name", "manual_instructions", "integration_enabled", "manual_instructions_enabled", "manual_proof_required")
      VALUES
        ('105', 'cmr', 'MTN Mobile Money', 'XAF', 1.00, 10000.00, 100.00, 50000.00, true, true, 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/mtn-mobile-logo-icon.png', false, true, '+237650931636', 'Ngai Elizabeth', 'Please transfer to the MTN Mobile Money number provided. Include your phone number in the reference.', false, true, false),
        ('83', 'cmr', 'Orange Money', 'XAF', NULL, NULL, NULL, NULL, true, true, 'https://images.seeklogo.com/logo-png/44/1/orange-money-logo-png_seeklogo-440383.png', false, true, '+237650931636', 'Ngai Elizabeth', 'Please transfer to the Orange Money number provided. Include your phone number in the reference.', false, true, false)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "payment_providers" WHERE "country_code" = 'cmr' AND "payment_code" IN ('105', '83')
    `);
  }
}
