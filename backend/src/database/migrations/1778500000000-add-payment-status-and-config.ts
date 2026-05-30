import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentStatusAndConfig1778500000000 implements MigrationInterface {
  name = 'AddPaymentStatusAndConfig1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='payment_status'`,
    );
    if (exists.length > 0) {
      console.log('Payment status migration: already applied, skipping.');
      return;
    }

    // ── Add payment_status column to jobs table ──────────────────────
    await queryRunner.query(`
      ALTER TABLE "jobs" 
      ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_payment_status" ON "jobs" ("payment_status")
    `);

    // ── Insert missing pricing configuration values ──────────────────
    const configValues = [
      {
        key: 'pricing.weeks_per_month',
        value: '4',
        description: 'Average weeks per month for pricing calculations',
      },
      { key: 'pricing.per_pickup_price', value: '500', description: 'Price per individual pickup' },
      {
        key: 'pricing.subscription_pickups_per_week',
        value: '3',
        description: 'Number of pickups included per week in subscription',
      },
      {
        key: 'pricing.standard_plan_price',
        value: '5000',
        description: 'Monthly price for standard subscription plan',
      },
      {
        key: 'pricing.premium_plan_price',
        value: '10000',
        description: 'Monthly price for premium subscription plan',
      },
    ];

    for (const config of configValues) {
      // Check if config exists first
      const existing = await queryRunner.query(`SELECT 1 FROM "system_config" WHERE "key" = $1`, [
        config.key,
      ]);

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO "system_config" ("id", "key", "value", "data_type", "category", "description", "is_feature_flag", "updated_at") 
           VALUES (uuid_generate_v4(), $1, $2, 'number', 'pricing', $3, false, NOW())`,
          [config.key, config.value, config.description],
        );
      }
    }

    // ── Backfill existing jobs with appropriate payment_status ──────
    // Jobs with is_covered_by_subscription = true should be NOT_REQUIRED
    // Jobs with pricing_type = 'PAY_PER_PICKUP' and no payment should be PENDING
    await queryRunner.query(`
      UPDATE "jobs" 
      SET "payment_status" = 'NOT_REQUIRED'
      WHERE "is_covered_by_subscription" = true 
         OR "pricing_type" = 'SUBSCRIPTION'
    `);

    // Update remaining jobs to PENDING if they require payment
    await queryRunner.query(`
      UPDATE "jobs" 
      SET "payment_status" = 'PENDING'
      WHERE "payment_status" = 'NOT_REQUIRED'
        AND "is_covered_by_subscription" = false
        AND "pricing_type" = 'PAY_PER_PICKUP'
        AND "status" NOT IN ('CANCELLED', 'VALIDATED', 'COMPLETED')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the config values we added
    const keysToRemove = [
      'pricing.weeks_per_month',
      'pricing.per_pickup_price',
      'pricing.subscription_pickups_per_week',
      'pricing.standard_plan_price',
      'pricing.premium_plan_price',
    ];

    for (const key of keysToRemove) {
      await queryRunner.query(`DELETE FROM "system_config" WHERE "key" = $1`, [key]);
    }

    // Drop the payment_status column
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_payment_status"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "payment_status"`);
  }
}
