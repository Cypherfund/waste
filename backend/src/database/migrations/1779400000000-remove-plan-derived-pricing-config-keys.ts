import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePlanDerivedPricingConfigKeys1779400000000 implements MigrationInterface {
  name = 'RemovePlanDerivedPricingConfigKeys1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // These values come from subscription_plans (price, pickups_per_week) — not from system_config
    await queryRunner.query(`
      DELETE FROM "system_config"
      WHERE key IN (
        'pricing.subscription_price',
        'pricing.subscription_pickups_per_week',
        'pricing.subscription_pickups',
        'pricing.standard_plan_price',
        'pricing.premium_plan_price'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-insert defaults so a rollback doesn't break older code that still reads these keys
    const rows = [
      {
        key: 'pricing.subscription_price',
        value: '3500',
        description: 'Monthly subscription price (XAF) — superseded by subscription_plans.price',
      },
      {
        key: 'pricing.subscription_pickups_per_week',
        value: '2',
        description: 'Pickups per week — superseded by subscription_plans.pickups_per_week',
      },
      {
        key: 'pricing.standard_plan_price',
        value: '5000',
        description: 'Standard plan price (XAF) — superseded by subscription_plans',
      },
      {
        key: 'pricing.premium_plan_price',
        value: '10000',
        description: 'Premium plan price (XAF) — superseded by subscription_plans',
      },
    ];

    for (const row of rows) {
      await queryRunner.query(
        `INSERT INTO "system_config" ("id", "key", "value", "data_type", "category", "description", "is_feature_flag", "updated_at")
         VALUES (uuid_generate_v4(), $1, $2, 'number', 'pricing', $3, false, NOW())
         ON CONFLICT (key) DO NOTHING`,
        [row.key, row.value, row.description],
      );
    }
  }
}
