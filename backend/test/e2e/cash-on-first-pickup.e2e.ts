/**
 * E2E Test: Cash on First Pickup Flow
 *
 * Tests the full lifecycle:
 *   Subscribe with cash on first pickup → PENDING_PAYMENT + linked job created
 *   Job has CASH_ON_FIRST_PICKUP payment mode and cashToCollectAmount
 *   Assignment skips collectors with insufficient float
 *   Completion fails without cashCollectedAmount
 *   Completion fails if amount does not match (strict validation)
 *   Completion deducts collector float once (platform share)
 *   Completion activates subscription and sets remainingPickupsThisWeek
 *   Second completion attempt does not deduct float again (idempotency)
 *   Cancellation before pickup cancels linked job
 *   Float ledger entry created for platform share deduction
 *   Admin backend visibility of cash subscriptions
 *
 * Specific test coverage:
 *   - Subscription and first job created in one transaction
 *   - Subscription starts PENDING_PAYMENT
 *   - Job has CASH_ON_FIRST_PICKUP fields (paymentMode, cashToCollectAmount, cashCollectionType)
 *   - Job is linked to subscription via subscriptionId
 *   - Subscription is linked to job via linkedFirstJobId
 *   - Completion fails without cashCollectedAmount
 *   - Completion fails if cashCollectedAmount != cashToCollectAmount (strict validation)
 *   - Completion deducts collector float (platform share)
 *   - Completion creates CASH_SUBSCRIPTION_PLATFORM_SHARE ledger entry
 *   - Completion activates subscription (status ACTIVE, paymentStatus VERIFIED)
 *   - Completion sets remainingPickupsThisWeek = plan.pickupsPerWeek - 1
 *   - Second completion attempt does not deduct float again (idempotency)
 *   - Assignment skips collectors with insufficient float
 *   - Cancellation before pickup cancels linked job
 *   - Admin pending payments API includes cash subscriptions with linkedFirstJob
 */
import { app, httpServer, dataSource, baseUrl } from '../test-setup';
import * as request from 'supertest';
import { UserRole } from '../../src/common/enums/role.enum';
import { SubscriptionStatus } from '../../src/common/enums/subscription-status.enum';
import { PaymentStatus } from '../../src/common/enums/payment-status.enum';
import { PaymentMode } from '../../src/common/enums/payment-mode.enum';
import { CashCollectionType } from '../../src/common/enums/cash-collection-type.enum';
import { FloatLedgerType } from '../../src/wallet/entities/collector-float-ledger.entity';
import { createTestUser, loginAndGetToken } from '../helpers/test-utils';

