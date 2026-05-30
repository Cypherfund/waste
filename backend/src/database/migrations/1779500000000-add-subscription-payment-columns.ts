import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionPaymentColumns1779500000000 implements MigrationInterface {
  name = 'AddSubscriptionPaymentColumns1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist to avoid errors
    const paymentModeExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='user_subscriptions' AND column_name='payment_mode'`,
    );

    if (!paymentModeExists[0]) {
      await queryRunner.query(`
        ALTER TABLE "user_subscriptions"
        ADD COLUMN "payment_mode" VARCHAR(50) NULL
      `);
    }

    const paymentStatusExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='user_subscriptions' AND column_name='payment_status'`,
    );

    if (!paymentStatusExists[0]) {
      await queryRunner.query(`
        ALTER TABLE "user_subscriptions"
        ADD COLUMN "payment_status" VARCHAR(20) NULL
      `);
    }

    const paymentRefExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='user_subscriptions' AND column_name='payment_ref'`,
    );

    if (!paymentRefExists[0]) {
      await queryRunner.query(`
        ALTER TABLE "user_subscriptions"
        ADD COLUMN "payment_ref" VARCHAR(255) NULL
      `);
    }

    const paymentProofUrlExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='user_subscriptions' AND column_name='payment_proof_url'`,
    );

    if (!paymentProofUrlExists[0]) {
      await queryRunner.query(`
        ALTER TABLE "user_subscriptions"
        ADD COLUMN "payment_proof_url" VARCHAR(500) NULL
      `);
    }

    const paymentPhoneExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='user_subscriptions' AND column_name='payment_phone'`,
    );

    if (!paymentPhoneExists[0]) {
      await queryRunner.query(`
        ALTER TABLE "user_subscriptions"
        ADD COLUMN "payment_phone" VARCHAR(50) NULL
      `);
    }

    const providerTransactionIdExists = await queryRunner.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name='user_subscriptions' AND column_name='provider_transaction_id'`,
    );

    if (!providerTransactionIdExists[0]) {
      await queryRunner.query(`
        ALTER TABLE "user_subscriptions"
        ADD COLUMN "provider_transaction_id" VARCHAR(255) NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "provider_transaction_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "payment_phone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "payment_proof_url"`,
    );
    await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "payment_ref"`);
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "payment_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_subscriptions" DROP COLUMN IF EXISTS "payment_mode"`,
    );
  }
}
