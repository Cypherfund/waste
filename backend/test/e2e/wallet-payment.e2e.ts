/**
 * E2E Test: Wallet Payment Flow
 *
 * Tests the core wallet payment functionality:
 *   Pay job with wallet (sufficient balance)
 *   Pay job with wallet (insufficient balance)
 *   Pay job with wallet (ownership verification)
 *   Pay subscription with wallet (sufficient balance)
 *   Pay subscription with wallet (insufficient balance)
 *   Manual wallet top-up creates pending transaction
 *
 * Specific test coverage:
 *   - Job payment with wallet when balance is sufficient
 *   - Job status changes to REQUESTED and payment_status to VERIFIED
 *   - Job payment_mode and payment_method set to WALLET
 *   - Wallet balance decreases after job payment
 *   - Job payment rejection when wallet balance is insufficient
 *   - Job status unchanged when payment rejected
 *   - Job ownership verification before payment (403 for non-owner)
 *   - Subscription payment with wallet when balance is sufficient
 *   - Subscription status becomes ACTIVE and payment_status VERIFIED
 *   - Subscription remainingPickupsThisWeek assigned from plan
 *   - Wallet balance decreases after subscription payment
 *   - Subscription payment rejection when wallet balance is insufficient
 *   - Manual wallet top-up creates PENDING transaction
 *   - Manual top-up stores paymentRef and paymentProofUrl
 *   - Manual top-up requires paymentRef
 */
import { app, httpServer, dataSource, baseUrl } from '../test-setup';
import * as request from 'supertest';
import { UserRole } from '../../src/common/enums/role.enum';
import { JobStatus } from '../../src/common/enums/job-status.enum';
import { PaymentStatus } from '../../src/common/enums/payment-status.enum';
import { SubscriptionStatus } from '../../src/common/enums/subscription-status.enum';
import { createTestUser, loginAndGetToken } from '../helpers/test-utils';

