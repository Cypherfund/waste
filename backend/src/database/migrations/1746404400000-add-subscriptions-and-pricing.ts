import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubscriptionsAndPricing1746404400000 implements MigrationInterface {
    name = 'AddSubscriptionsAndPricing1746404400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const exists = await queryRunner.query(`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscription_plans'`);
        if (exists.length > 0) { console.log('Subscriptions migration: already applied, skipping.'); return; }

        // ─── subscription_plans ───────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "subscription_plans" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(100) NOT NULL,
                "price" numeric(10,2) NOT NULL,
                "currency" character varying(10) NOT NULL DEFAULT 'XAF',
                "pickups_per_week" integer NOT NULL,
                "is_active" boolean NOT NULL DEFAULT true,
                "description" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_subscription_plans" PRIMARY KEY ("id")
            )
        `);

        // ─── user_subscriptions ───────────────────────────────────────────
        await queryRunner.query(`
            CREATE TYPE "public"."user_subscriptions_status_enum"
            AS ENUM('ACTIVE', 'EXPIRED', 'CANCELLED')
        `);

        await queryRunner.query(`
            CREATE TABLE "user_subscriptions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "plan_id" uuid NOT NULL,
                "start_date" date NOT NULL,
                "end_date" date NOT NULL,
                "remaining_pickups_this_week" integer NOT NULL DEFAULT 0,
                "week_reset_date" date,
                "status" "public"."user_subscriptions_status_enum" NOT NULL DEFAULT 'ACTIVE',
                "cancelled_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_subscriptions" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_user_subscriptions_user_id"
            ON "user_subscriptions" ("user_id")
        `);

        await queryRunner.query(`
            ALTER TABLE "user_subscriptions"
            ADD CONSTRAINT "FK_user_subscriptions_user"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "user_subscriptions"
            ADD CONSTRAINT "FK_user_subscriptions_plan"
            FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id")
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

        // ─── jobs pricing columns ──────────────────────────────────────────
        await queryRunner.query(`
            CREATE TYPE "public"."jobs_pricing_type_enum"
            AS ENUM('SUBSCRIPTION', 'PAY_PER_PICKUP')
        `);

        await queryRunner.query(`
            ALTER TABLE "jobs"
            ADD COLUMN "quoted_price" numeric(10,2),
            ADD COLUMN "pricing_type" "public"."jobs_pricing_type_enum",
            ADD COLUMN "is_covered_by_subscription" boolean NOT NULL DEFAULT false
        `);

        // ─── system_config: pricing keys ──────────────────────────────────
        await queryRunner.query(`
            INSERT INTO "system_config" (id, key, value, data_type, category, description, is_feature_flag, updated_by, updated_at)
            VALUES
                (uuid_generate_v4(), 'pricing.per_pickup_price',           '1000', 'number',  'pricing', 'Price per pickup for pay-as-you-go (XAF)', false, NULL, NOW()),
                (uuid_generate_v4(), 'pricing.subscription_price',         '3500', 'number',  'pricing', 'Monthly subscription price (XAF)',          false, NULL, NOW()),
                (uuid_generate_v4(), 'pricing.subscription_pickups_per_week', '2', 'number',  'pricing', 'Pickups included per week in standard plan',false, NULL, NOW())
            ON CONFLICT (key) DO NOTHING
        `);

        // ─── seed default Standard Plan ───────────────────────────────────
        await queryRunner.query(`
            INSERT INTO "subscription_plans" (id, name, price, currency, pickups_per_week, is_active, description, created_at, updated_at)
            VALUES (
                uuid_generate_v4(),
                'Standard Plan',
                3500,
                'XAF',
                2,
                true,
                '2 pickups per week. Save up to 4,500 XAF/month vs pay-per-pickup.',
                NOW(),
                NOW()
            )
            ON CONFLICT DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove jobs pricing columns
        await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "is_covered_by_subscription"`);
        await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "pricing_type"`);
        await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "quoted_price"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."jobs_pricing_type_enum"`);

        // Remove user_subscriptions
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP CONSTRAINT IF EXISTS "FK_user_subscriptions_plan"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP CONSTRAINT IF EXISTS "FK_user_subscriptions_user"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_user_subscriptions_user_id"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_subscriptions"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_subscriptions_status_enum"`);

        // Remove subscription_plans
        await queryRunner.query(`DROP TABLE IF EXISTS "subscription_plans"`);

        // Remove pricing config keys
        await queryRunner.query(`
            DELETE FROM "system_config"
            WHERE key IN (
                'pricing.per_pickup_price',
                'pricing.subscription_price',
                'pricing.subscription_pickups_per_week'
            )
        `);
    }
}
