import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarketingBudgetCampaigns1779100000000 implements MigrationInterface {
  name = 'AddMarketingBudgetCampaigns1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create marketing_budget_periods table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketing_budget_periods" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "start_date" timestamptz NOT NULL,
        "end_date" timestamptz NOT NULL,
        "total_budget" decimal(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'XAF',
        "committed_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "spent_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "remaining_amount" decimal(12,2) GENERATED ALWAYS AS ("total_budget" - ("committed_amount" + "spent_amount")) STORED,
        "alert_threshold_pct" int NOT NULL DEFAULT 80,
        "status" varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'CANCELLED')),
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        
        CONSTRAINT "fk_budget_period_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_budget_periods_status" ON "marketing_budget_periods"("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_budget_periods_dates" ON "marketing_budget_periods"("start_date", "end_date")`);

    // 2. Create marketing_campaigns table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketing_campaigns" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "budget_period_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text,
        "territory" varchar(100),
        "start_date" timestamptz NOT NULL,
        "end_date" timestamptz NOT NULL,
        "budget_amount" decimal(12,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'XAF',
        "committed_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "spent_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "alert_threshold_pct" int NOT NULL DEFAULT 80,
        "status" varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED')),
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        
        CONSTRAINT "fk_campaign_budget_period" FOREIGN KEY ("budget_period_id") REFERENCES "marketing_budget_periods"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_campaign_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_campaigns_budget_period" ON "marketing_campaigns"("budget_period_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_campaigns_status" ON "marketing_campaigns"("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_campaigns_dates" ON "marketing_campaigns"("start_date", "end_date")`);

    // 3. Create campaign_marketer_assignments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_marketer_assignments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "campaign_id" uuid NOT NULL,
        "marketer_profile_id" uuid NOT NULL,
        "assigned_at" timestamptz NOT NULL DEFAULT NOW(),
        "assigned_by" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        
        CONSTRAINT "fk_cma_campaign" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cma_marketer" FOREIGN KEY ("marketer_profile_id") REFERENCES "marketer_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cma_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE CASCADE,
        UNIQUE("campaign_id", "marketer_profile_id")
      )
    `);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cma_campaign" ON "campaign_marketer_assignments"("campaign_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cma_marketer" ON "campaign_marketer_assignments"("marketer_profile_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cma_active" ON "campaign_marketer_assignments"("campaign_id", "is_active") WHERE "is_active" = true`);

    // 4. Create campaign_commission_schemes table (optional)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_commission_schemes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "campaign_id" uuid NOT NULL,
        "scheme_id" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        
        CONSTRAINT "fk_ccs_campaign" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ccs_scheme" FOREIGN KEY ("scheme_id") REFERENCES "commission_schemes"("id") ON DELETE CASCADE,
        UNIQUE("campaign_id", "scheme_id")
      )
    `);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ccs_campaign" ON "campaign_commission_schemes"("campaign_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ccs_scheme" ON "campaign_commission_schemes"("scheme_id")`);

    // 5. Create budget_transactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "budget_transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "budget_period_id" uuid NOT NULL,
        "campaign_id" uuid NOT NULL,
        "commission_transaction_id" uuid,
        "marketer_profile_id" uuid,
        "type" varchar(20) NOT NULL CHECK (type IN ('COMMITTED', 'RELEASED', 'SPENT', 'ADJUSTMENT')),
        "amount" decimal(12,2) NOT NULL,
        "balance_before" decimal(12,2) NOT NULL,
        "balance_after" decimal(12,2) NOT NULL,
        "description" text,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        
        CONSTRAINT "fk_bt_budget_period" FOREIGN KEY ("budget_period_id") REFERENCES "marketing_budget_periods"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_bt_campaign" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_bt_commission" FOREIGN KEY ("commission_transaction_id") REFERENCES "commission_transactions"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_bt_marketer" FOREIGN KEY ("marketer_profile_id") REFERENCES "marketer_profiles"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_bt_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bt_budget_period" ON "budget_transactions"("budget_period_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bt_campaign" ON "budget_transactions"("campaign_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bt_commission" ON "budget_transactions"("commission_transaction_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bt_type" ON "budget_transactions"("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bt_created_at" ON "budget_transactions"("created_at")`);

    // 6. Add campaign_id to leads table
    await queryRunner.query(`
      ALTER TABLE "leads" 
      ADD COLUMN IF NOT EXISTS "campaign_id" uuid,
      ADD CONSTRAINT "fk_lead_campaign" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_leads_campaign" ON "leads"("campaign_id")`);

    // 7. Add campaign_id and budget_status to commission_transactions table
    await queryRunner.query(`
      ALTER TABLE "commission_transactions" 
      ADD COLUMN IF NOT EXISTS "campaign_id" uuid,
      ADD COLUMN IF NOT EXISTS "budget_status" varchar(20) NOT NULL DEFAULT 'NOT_RESERVED' CHECK (budget_status IN ('NOT_RESERVED', 'RESERVED', 'RELEASED', 'SPENT')),
      ADD CONSTRAINT "fk_commission_campaign" FOREIGN KEY ("campaign_id") REFERENCES "marketing_campaigns"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_commissions_campaign" ON "commission_transactions"("campaign_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_commissions_budget_status" ON "commission_transactions"("budget_status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign keys and columns in reverse order
    await queryRunner.query(`ALTER TABLE "commission_transactions" DROP CONSTRAINT IF EXISTS "fk_commission_campaign"`);
    await queryRunner.query(`ALTER TABLE "commission_transactions" DROP COLUMN IF EXISTS "budget_status"`);
    await queryRunner.query(`ALTER TABLE "commission_transactions" DROP COLUMN IF EXISTS "campaign_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_commissions_budget_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_commissions_campaign"`);

    await queryRunner.query(`ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "fk_lead_campaign"`);
    await queryRunner.query(`ALTER TABLE "leads" DROP COLUMN IF EXISTS "campaign_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_leads_campaign"`);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "budget_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_commission_schemes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_marketer_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketing_campaigns"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketing_budget_periods"`);
  }
}
