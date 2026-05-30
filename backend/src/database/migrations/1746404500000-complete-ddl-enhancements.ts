import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteDdlEnhancements1746404500000 implements MigrationInterface {
  name = 'CompleteDdlEnhancements1746404500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='idempotency_cache'`,
    );
    if (exists.length > 0) {
      console.log('DDL enhancements migration: already applied, skipping.');
      return;
    }

    // ─── Extensions (may require superuser, skip gracefully) ────
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE EXTENSION IF NOT EXISTS "pg_trgm";
            EXCEPTION WHEN insufficient_privilege THEN
                RAISE NOTICE 'pg_trgm extension skipped (insufficient privileges)';
            END $$
        `);

    await queryRunner.query(`
            DO $$ BEGIN
                CREATE EXTENSION IF NOT EXISTS "earthdistance" CASCADE;
            EXCEPTION WHEN insufficient_privilege THEN
                RAISE NOTICE 'earthdistance extension skipped (insufficient privileges)';
            END $$
        `);

    // ─── Additional Indexes ───────────────────────────────────────

    // Location index for users (collectors) - requires earthdistance
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE INDEX IF NOT EXISTS "idx_users_location" 
                ON "users" USING gist (
                    ll_to_earth(latitude, longitude)
                ) 
                WHERE role = 'COLLECTOR' AND latitude IS NOT NULL;
            EXCEPTION WHEN undefined_function THEN
                RAISE NOTICE 'Location index skipped (earthdistance not available)';
            END $$
        `);

    // Additional job indexes
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_jobs_scheduled" 
            ON "jobs" (scheduled_date, scheduled_time)
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_jobs_status_date" 
            ON "jobs" (status, scheduled_date)
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_jobs_active" 
            ON "jobs" (status, scheduled_date)
            WHERE status IN ('REQUESTED', 'ASSIGNED', 'IN_PROGRESS')
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_jobs_household_date" 
            ON "jobs" (household_id, scheduled_date)
            WHERE status NOT IN ('CANCELLED')
        `);

    await queryRunner.query(`
            DO $$ BEGIN
                CREATE INDEX IF NOT EXISTS "idx_jobs_location" 
                ON "jobs" USING gist (
                    ll_to_earth(location_lat, location_lng)
                ) 
                WHERE location_lat IS NOT NULL;
            EXCEPTION WHEN undefined_function THEN
                RAISE NOTICE 'Jobs location index skipped (earthdistance not available)';
            END $$
        `);

    await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "idx_jobs_no_duplicate"
            ON "jobs" (household_id, scheduled_date)
            WHERE status IN ('REQUESTED', 'ASSIGNED', 'IN_PROGRESS')
        `);

    // Additional earnings indexes
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_earnings_collector_status" 
            ON "earnings" (collector_id, status)
        `);

    // Additional fraud_flags indexes
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_fraud_flags_severity" 
            ON "fraud_flags" (severity) 
            WHERE status = 'OPEN'
        `);

    // Additional notifications indexes
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" 
            ON "notifications" (user_id, created_at DESC)
            WHERE read_at IS NULL
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_notifications_status" 
            ON "notifications" (status)
            WHERE status = 'PENDING'
        `);

    // Additional collector_availability indexes
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_availability_day" 
            ON "collector_availability" (day_of_week, start_time, end_time)
            WHERE is_active = true
        `);

    // Additional system_config indexes
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_config_feature_flags" 
            ON "system_config" (key) 
            WHERE is_feature_flag = true
        `);

    // ─── idempotency_cache Table ───────────────────────────────────
    await queryRunner.query(`
            CREATE TABLE "idempotency_cache" (
                "key" character varying(36) NOT NULL,
                "status_code" integer NOT NULL,
                "response_body" jsonb NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_idempotency_cache" PRIMARY KEY ("key")
            )
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_idempotency_expires" 
            ON "idempotency_cache" (expires_at)
        `);

    // ─── Additional system_config entries ───────────────────────────
    await queryRunner.query(`
            INSERT INTO "system_config" (id, key, value, data_type, category, description, is_feature_flag, updated_at)
            VALUES
                (uuid_generate_v4(), 'earnings.base_rate', '500', 'number', 'earnings', 'Base earnings per job in XAF', false, NOW()),
                (uuid_generate_v4(), 'earnings.per_km_rate', '100', 'number', 'earnings', 'Additional earnings per km in XAF', false, NOW()),
                (uuid_generate_v4(), 'earnings.surge_enabled', 'false', 'boolean', 'earnings', 'Enable surge pricing', true, NOW()),
                (uuid_generate_v4(), 'earnings.surge_multiplier', '1.25', 'number', 'earnings', 'Surge multiplier when active', false, NOW()),
                (uuid_generate_v4(), 'earnings.surge_threshold', '0.8', 'number', 'earnings', 'Utilization threshold to trigger surge', false, NOW()),
                (uuid_generate_v4(), 'assignment.max_radius_km', '10', 'number', 'assignment', 'Max distance to search for collectors', false, NOW()),
                (uuid_generate_v4(), 'assignment.max_concurrent_jobs', '5', 'number', 'assignment', 'Max active jobs per collector', false, NOW()),
                (uuid_generate_v4(), 'assignment.max_daily_jobs', '15', 'number', 'assignment', 'Max jobs per collector per day', false, NOW()),
                (uuid_generate_v4(), 'assignment.accept_timeout_minutes', '10', 'number', 'assignment', 'Minutes before reassigning', false, NOW()),
                (uuid_generate_v4(), 'assignment.max_reassign_attempts', '3', 'number', 'assignment', 'Max auto-assign attempts', false, NOW()),
                (uuid_generate_v4(), 'assignment.weight_distance', '0.40', 'number', 'assignment', 'Weight for distance in scoring', false, NOW()),
                (uuid_generate_v4(), 'assignment.weight_workload', '0.30', 'number', 'assignment', 'Weight for workload in scoring', false, NOW()),
                (uuid_generate_v4(), 'assignment.weight_rating', '0.15', 'number', 'assignment', 'Weight for rating in scoring', false, NOW()),
                (uuid_generate_v4(), 'assignment.weight_recency', '0.15', 'number', 'assignment', 'Weight for recency in scoring', false, NOW()),
                (uuid_generate_v4(), 'proof.auto_validate_hours', '24', 'number', 'proof', 'Hours before auto-validating proof', false, NOW()),
                (uuid_generate_v4(), 'feature.collector_self_registration', 'true', 'boolean', 'feature', 'Allow collectors to self-register', true, NOW()),
                (uuid_generate_v4(), 'feature.auto_assignment', 'true', 'boolean', 'feature', 'Enable automatic job assignment', true, NOW()),
                (uuid_generate_v4(), 'feature.fraud_detection', 'true', 'boolean', 'feature', 'Enable fraud detection checks', true, NOW()),
                (uuid_generate_v4(), 'feature.sms_notifications', 'false', 'boolean', 'feature', 'Enable SMS fallback notifications', true, NOW()),
                (uuid_generate_v4(), 'feature.surge_pricing', 'false', 'boolean', 'feature', 'Enable surge pricing', true, NOW()),
                (uuid_generate_v4(), 'feature.location_tracking', 'true', 'boolean', 'feature', 'Enable real-time location tracking', true, NOW()),
                (uuid_generate_v4(), 'feature.payment_integration', 'true', 'boolean', 'feature', 'Enable payment integration', true, NOW()),
                (uuid_generate_v4(), 'support.whatsapp_number', '+237677777777', 'string', 'support', 'WhatsApp support number', false, NOW()),
                (uuid_generate_v4(), 'payment.manual_instructions', 'Send your payment of {amount} XAF to MTN MoMo: 6XX XXX XXX (KmerTrash) or Orange Money: 6XX XXX XXX. Use your phone number as reference.', 'string', 'payment', 'Instructions shown to users when payment integration is disabled', false, NOW()),
                (uuid_generate_v4(), 'feature.wallet_system', 'true', 'boolean', 'feature', 'Enable wallet system', true, NOW()),
                (uuid_generate_v4(), 'feature.offline_queue', 'true', 'boolean', 'feature', 'Enable offline action queue', true, NOW())
            ON CONFLICT (key) DO NOTHING
        `);

    // ─── Updated_at Trigger Function ─────────────────────────────────
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);

    // ─── Updated_at Triggers ─────────────────────────────────────────
    await queryRunner.query(`
            DROP TRIGGER IF EXISTS "update_users_updated_at" ON "users"
        `);

    await queryRunner.query(`
            CREATE TRIGGER "update_users_updated_at"
            BEFORE UPDATE ON "users"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);

    await queryRunner.query(`
            DROP TRIGGER IF EXISTS "update_jobs_updated_at" ON "jobs"
        `);

    await queryRunner.query(`
            CREATE TRIGGER "update_jobs_updated_at"
            BEFORE UPDATE ON "jobs"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);

    await queryRunner.query(`
            DROP TRIGGER IF EXISTS "update_collector_availability_updated_at" ON "collector_availability"
        `);

    await queryRunner.query(`
            CREATE TRIGGER "update_collector_availability_updated_at"
            BEFORE UPDATE ON "collector_availability"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ─── Drop Triggers ───────────────────────────────────────────
    await queryRunner.query(`DROP TRIGGER IF EXISTS "update_users_updated_at" ON "users"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS "update_jobs_updated_at" ON "jobs"`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "update_collector_availability_updated_at" ON "collector_availability"`,
    );

    // ─── Drop Trigger Function ───────────────────────────────────────
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);

    // ─── Drop Additional system_config entries ─────────────────────────
    await queryRunner.query(`
            DELETE FROM "system_config"
            WHERE key IN (
                'earnings.base_rate',
                'earnings.per_km_rate',
                'earnings.surge_enabled',
                'earnings.surge_multiplier',
                'earnings.surge_threshold',
                'assignment.max_radius_km',
                'assignment.max_concurrent_jobs',
                'assignment.max_daily_jobs',
                'assignment.accept_timeout_minutes',
                'assignment.max_reassign_attempts',
                'assignment.weight_distance',
                'assignment.weight_workload',
                'assignment.weight_rating',
                'assignment.weight_recency',
                'proof.auto_validate_hours',
                'feature.collector_self_registration',
                'feature.auto_assignment',
                'feature.fraud_detection',
                'feature.sms_notifications',
                'feature.surge_pricing',
                'feature.location_tracking',
                'feature.payment_integration',
                'support.whatsapp_number',
                'payment.manual_instructions',
                'feature.wallet_system',
                'feature.offline_queue'
            )
        `);

    // ─── Drop idempotency_cache Table ─────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_idempotency_expires"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_cache"`);

    // ─── Drop Additional Indexes ───────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_jobs_scheduled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_jobs_status_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_jobs_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_jobs_household_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_jobs_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_jobs_no_duplicate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_earnings_collector_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_fraud_flags_severity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_user_unread"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_availability_day"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_config_feature_flags"`);

    // ─── Drop Extensions ───────────────────────────────────────────
    await queryRunner.query(`DROP EXTENSION IF EXISTS "earthdistance" CASCADE`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "pg_trgm"`);
  }
}
