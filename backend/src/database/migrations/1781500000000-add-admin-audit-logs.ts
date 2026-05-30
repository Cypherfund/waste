import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminAuditLogs1781500000000 implements MigrationInterface {
  name = 'AddAdminAuditLogs1781500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin_audit_action enum
    await queryRunner.query(`
      CREATE TYPE "admin_audit_action_enum" AS ENUM (
        'PAYMENT_APPROVED',
        'PAYMENT_REJECTED',
        'WALLET_TOPUP_APPROVED',
        'WALLET_TOPUP_REJECTED',
        'SUBSCRIPTION_PAYMENT_VERIFIED',
        'SUBSCRIPTION_PAYMENT_REJECTED',
        'COLLECTOR_PAYOUT_APPROVED',
        'COLLECTOR_PAYOUT_REJECTED',
        'COLLECTOR_PAYOUT_MARKED_PAID',
        'MARKETER_PAYOUT_APPROVED',
        'MARKETER_PAYOUT_REJECTED',
        'MARKETER_PAYOUT_MARKED_PAID',
        'SYSTEM_CONFIG_UPDATED',
        'PAYMENT_PROVIDER_CREATED',
        'PAYMENT_PROVIDER_UPDATED',
        'PAYMENT_PROVIDER_DELETED',
        'COLLECTOR_FLOAT_TOPPED_UP',
        'COLLECTOR_FLOAT_ADJUSTED',
        'SYSTEM_CLEANUP_ANALYZED',
        'SYSTEM_CLEANUP_EXECUTED'
      )
    `);

    // Create admin_audit_entity_type enum
    await queryRunner.query(`
      CREATE TYPE "admin_audit_entity_type_enum" AS ENUM (
        'JOB',
        'PAYMENT_TRANSACTION',
        'WALLET_TOPUP',
        'SUBSCRIPTION',
        'PAYOUT_REQUEST',
        'MARKETER_PAYOUT_REQUEST',
        'SYSTEM_CONFIG',
        'PAYMENT_PROVIDER',
        'COLLECTOR_FLOAT_LEDGER',
        'SYSTEM_CLEANUP'
      )
    `);

    // Create admin_audit_logs table
    await queryRunner.query(`
      CREATE TABLE "admin_audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "admin_id" uuid NOT NULL,
        "action" "admin_audit_action_enum" NOT NULL,
        "entity_type" "admin_audit_entity_type_enum" NOT NULL,
        "entity_id" uuid,
        "old_value" jsonb,
        "new_value" jsonb,
        "metadata" jsonb,
        "ip_address" varchar(45),
        "user_agent" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_admin_audit_admin" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_logs_admin_id" ON "admin_audit_logs"("admin_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_logs_action" ON "admin_audit_logs"("action")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_logs_entity_type" ON "admin_audit_logs"("entity_type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_logs_entity_id" ON "admin_audit_logs"("entity_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_logs_created_at" ON "admin_audit_logs"("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_audit_logs_admin_action" ON "admin_audit_logs"("admin_id", "action")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_audit_logs_admin_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_audit_logs_entity_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_audit_logs_entity_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_audit_logs_admin_id"`);
    await queryRunner.query(`DROP TABLE "admin_audit_logs"`);
    await queryRunner.query(`DROP TYPE "admin_audit_entity_type_enum"`);
    await queryRunner.query(`DROP TYPE "admin_audit_action_enum"`);
  }
}
