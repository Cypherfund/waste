import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOtpLookupToAuditEnum1784000000000 implements MigrationInterface {
  name = 'AddOtpLookupToAuditEnum1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add OTP_LOOKUP to admin_audit_action_enum
    await queryRunner.query(`
      ALTER TYPE "admin_audit_action_enum" ADD VALUE IF NOT EXISTS 'OTP_LOOKUP'
    `);

    // Add OTP_LOOKUP to admin_audit_entity_type_enum
    await queryRunner.query(`
      ALTER TYPE "admin_audit_entity_type_enum" ADD VALUE IF NOT EXISTS 'OTP_LOOKUP'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Cannot remove enum values in PostgreSQL, but we can document it
    console.log('Note: Cannot remove enum values in PostgreSQL down migration');
  }
}
