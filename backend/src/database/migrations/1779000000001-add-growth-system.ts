import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGrowthSystem1779000000001 implements MigrationInterface {
  name = 'AddGrowthSystem1779000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Add MARKETER to existing users_role_enum if not exists
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'users_role_enum'
    `);
    
    if (enumExists.length > 0) {
      // Check if MARKETER value exists
      const marketerExists = await queryRunner.query(`
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'MARKETER' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'users_role_enum')
      `);
      
      if (marketerExists.length === 0) {
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" ADD VALUE 'MARKETER'`);
      }
    }

    // 1. Create leads table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leads" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "marketer_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "type" varchar(20) NOT NULL CHECK (type IN ('HOUSEHOLD', 'COLLECTOR')),
        "area" varchar(100),
        "notes" text,
        "source" varchar(20) NOT NULL DEFAULT 'FIELD' CHECK (source IN ('FIELD', 'QR_CODE', 'WHATSAPP', 'MANUAL')),
        "referral_token" varchar(100) UNIQUE NOT NULL,
        "referral_code" varchar(50) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'REGISTERED', 'QUALIFIED', 'EXPIRED')),
        "invited_at" timestamptz NOT NULL DEFAULT NOW(),
        "registered_at" timestamptz,
        "qualified_at" timestamptz,
        "expires_at" timestamptz NOT NULL DEFAULT NOW() + INTERVAL '7 days',
        "sms_status" varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (sms_status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED')),
        "sms_sent_at" timestamptz,
        "sms_delivered_at" timestamptz,
        "sms_retry_count" int NOT NULL DEFAULT 0,
        "sms_provider_message_id" varchar(100),
        "sms_opt_out" boolean NOT NULL DEFAULT false,
        "registered_user_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        
        CONSTRAINT "FK_leads_marketer" FOREIGN KEY ("marketer_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_leads_user" FOREIGN KEY ("registered_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_phone" ON "leads"("phone")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_status" ON "leads"("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_referral_token" ON "leads"("referral_token")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_marketer_id" ON "leads"("marketer_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_leads_created_at" ON "leads"("created_at")`);

    // 2. Create marketer_profiles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketer_profiles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid UNIQUE NOT NULL,
        "referral_code" varchar(50) UNIQUE NOT NULL,
        "territory" varchar(100),
        "status" varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED')),
        "total_leads" int NOT NULL DEFAULT 0,
        "total_registered" int NOT NULL DEFAULT 0,
        "total_qualified" int NOT NULL DEFAULT 0,
        "total_expired" int NOT NULL DEFAULT 0,
        "conversion_rate" decimal(5,2) NOT NULL DEFAULT 0,
        "qualification_rate" decimal(5,2) NOT NULL DEFAULT 0,
        "total_earned" decimal(12,2) NOT NULL DEFAULT 0,
        "total_paid" decimal(12,2) NOT NULL DEFAULT 0,
        "pending_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "approved_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "daily_leads_created" int NOT NULL DEFAULT 0,
        "daily_leads_reset_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        
        CONSTRAINT "FK_marketer_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_marketer_profiles_user" ON "marketer_profiles"("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_marketer_profiles_status" ON "marketer_profiles"("status")`);

    // 3. Create commission_schemes table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commission_schemes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "type" varchar(30) NOT NULL CHECK (type IN ('HOUSEHOLD_ONBOARDING', 'COLLECTOR_ONBOARDING', 'SUBSCRIPTION_PAYMENT')),
        "description" text,
        "commission_type" varchar(20) NOT NULL CHECK (commission_type IN ('FIXED', 'PERCENTAGE')),
        "amount" decimal(10,2) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_auto_assigned" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    // 4. Create marketer_scheme_assignments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketer_scheme_assignments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "marketer_profile_id" uuid NOT NULL,
        "scheme_id" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "assigned_at" timestamptz NOT NULL DEFAULT NOW(),
        "assigned_by" uuid NOT NULL,
        
        CONSTRAINT "FK_msa_profile" FOREIGN KEY ("marketer_profile_id") REFERENCES "marketer_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_msa_scheme" FOREIGN KEY ("scheme_id") REFERENCES "commission_schemes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_msa_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE CASCADE,
        UNIQUE("marketer_profile_id", "scheme_id")
      )
    `);

    // 5. Create commission_transactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commission_transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "marketer_profile_id" uuid NOT NULL,
        "scheme_id" uuid NOT NULL,
        "lead_id" uuid NOT NULL,
        "trigger_type" varchar(30) NOT NULL CHECK (trigger_type IN ('FIRST_SUCCESSFUL_BOOKING', 'FIRST_PICKUP_COMPLETED', 'SUBSCRIPTION_PAID')),
        "reference_id" varchar(100) NOT NULL,
        "reference_type" varchar(20) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
        "description" text,
        "rejection_reason" text,
        "reviewed_at" timestamptz,
        "reviewed_by" uuid,
        "paid_at" timestamptz,
        "paid_reference" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        
        CONSTRAINT "FK_ct_profile" FOREIGN KEY ("marketer_profile_id") REFERENCES "marketer_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ct_scheme" FOREIGN KEY ("scheme_id") REFERENCES "commission_schemes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ct_lead" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ct_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ct_profile" ON "commission_transactions"("marketer_profile_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ct_status" ON "commission_transactions"("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ct_created" ON "commission_transactions"("created_at")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_ct_lead_trigger_ref" ON "commission_transactions"("lead_id", "trigger_type", "reference_id")`);

    // 6. Create marketer_payout_requests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketer_payout_requests" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "marketer_profile_id" uuid NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "method" varchar(20) NOT NULL CHECK (method IN ('MTN_MOMO', 'ORANGE_MONEY')),
        "account_number" varchar(20) NOT NULL,
        "account_name" varchar(100),
        "status" varchar(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
        "admin_note" text,
        "reviewed_by" uuid,
        "reviewed_at" timestamptz,
        "paid_at" timestamptz,
        "paid_reference" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        
        CONSTRAINT "FK_mpr_profile" FOREIGN KEY ("marketer_profile_id") REFERENCES "marketer_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_mpr_reviewed_by" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mpr_profile" ON "marketer_payout_requests"("marketer_profile_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mpr_status" ON "marketer_payout_requests"("status")`);

    // 7. Create marketer_notifications table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketer_notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "marketer_profile_id" uuid NOT NULL,
        "type" varchar(30) NOT NULL CHECK (type IN ('LEAD_REGISTERED', 'LEAD_QUALIFIED', 'COMMISSION_APPROVED', 'COMMISSION_PAID', 'PAYOUT_PROCESSED', 'SYSTEM')),
        "title" varchar(200) NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        
        CONSTRAINT "FK_notif_profile" FOREIGN KEY ("marketer_profile_id") REFERENCES "marketer_profiles"("id") ON DELETE CASCADE
      )
    `);
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notif_profile" ON "marketer_notifications"("marketer_profile_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notif_unread" ON "marketer_notifications"("marketer_profile_id", "is_read") WHERE "is_read" = false`);

    // 8. Add referral columns to users table (idempotent)
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "referred_by_marketer_id" uuid,
      ADD COLUMN IF NOT EXISTS "lead_id" uuid,
      ADD COLUMN IF NOT EXISTS "referral_token_used" varchar(100),
      ADD COLUMN IF NOT EXISTS "referred_at" timestamptz
    `);
    
    // Add constraints only if they don't exist
    const fkRefExists = await queryRunner.query(`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_user_referred_by'`);
    if (fkRefExists.length === 0) {
      await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_user_referred_by" FOREIGN KEY ("referred_by_marketer_id") REFERENCES "users"("id") ON DELETE SET NULL`);
    }
    const fkLeadExists = await queryRunner.query(`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_user_lead'`);
    if (fkLeadExists.length === 0) {
      await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_user_lead" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL`);
    }
    
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_referred_by" ON "users"("referred_by_marketer_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_lead" ON "users"("lead_id")`);

    // 9. Seed default commission schemes (idempotent)
    await queryRunner.query(`
      INSERT INTO "commission_schemes" (id, name, type, description, commission_type, amount, is_active, is_auto_assigned)
      SELECT uuid_generate_v4(), 'Household Onboarding', 'HOUSEHOLD_ONBOARDING', 'Commission when referred household completes first booking with payment and collector assigned', 'FIXED', 500, true, true
      WHERE NOT EXISTS (SELECT 1 FROM "commission_schemes" WHERE type = 'HOUSEHOLD_ONBOARDING')
    `);
    await queryRunner.query(`
      INSERT INTO "commission_schemes" (id, name, type, description, commission_type, amount, is_active, is_auto_assigned)
      SELECT uuid_generate_v4(), 'Collector Onboarding', 'COLLECTOR_ONBOARDING', 'Commission when referred collector completes first pickup', 'FIXED', 1000, true, true
      WHERE NOT EXISTS (SELECT 1 FROM "commission_schemes" WHERE type = 'COLLECTOR_ONBOARDING')
    `);
    await queryRunner.query(`
      INSERT INTO "commission_schemes" (id, name, type, description, commission_type, amount, is_active, is_auto_assigned)
      SELECT uuid_generate_v4(), 'Subscription Payment', 'SUBSCRIPTION_PAYMENT', 'Commission on subscription payment by referred household', 'PERCENTAGE', 10, true, true
      WHERE NOT EXISTS (SELECT 1 FROM "commission_schemes" WHERE type = 'SUBSCRIPTION_PAYMENT')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign keys first
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_user_lead"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_user_referred_by"`);
    
    // Remove columns from users
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referred_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referral_token_used"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lead_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "referred_by_marketer_id"`);
    
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "marketer_notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketer_payout_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketer_scheme_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_schemes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketer_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leads"`);
  }
}
