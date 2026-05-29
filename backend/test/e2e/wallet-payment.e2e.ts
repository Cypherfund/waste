/**
 * E2E Test: Wallet Payment Flow
 *
 * Tests the full wallet payment lifecycle:
 *   Pay job with wallet (sufficient balance)
 *   Pay job with wallet (insufficient balance)
 *   Pay subscription with wallet (sufficient balance)
 *   Pay subscription with wallet (insufficient balance)
 *   Manual wallet top-up → admin approve → wallet credited once
 *   Manual wallet top-up → admin reject → wallet unchanged
 *   Integrated wallet top-up callback repeated twice → wallet credited only once
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
      await dataSource.query(`TRUNCATE TABLE "payment_transactions" CASCADE`);
      await dataSource.query(`TRUNCATE TABLE "user_subscriptions" CASCADE`);
      await dataSource.query(`TRUNCATE TABLE "jobs" CASCADE`);
      await dataSource.query(`UPDATE "users" SET "wallet_balance" = 0 WHERE id = $1`, [householdId]);
    } catch (_) {}
  };

  const cleanupPlans = async () => {
    try {
      await dataSource.query(
        `UPDATE "subscription_plans" SET "isActive" = false WHERE id = $1`,
        [planId],
      );
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
      // Create a job in PAYMENT_PENDING status
      const jobRes = await request(httpServer)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          address: 'Wallet Test Address',
          latitude: 3.848,
          longitude: 11.502,
          wasteType: 'HOUSEHOLD',
        })
        .expect(201);
      jobId = jobRes.body.id;

      // Set job to PAYMENT_PENDING
      await dataSource.query(
        `UPDATE "jobs" SET "status" = 'PAYMENT_PENDING' WHERE id = $1`,
        [jobId],
      );
    });

    it('pays job with wallet when balance is sufficient', async () => {
      // Credit wallet with sufficient balance
      await dataSource.query(
        `UPDATE "users" SET "wallet_balance" = 10000 WHERE id = $1`,
        [householdId],
      );

      const res = await request(httpServer)
        .post('/api/v1/wallet/pay-job')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ jobId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.transactionId).toBeDefined();

      // Verify job status changed
      const jobRes = await request(httpServer)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(jobRes.body.status).toBe(JobStatus.REQUESTED);
      expect(jobRes.body.paymentStatus).toBe(PaymentStatus.VERIFIED);
      expect(jobRes.body.paymentMode).toBe('WALLET');

      // Verify wallet balance decreased
      const balanceRes = await request(httpServer)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(balanceRes.body.balance).toBeLessThan(10000);
    });

    it('rejects job payment when wallet balance is insufficient', async () => {
      // Set wallet balance to insufficient amount
      await dataSource.query(
        `UPDATE "users" SET "wallet_balance" = 500 WHERE id = $1`,
        [householdId],
      );

      const res = await request(httpServer)
        .post('/api/v1/wallet/pay-job')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ jobId })
        .expect(400);

      expect(res.body.message).toContain('INSUFFICIENT_WALLET_BALANCE');

      // Verify job status unchanged
      const jobRes = await request(httpServer)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(jobRes.body.status).toBe(JobStatus.PAYMENT_PENDING);
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

      expect(res.body.message).toContain('Forbidden');
    });
  });

  // ─── POST /wallet/pay-subscription ─────────────────────────────────────

  describe('POST /wallet/pay-subscription', () => {
    it('pays subscription with wallet when balance is sufficient', async () => {
      // Credit wallet with sufficient balance
      await dataSource.query(
        `UPDATE "users" SET "wallet_balance" = 10000 WHERE id = $1`,
        [householdId],
      );

      const res = await request(httpServer)
        .post('/api/v1/wallet/pay-subscription')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId })
        .expect(200);

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
      await dataSource.query(
        `UPDATE "users" SET "wallet_balance" = 500 WHERE id = $1`,
        [householdId],
      );

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
      // Create a user payment method
      const methodRes = await request(httpServer)
        .post('/api/v1/wallet/payment-methods')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          providerName: 'Orange Money',
          paymentCode: 'ORANGE',
          accountNumber: '+237699000001',
          usage: 'CASHIN',
        })
        .expect(201);
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
        .expect(200);

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
  });

  // ─── POST /admin/wallet-top-up/:id/approve ─────────────────────────────

  describe('POST /admin/wallet-top-up/:id/approve', () => {
    let transactionId: string;
    let userPaymentMethodId: string;

    beforeEach(async () => {
      // Create a user payment method
      const methodRes = await request(httpServer)
        .post('/api/v1/wallet/payment-methods')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          providerName: 'Orange Money',
          paymentCode: 'ORANGE',
          accountNumber: '+237699000001',
          usage: 'CASHIN',
        })
        .expect(201);
      userPaymentMethodId = methodRes.body.id;

      // Create a pending top-up transaction
      const topUpRes = await request(httpServer)
        .post('/api/v1/wallet/top-up')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          amount: 5000,
          paymentMethodId: userPaymentMethodId,
          paymentRef: 'TXN-APPROVE-001',
        })
        .expect(200);
      transactionId = topUpRes.body.id;
    });

    it('credits wallet and marks transaction as VERIFIED on approval', async () => {
      const initialBalance = 0;

      const res = await request(httpServer)
        .post(`/api/v1/admin/wallet-top-up/${transactionId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify wallet balance increased
      const balanceRes = await request(httpServer)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(balanceRes.body.balance).toBe(initialBalance + 5000);

      // Verify transaction status
      const transRes = await request(httpServer)
        .get(`/api/v1/payments/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(transRes.body.status).toBe('VERIFIED');
    });

    it('is idempotent - second approval does not credit again', async () => {
      // First approval
      await request(httpServer)
        .post(`/api/v1/admin/wallet-top-up/${transactionId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const balanceAfterFirst = (await request(httpServer)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200)).body.balance;

      // Try to approve again
      const res = await request(httpServer)
        .post(`/api/v1/admin/wallet-top-up/${transactionId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).toContain('already been processed');

      // Verify balance unchanged
      const balanceAfterSecond = (await request(httpServer)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200)).body.balance;

      expect(balanceAfterSecond).toBe(balanceAfterFirst);
    });
  });

  // ─── POST /admin/wallet-top-up/:id/reject ─────────────────────────────

  describe('POST /admin/wallet-top-up/:id/reject', () => {
    let transactionId: string;
    let userPaymentMethodId: string;

    beforeEach(async () => {
      // Create a user payment method
      const methodRes = await request(httpServer)
        .post('/api/v1/wallet/payment-methods')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          providerName: 'Orange Money',
          paymentCode: 'ORANGE',
          accountNumber: '+237699000001',
          usage: 'CASHIN',
        })
        .expect(201);
      userPaymentMethodId = methodRes.body.id;

      // Create a pending top-up transaction
      const topUpRes = await request(httpServer)
        .post('/api/v1/wallet/top-up')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          amount: 5000,
          paymentMethodId: userPaymentMethodId,
          paymentRef: 'TXN-REJECT-001',
        })
        .expect(200);
      transactionId = topUpRes.body.id;
    });

    it('marks transaction as FAILED without crediting wallet', async () => {
      const initialBalance = 0;

      const res = await request(httpServer)
        .post(`/api/v1/admin/wallet-top-up/${transactionId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Invalid payment reference' })
        .expect(200);

      // Verify wallet balance unchanged
      const balanceRes = await request(httpServer)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(balanceRes.body.balance).toBe(initialBalance);

      // Verify transaction status
      const transRes = await request(httpServer)
        .get(`/api/v1/payments/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(transRes.body.status).toBe('FAILED');
      expect(transRes.body.failureReason).toBe('Invalid payment reference');
    });

    it('is idempotent - second rejection does not change state', async () => {
      // First rejection
      await request(httpServer)
        .post(`/api/v1/admin/wallet-top-up/${transactionId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Invalid payment reference' })
        .expect(200);

      // Try to reject again
      const res = await request(httpServer)
        .post(`/api/v1/admin/wallet-top-up/${transactionId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Another reason' })
        .expect(400);

      expect(res.body.message).toContain('already been processed');
    });
  });

  // ─── Integrated wallet top-up callback idempotency ───────────────────

  describe('Integrated wallet top-up callback idempotency', () => {
    let transactionId: string;
    let userPaymentMethodId: string;

    beforeEach(async () => {
      // Create a user payment method with integration enabled
      const methodRes = await request(httpServer)
        .post('/api/v1/wallet/payment-methods')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          providerName: 'MTN Mobile Money',
          paymentCode: 'MTN',
          accountNumber: '+237699000002',
          usage: 'CASHIN',
        })
        .expect(201);
      userPaymentMethodId = methodRes.body.id;

      // Enable integration for the provider
      await dataSource.query(
        `UPDATE "payment_providers" SET "integration_enabled" = true WHERE "payment_code" = 'MTN'`,
      );

      // Create a pending top-up transaction via integrated flow
      const topUpRes = await request(httpServer)
        .post('/api/v1/wallet/top-up')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          amount: 5000,
          paymentMethodId: userPaymentMethodId,
        })
        .expect(200);
      transactionId = topUpRes.body.id;

      // Set gateway transaction ID
      await dataSource.query(
        `UPDATE "payment_transactions" SET "gateway_transaction_id" = 'GTX-12345' WHERE id = $1`,
        [transactionId],
      );
    });

    it('credits wallet only once on duplicate callback', async () => {
      const initialBalance = 0;

      // Simulate first callback
      await request(httpServer)
        .post('/api/v1/payments/callback')
        .send({
          transactionId: 'GTX-12345',
          status: 'SUCCESS',
          data: null,
        })
        .expect(200);

      const balanceAfterFirst = (await request(httpServer)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200)).body.balance;

      expect(balanceAfterFirst).toBe(initialBalance + 5000);

      // Simulate duplicate callback
      await request(httpServer)
        .post('/api/v1/payments/callback')
        .send({
          transactionId: 'GTX-12345',
          status: 'SUCCESS',
          data: null,
        })
        .expect(200);

      const balanceAfterSecond = (await request(httpServer)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200)).body.balance;

      // Balance should not change on duplicate
      expect(balanceAfterSecond).toBe(balanceAfterFirst);

      // Verify transaction status is VERIFIED
      const transRes = await request(httpServer)
        .get(`/api/v1/payments/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(transRes.body.status).toBe('VERIFIED');
    });
  });
});