describe('E2E: Cash on First Pickup Flow', () => {
  let householdToken: string;
  let collectorToken: string;
  let adminToken: string;
  let householdId: string;
  let collectorId: string;
  let adminId: string;
  let planId: string;

  const cleanupSubscriptions = async () => {
    try {
      await dataSource.query(`TRUNCATE TABLE "user_subscriptions" CASCADE`);
    } catch (_) {}
  };

  const cleanupJobs = async () => {
    try {
      await dataSource.query(`TRUNCATE TABLE "jobs" CASCADE`);
    } catch (_) {}
  };

  const cleanupFloatLedger = async () => {
    try {
      await dataSource.query(`TRUNCATE TABLE "collector_float_ledger" CASCADE`);
    } catch (_) {}
  };

  const cleanupPlans = async () => {
    try {
      await dataSource.query(
        `UPDATE "subscription_plans" SET "is_active" = false WHERE id = $1`,
        [planId],
      );
    } catch (_) {}
  };

  // ─── SETUP ──────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const household = await createTestUser(
      dataSource,
      'cashfp-household@test.com',
      'Household123!',
      UserRole.HOUSEHOLD,
      'Cash FP Household',
      '+237691000001',
    );
    householdId = household.id;

    const collector = await createTestUser(
      dataSource,
      'cashfp-collector@test.com',
      'Collector123!',
      UserRole.COLLECTOR,
      'Cash FP Collector',
      '+237691000002',
    );
    collectorId = collector.id;

    // Give collector sufficient float balance
    await dataSource.query(
      `UPDATE "users" SET "collector_float_balance" = 10000 WHERE id = $1`,
      [collectorId],
    );

    const admin = await createTestUser(
      dataSource,
      'cashfp-admin@test.com',
      'AdminPass123!',
      UserRole.ADMIN,
      'Cash FP Admin',
      '+237691000003',
    );
    adminId = admin.id;

    householdToken = await loginAndGetToken(baseUrl, '+237691000001', 'Household123!');
    collectorToken = await loginAndGetToken(baseUrl, '+237691000002', 'Collector123!');
    adminToken = await loginAndGetToken(baseUrl, '+237691000003', 'AdminPass123!');

    // Create a test subscription plan
    const planResult = await dataSource.query(
      `INSERT INTO "subscription_plans" (id, name, price, "pickups_per_week", "is_active", "created_at", "updated_at")
       VALUES (gen_random_uuid(), 'Cash FP Plan', 3500, 4, true, NOW(), NOW())
       RETURNING id`,
    );
    planId = planResult.rows[0].id;
  });

  beforeEach(async () => {
    await cleanupSubscriptions();
    await cleanupJobs();
    await cleanupFloatLedger();
  });

  afterAll(async () => {
    await cleanupSubscriptions();
    await cleanupJobs();
    await cleanupFloatLedger();
    await cleanupPlans();
  });

  // ─── TESTS ───────────────────────────────────────────────────────────────

  describe('POST /subscriptions/subscribe-cash-first-pickup', () => {
    it('should create subscription and linked job in one transaction', async () => {
      const response = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe-cash-first-pickup')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          scheduledDate: '2025-01-15',
          scheduledTime: '10:00',
          locationAddress: '123 Test Street',
          locationLat: 3.848,
          locationLng: 11.502,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('subscription');
      expect(response.body).toHaveProperty('job');

      const { subscription, job } = response.body;

      // Verify subscription
      expect(subscription.userId).toBe(householdId);
      expect(subscription.planId).toBe(planId);
      expect(subscription.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
      expect(subscription.paymentMode).toBe(PaymentMode.CASH_ON_FIRST_PICKUP);
      expect(subscription.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(subscription.linkedFirstJobId).toBe(job.id);

      // Verify job
      expect(job.householdId).toBe(householdId);
      expect(job.status).toBe('REQUESTED');
      expect(job.paymentMode).toBe(PaymentMode.CASH_ON_FIRST_PICKUP);
      expect(job.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(job.subscriptionId).toBe(subscription.id);
      expect(job.cashToCollectAmount).toBe(3500);
      expect(job.cashCollectionType).toBe(CashCollectionType.SUBSCRIPTION_FIRST_PICKUP);
      expect(job.quotedPrice).toBe(3500);
      expect(job.pricingType).toBe('SUBSCRIPTION');
      expect(job.isCoveredBySubscription).toBe(false);
    });

    it('should reject if user already has PENDING_PAYMENT subscription', async () => {
      // Create first subscription
      await request(httpServer)
        .post('/api/v1/subscriptions/subscribe-cash-first-pickup')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          scheduledDate: '2025-01-15',
          scheduledTime: '10:00',
          locationAddress: '123 Test Street',
        });

      // Try to create second subscription
      const response = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe-cash-first-pickup')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          scheduledDate: '2025-01-16',
          scheduledTime: '10:00',
          locationAddress: '123 Test Street',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already have a subscription awaiting payment');
    });

    it('should reject if user already has ACTIVE subscription', async () => {
      // Create an active subscription directly
      await dataSource.query(
        `INSERT INTO "user_subscriptions" 
         (id, user_id, plan_id, "start_date", "end_date", status, "payment_mode", "payment_status", "created_at", "updated_at")
         VALUES (gen_random_uuid(), $1, $2, NOW(), NOW() + INTERVAL '1 month', 'ACTIVE', 'WALLET', 'VERIFIED', NOW(), NOW())`,
        [householdId, planId],
      );

      const response = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe-cash-first-pickup')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          scheduledDate: '2025-01-15',
          scheduledTime: '10:00',
          locationAddress: '123 Test Street',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already have an active subscription');
    });

    it('should require authentication', async () => {
      const response = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe-cash-first-pickup')
        .send({
          planId,
          scheduledDate: '2025-01-15',
          scheduledTime: '10:00',
          locationAddress: '123 Test Street',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Job completion with cash confirmation', () => {
    let subscriptionId: string;
    let jobId: string;

    beforeEach(async () => {
      const response = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe-cash-first-pickup')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          scheduledDate: '2025-01-15',
          scheduledTime: '10:00',
          locationAddress: '123 Test Street',
        });

      subscriptionId = response.body.subscription.id;
      jobId = response.body.job.id;

      // Assign job to collector
      await dataSource.query(
        `UPDATE "jobs" SET "collector_id" = $1, status = 'ASSIGNED' WHERE id = $2`,
        [collectorId, jobId],
      );
    });

    it('should fail completion without cashCollectedAmount', async () => {
      const response = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({
          proofImageUrl: 'https://example.com/proof.jpg',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('cashCollectedAmount is required');
    });

    it('should fail completion if amount does not match (strict validation)', async () => {
      const response = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({
          proofImageUrl: 'https://example.com/proof.jpg',
          cashCollectedAmount: 3000, // Wrong amount
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('must equal cashToCollectAmount');
    });

    it('should complete job, deduct float, and activate subscription', async () => {
      // Get initial float balance
      const initialFloat = await dataSource.query(
        `SELECT "collector_float_balance" FROM "users" WHERE id = $1`,
        [collectorId],
      );
      const initialBalance = Number(initialFloat.rows[0].collector_float_balance);

      const response = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({
          proofImageUrl: 'https://example.com/proof.jpg',
          cashCollectedAmount: 3500, // Correct amount
        });

      expect(response.status).toBe(200);
      const job = response.body;
      expect(job.status).toBe('COMPLETED');
      expect(job.paymentStatus).toBe(PaymentStatus.VERIFIED);

      // Verify subscription activated
      const subscription = await dataSource.query(
        `SELECT * FROM "user_subscriptions" WHERE id = $1`,
        [subscriptionId],
      );
      expect(subscription.rows[0].status).toBe(SubscriptionStatus.ACTIVE);
      expect(subscription.rows[0].payment_status).toBe(PaymentStatus.VERIFIED);
      expect(subscription.rows[0].remaining_pickups_this_week).toBe(3); // 4 - 1

      // Verify float deducted (platform share)
      const finalFloat = await dataSource.query(
        `SELECT "collector_float_balance" FROM "users" WHERE id = $1`,
        [collectorId],
      );
      const finalBalance = Number(finalFloat.rows[0].collector_float_balance);
      expect(finalBalance).toBeLessThan(initialBalance);

      // Verify ledger entry created
      const ledger = await dataSource.query(
        `SELECT * FROM "collector_float_ledger" 
         WHERE "collector_id" = $1 AND "type" = $2 AND "subscription_id" = $3`,
        [collectorId, FloatLedgerType.CASH_SUBSCRIPTION_PLATFORM_SHARE, subscriptionId],
      );
      expect(ledger.rows.length).toBe(1);
      expect(ledger.rows[0].subscription_id).toBe(subscriptionId);
      expect(Number(ledger.rows[0].amount)).toBeLessThan(0); // Deduction
    });

    it('should be idempotent - second completion does not deduct float again', async () => {
      // First completion
      await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({
          proofImageUrl: 'https://example.com/proof.jpg',
          cashCollectedAmount: 3500,
        });

      // Get float after first completion
      const floatAfterFirst = await dataSource.query(
        `SELECT "collector_float_balance" FROM "users" WHERE id = $1`,
        [collectorId],
      );
      const balanceAfterFirst = Number(floatAfterFirst.rows[0].collector_float_balance);

      // Count ledger entries after first completion
      const ledgerCountAfterFirst = await dataSource.query(
        `SELECT COUNT(*) FROM "collector_float_ledger" 
         WHERE "collector_id" = $1 AND "type" = $2 AND "subscription_id" = $3`,
        [collectorId, FloatLedgerType.CASH_SUBSCRIPTION_PLATFORM_SHARE, subscriptionId],
      );
      const countAfterFirst = Number(ledgerCountAfterFirst.rows[0].count);

      // Second completion attempt
      const response = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('Authorization', `Bearer ${collectorToken}`)
        .send({
          proofImageUrl: 'https://example.com/proof.jpg',
          cashCollectedAmount: 3500,
        });

      expect(response.status).toBe(200);

      // Verify float not deducted again
      const floatAfterSecond = await dataSource.query(
        `SELECT "collector_float_balance" FROM "users" WHERE id = $1`,
        [collectorId],
      );
      const balanceAfterSecond = Number(floatAfterSecond.rows[0].collector_float_balance);
      expect(balanceAfterSecond).toBe(balanceAfterFirst);

      // Verify no new ledger entry
      const ledgerCountAfterSecond = await dataSource.query(
        `SELECT COUNT(*) FROM "collector_float_ledger" 
         WHERE "collector_id" = $1 AND "type" = $2 AND "subscription_id" = $3`,
        [collectorId, FloatLedgerType.CASH_SUBSCRIPTION_PLATFORM_SHARE, subscriptionId],
      );
      const countAfterSecond = Number(ledgerCountAfterSecond.rows[0].count);
      expect(countAfterSecond).toBe(countAfterFirst);
    });
  });

  describe('Assignment eligibility with float check', () => {
    let subscriptionId: string;
    let jobId: string;

    beforeEach(async () => {
      const response = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe-cash-first-pickup')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          scheduledDate: '2025-01-15',
          scheduledTime: '10:00',
          locationAddress: '123 Test Street',
        });

      subscriptionId = response.body.subscription.id;
      jobId = response.body.job.id;
    });

    it('should skip collectors with insufficient float', async () => {
      // Set collector float to insufficient amount
      await dataSource.query(
        `UPDATE "users" SET "collector_float_balance" = 100 WHERE id = $1`,
        [collectorId],
      );

      // Create another collector with sufficient float
      const collector2 = await createTestUser(
        dataSource,
        'cashfp-collector2@test.com',
        'Collector123!',
        UserRole.COLLECTOR,
        'Cash FP Collector 2',
        '+237691000004',
      );
      await dataSource.query(
        `UPDATE "users" SET "collector_float_balance" = 10000 WHERE id = $1`,
        [collector2.id],
      );

      // Get eligible collectors
      const response = await request(httpServer)
        .get(`/api/v1/jobs/${jobId}/eligible-collectors`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const collectors = response.body.collectors || response.body;

      // Verify collector with insufficient float is not in the list
      const insufficientCollector = collectors.find((c: any) => c.id === collectorId);
      expect(insufficientCollector).toBeUndefined();

      // Verify collector with sufficient float is in the list
      const sufficientCollector = collectors.find((c: any) => c.id === collector2.id);
      expect(sufficientCollector).toBeDefined();
    });
  });

  describe('Cancellation with linked job', () => {
    let subscriptionId: string;
    let jobId: string;

    beforeEach(async () => {
      const response = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe-cash-first-pickup')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          scheduledDate: '2025-01-15',
          scheduledTime: '10:00',
          locationAddress: '123 Test Street',
        });

      subscriptionId = response.body.subscription.id;
      jobId = response.body.job.id;
    });

    it('should cancel linked job when subscription is cancelled', async () => {
      const response = await request(httpServer)
        .post('/api/v1/subscriptions/cancel')
        .set('Authorization', `Bearer ${householdToken}`);

      expect(response.status).toBe(200);

      // Verify subscription cancelled
      const subscription = await dataSource.query(
        `SELECT * FROM "user_subscriptions" WHERE id = $1`,
        [subscriptionId],
      );
      expect(subscription.rows[0].status).toBe(SubscriptionStatus.CANCELLED);

      // Verify linked job cancelled
      const job = await dataSource.query(
        `SELECT * FROM "jobs" WHERE id = $1`,
        [jobId],
      );
      expect(job.rows[0].status).toBe('CANCELLED');
      expect(job.rows[0].cancellation_reason).toContain('Cash subscription cancelled');
    });

    it('should not cancel linked job if already in progress', async () => {
      // Set job to IN_PROGRESS
      await dataSource.query(
        `UPDATE "jobs" SET status = 'IN_PROGRESS', "collector_id" = $1 WHERE id = $2`,
        [collectorId, jobId],
      );

      await request(httpServer)
        .post('/api/v1/subscriptions/cancel')
        .set('Authorization', `Bearer ${householdToken}`);

      // Verify job not cancelled
      const job = await dataSource.query(
        `SELECT * FROM "jobs" WHERE id = $1`,
        [jobId],
      );
      expect(job.rows[0].status).toBe('IN_PROGRESS');
    });
  });

  describe('Admin backend visibility', () => {
    let subscriptionId: string;
    let jobId: string;

    beforeEach(async () => {
      const response = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe-cash-first-pickup')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          scheduledDate: '2025-01-15',
          scheduledTime: '10:00',
          locationAddress: '123 Test Street',
        });

      subscriptionId = response.body.subscription.id;
      jobId = response.body.job.id;
    });

    it('should include cash subscriptions in pending payments API with linked job', async () => {
      const response = await request(httpServer)
        .get('/api/v1/subscriptions/admin/pending-payments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const subscriptions = response.body;

      const cashSubscription = subscriptions.find((s: any) => s.id === subscriptionId);
      expect(cashSubscription).toBeDefined();
      expect(cashSubscription.paymentMode).toBe(PaymentMode.CASH_ON_FIRST_PICKUP);
      expect(cashSubscription.linkedFirstJobId).toBe(jobId);
      expect(cashSubscription.linkedFirstJob).toBeDefined();
      expect(cashSubscription.linkedFirstJob.id).toBe(jobId);
    });

    it('should require admin role for pending payments API', async () => {
      const response = await request(httpServer)
        .get('/api/v1/subscriptions/admin/pending-payments')
        .set('Authorization', `Bearer ${householdToken}`);

      expect(response.status).toBe(403);
    });
  });
});
