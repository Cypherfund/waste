import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSystemCleanupLogs1779200000000 implements MigrationInterface {
    name = 'AddSystemCleanupLogs1779200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."system_cleanup_logs_status_enum" AS ENUM('ANALYZED', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "system_cleanup_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requested_by" uuid NOT NULL, "filters" jsonb NOT NULL DEFAULT '{}', "components" jsonb NOT NULL DEFAULT '{}', "analysis_before" jsonb NOT NULL DEFAULT '{}', "deleted_counts" jsonb, "errors" jsonb NOT NULL DEFAULT '[]', "status" "public"."system_cleanup_logs_status_enum" NOT NULL DEFAULT 'ANALYZED', "started_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8a7b9c1d2e3f4g5h6i7j8k9l0m" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_system_cleanup_logs_requested_by" ON "system_cleanup_logs" ("requested_by")`);
        await queryRunner.query(`CREATE INDEX "IDX_system_cleanup_logs_status" ON "system_cleanup_logs" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_system_cleanup_logs_created_at" ON "system_cleanup_logs" ("created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_system_cleanup_logs_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_system_cleanup_logs_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_system_cleanup_logs_requested_by"`);
        await queryRunner.query(`DROP TABLE "system_cleanup_logs"`);
        await queryRunner.query(`DROP TYPE "public"."system_cleanup_logs_status_enum"`);
    }
}