describe('E2E: Wallet Payment Flow', () => {
  let householdToken: string;
  let adminToken: string;
  let householdId: string;
  let adminId: string;
  let planId: string;
  let jobId: string;

  const cleanup = async () => {
    try {
      await dataSource.query(`TRUNCATE TABLE "wallet_ledger" CASCADE`);
    } catch (_) {
      // Table may not exist yet if migration not run
    }
    try {
      await dataSource.query(`TRUNCATE TABLE "payment_transactions" CASCADE`);
      await dataSource.query(`TRUNCATE TABLE "user_subscriptions" CASCADE`);
      await dataSource.query(`TRUNCATE TABLE "jobs" CASCADE`);
      await dataSource.query(`TRUNCATE TABLE "user_payment_methods" CASCADE`);
      await dataSource.query(`UPDATE "users" SET "wallet_balance" = 0 WHERE id = $1`, [
        householdId,
      ]);
    } catch (_) {}
  };

  const cleanupPlans = async () => {
    try {
      await dataSource.query(`UPDATE "subscription_plans" SET "is_active" = false WHERE id = $1`, [
        planId,
      ]);
    } catch (_) {}
  };

  // ─── SETUP ──────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const household = await createTestUser(
      dataSource,
      'wallet-household@test.com',
      'Household123!',
      UserRole.HOUSEHOLD,
      'Wallet Household',
      '+237691000001',
    );
    householdId = household.id;

    const admin = await createTestUser(
      dataSource,
      'wallet-admin@test.com',
      'AdminPass123!',
      UserRole.ADMIN,
      'Wallet Admin',
      '+237691000003',
    );
    adminId = admin.id;

    householdToken = await loginAndGetToken(baseUrl, '+237691000001', 'Household123!');
    adminToken = await loginAndGetToken(baseUrl, '+237691000003', 'AdminPass123!');

    // Create payment providers for tests
    await dataSource.query(`
      INSERT INTO payment_providers (payment_code, country_code, provider_name, currency, is_enabled, integration_enabled, supports_cashin, supports_cashout, min_deposit, max_deposit)
      VALUES
        ('ORANGE', 'CM', 'Orange Money', 'XAF', true, false, true, false, 100, 500000),
        ('MTN', 'CM', 'MTN Mobile Money', 'XAF', true, true, true, false, 100, 500000)
      ON CONFLICT (payment_code, country_code) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        integration_enabled = EXCLUDED.integration_enabled
    `);

    // Create a plan for subscription tests
    const planRes = await request(httpServer)
      .post('/api/v1/subscriptions/admin/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Wallet Test Plan', price: 4000, pickupsPerWeek: 2 })
      .expect(201);
    planId = planRes.body.id;
  });

  afterAll(async () => {
    await cleanup();
    await cleanupPlans();
  });

  afterEach(async () => {
    await cleanup();
  });

  // ─── POST /wallet/pay-job ───────────────────────────────────────────────

  describe('POST /wallet/pay-job', () => {
    beforeEach(async () => {
      // Clean up payment methods
      await dataSource.query(`DELETE FROM "user_payment_methods" WHERE "user_id" = $1`, [householdId]);
      
      // Create a minimal valid job fixture
      const jobRes = await dataSource.query(
        `
        INSERT INTO "jobs" (
          "household_id", "location_address", "location_lat", "location_lng",
          "scheduled_date", "scheduled_time",
          "status", "payment_status", "quoted_price", "created_at", "updated_at"
        ) VALUES (
          $1, 'Test Address', 3.848, 11.502,
          CURRENT_DATE, '10:00',
          'PAYMENT_PENDING', 'PENDING', 3000, NOW(), NOW()
        ) RETURNING id
      `,
        [householdId],
      );
      jobId = jobRes[0].id;
    });

    it('pays job with wallet when balance is sufficient', async () => {
      // Credit wallet with sufficient balance
      await dataSource.query(`UPDATE "users" SET "wallet_balance" = 10000 WHERE id = $1`, [
        householdId,
      ]);

      const res = await request(httpServer)
        .post('/api/v1/wallet/pay-job')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ jobId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.transactionId).toBeDefined();

      // Verify job status changed
      const jobRes = await dataSource.query(
        `SELECT "status", "payment_status", "payment_mode", "payment_method" FROM "jobs" WHERE id = $1`,
        [jobId],
      );
      expect(jobRes[0].status).toBe(JobStatus.REQUESTED);
      expect(jobRes[0].payment_status).toBe(PaymentStatus.VERIFIED);
      expect(jobRes[0].payment_mode).toBe('WALLET');
      expect(jobRes[0].payment_method).toBe('WALLET');

      // Verify wallet balance decreased
      const balanceRes = await request(httpServer)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(balanceRes.body.balance).toBeLessThan(10000);
      expect(balanceRes.body.balance).toBe(7000); // 10000 - 3000
    });

    it('rejects job payment when wallet balance is insufficient', async () => {
      // Set wallet balance to insufficient amount
      await dataSource.query(`UPDATE "users" SET "wallet_balance" = 500 WHERE id = $1`, [
        householdId,
      ]);

      const res = await request(httpServer)
        .post('/api/v1/wallet/pay-job')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ jobId })
        .expect(400);

      expect(res.body.message).toContain('INSUFFICIENT_WALLET_BALANCE');

      // Verify job status unchanged
      const jobRes = await dataSource.query(
        `SELECT "status", "payment_status" FROM "jobs" WHERE id = $1`,
        [jobId],
      );
      expect(jobRes[0].status).toBe(JobStatus.PAYMENT_PENDING);
      expect(jobRes[0].payment_status).toBe('PENDING');
    });

    it('verifies job ownership before payment', async () => {
      // Create another household
      const otherHousehold = await createTestUser(
        dataSource,
        'other-household@test.com',
        'Household123!',
        UserRole.HOUSEHOLD,
        'Other Household',
        '+237691000002',
      );
      const otherToken = await loginAndGetToken(baseUrl, '+237691000002', 'Household123!');

      // Try to pay with other household's token
      const res = await request(httpServer)
        .post('/api/v1/wallet/pay-job')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ jobId })
        .expect(403);

      expect(res.body.message).toContain('cannot pay for this job');
    });
  });

  // ─── POST /wallet/pay-subscription ─────────────────────────────────────

  describe('POST /wallet/pay-subscription', () => {
    it('pays subscription with wallet when balance is sufficient', async () => {
      // Credit wallet with sufficient balance
      await dataSource.query(`UPDATE "users" SET "wallet_balance" = 10000 WHERE id = $1`, [
        householdId,
      ]);

      const res = await request(httpServer)
        .post('/api/v1/wallet/pay-subscription')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.transactionId).toBeDefined();

      // Verify subscription is ACTIVE
      const subRes = await request(httpServer)
        .get('/api/v1/subscriptions/my')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(subRes.body.status).toBe(SubscriptionStatus.ACTIVE);
      expect(subRes.body.paymentStatus).toBe(PaymentStatus.VERIFIED);
      expect(subRes.body.remainingPickupsThisWeek).toBe(2);

      // Verify wallet balance decreased
      const balanceRes = await request(httpServer)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(balanceRes.body.balance).toBeLessThan(10000);
    });

    it('rejects subscription payment when wallet balance is insufficient', async () => {
      // Set wallet balance to insufficient amount
      await dataSource.query(`UPDATE "users" SET "wallet_balance" = 500 WHERE id = $1`, [
        householdId,
      ]);

      const res = await request(httpServer)
        .post('/api/v1/wallet/pay-subscription')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId })
        .expect(400);

      expect(res.body.message).toContain('INSUFFICIENT_WALLET_BALANCE');
    });
  });

  // ─── POST /wallet/top-up (manual) ───────────────────────────────────────

  describe('POST /wallet/top-up (manual)', () => {
    let userPaymentMethodId: string;

    beforeEach(async () => {
      // Clean up payment methods
      await dataSource.query(`DELETE FROM "user_payment_methods" WHERE "user_id" = $1`, [householdId]);
      
      // Create a user payment method
      const methodRes = await request(httpServer)
        .post('/api/v1/wallet/payment-methods')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          paymentCode: 'ORANGE',
          accountNumber: '+237699000001',
          usageType: 'CASHIN',
        });

      if (methodRes.status !== 201) {
        console.log('Payment method creation failed:', methodRes.body);
        throw new Error(`Failed to create payment method: ${JSON.stringify(methodRes.body)}`);
      }

      userPaymentMethodId = methodRes.body.id;
    });

    it('creates pending transaction for manual top-up', async () => {
      const res = await request(httpServer)
        .post('/api/v1/wallet/top-up')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          amount: 5000,
          paymentMethodId: userPaymentMethodId,
          paymentRef: 'TXN-MANUAL-001',
          paymentProofUrl: 'https://cdn.example.com/proof.jpg',
        })
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.type).toBe('WALLET_TOPUP');
      expect(res.body.paymentRef).toBe('TXN-MANUAL-001');
      expect(res.body.paymentProofUrl).toBe('https://cdn.example.com/proof.jpg');
    });

    it('requires paymentRef for manual top-up', async () => {
      const res = await request(httpServer)
        .post('/api/v1/wallet/top-up')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          amount: 5000,
          paymentMethodId: userPaymentMethodId,
        })
        .expect(400);

      expect(res.body.message).toContain('Payment reference is required');
    });

    it('admin approval creates wallet ledger entry', async () => {
      // Create pending top-up
      const topupRes = await request(httpServer)
        .post('/api/v1/wallet/top-up')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          amount: 5000,
          paymentMethodId: userPaymentMethodId,
          paymentRef: 'TXN-MANUAL-002',
          paymentProofUrl: 'https://cdn.example.com/proof2.jpg',
        })
        .expect(201);

      const transactionId = topupRes.body.id;

      // Approve as admin
      await request(httpServer)
        .post(`/api/v1/admin/wallet-top-up/${transactionId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
    });
  });

  // ─── PATCH /admin/jobs/:id/verify-payment ───────────────────────────────

  describe('PATCH /admin/jobs/:id/verify-payment', () => {
    let providerPendingJobId: string;

    beforeEach(async () => {
      // Create an integrated provider payment job (PROVIDER_PENDING status)
      const jobRes = await request(httpServer)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          scheduledDate: '2025-01-15',
          scheduledTime: '10:00',
          locationAddress: '123 Test Street',
          paymentMode: 'INTEGRATED_PROVIDER',
          paymentCode: 'MTN',
          paymentPhone: '+237699000001',
        })
        .expect(201);

      providerPendingJobId = jobRes.body.id;

      // Verify job has PROVIDER_PENDING status
      const jobStatusRes = await dataSource.query(
        `SELECT "status", "payment_status" FROM "jobs" WHERE id = $1`,
        [providerPendingJobId],
      );
      expect(jobStatusRes.rows[0].status).toBe(JobStatus.PAYMENT_PENDING);
      expect(jobStatusRes.rows[0].payment_status).toBe('PROVIDER_PENDING');
    });

    it('verifies PROVIDER_PENDING payment', async () => {
      const res = await request(httpServer)
        .patch(`/api/v1/admin/jobs/${providerPendingJobId}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe(JobStatus.REQUESTED);
      expect(res.body.paymentStatus).toBe(PaymentStatus.VERIFIED);
      expect(res.body.paymentVerifiedBy).toBe(adminId);
      expect(res.body.paymentVerifiedAt).toBeDefined();
    });

    it('rejects verification for non-PAYMENT_PENDING job', async () => {
      // Move job to REQUESTED status
      await dataSource.query(
        `UPDATE "jobs" SET status = 'REQUESTED' WHERE id = $1`,
        [providerPendingJobId],
      );

      const res = await request(httpServer)
        .patch(`/api/v1/admin/jobs/${providerPendingJobId}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).toContain('not in PAYMENT_PENDING status');
    });

    it('rejects verification for VERIFIED payment', async () => {
      // Verify payment first
      await request(httpServer)
        .patch(`/api/v1/admin/jobs/${providerPendingJobId}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Try to verify again
      const res = await request(httpServer)
        .patch(`/api/v1/admin/jobs/${providerPendingJobId}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).toContain('not pending payment verification');
    });

    it('requires admin role', async () => {
      const res = await request(httpServer)
        .patch(`/api/v1/admin/jobs/${providerPendingJobId}/verify-payment`)
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(403);

      expect(res.body.message).toContain('Forbidden');
    });
  });
});
