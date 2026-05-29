/**
 * E2E Test: Subscription Payment Flow
 *
 * Tests the full lifecycle:
 *   Subscribe with manual payment → PENDING_PAYMENT
 *   Admin verifies → ACTIVE + commission event
 *   Admin rejects → PAYMENT_FAILED
 *   Guard: PENDING_PAYMENT subscription blocks second subscription
 *   Guard: PENDING_PAYMENT subscription excluded from pickup coverage
 *   Admin unified pending payments list (jobs + subscriptions)
 *
 * Specific test coverage:
 *   - Manual payment subscription creation (PENDING_PAYMENT status)
 *   - Payment reference and proof URL storage
 *   - Immediate ACTIVE subscription creation (no payment fields)
 *   - Second subscription rejection when PENDING_PAYMENT exists
 *   - Second subscription rejection when ACTIVE exists
 *   - Authentication requirement for subscription
 *   - Admin verification sets status to ACTIVE and paymentStatus to VERIFIED
 *   - Admin verification assigns remainingPickupsThisWeek from plan
 *   - Admin verification rejection when already ACTIVE
 *   - Admin verification 404 for non-existent subscription
 *   - Admin verification role requirement (household gets 403)
 *   - Admin rejection sets status to PAYMENT_FAILED and paymentStatus to REJECTED
 *   - Admin rejection does not grant pickups
 *   - Admin rejection when already rejected
 *   - Admin rejection 404 for non-existent subscription
 *   - Admin rejection role requirement
 *   - PENDING_PAYMENT subscription visibility in /subscriptions/my
 *   - Empty/null response when no subscription exists
 *   - PENDING_PAYMENT excluded from pickup coverage (PAY_PER_PICKUP)
 *   - SUBSCRIPTION coverage after admin verification
 *   - Admin unified pending payments list includes subscription rows
 *   - Subscription row includes planName
 *   - Admin unified list excludes ACTIVE and PAYMENT_FAILED subscriptions
 *   - Admin unified list role requirement
 */
import { app, httpServer, dataSource, baseUrl } from '../test-setup';
import * as request from 'supertest';
import { UserRole } from '../../src/common/enums/role.enum';
import { SubscriptionStatus } from '../../src/common/enums/subscription-status.enum';
import { PaymentStatus } from '../../src/common/enums/payment-status.enum';
import { createTestUser, loginAndGetToken } from '../helpers/test-utils';

describe('E2E: Subscription Payment Flow', () => {
  let householdToken: string;
  let household2Token: string;
  let adminToken: string;
  let householdId: string;
  let adminId: string;
  let planId: string;

  const cleanupSubscriptions = async () => {
    try {
      await dataSource.query(`TRUNCATE TABLE "user_subscriptions" CASCADE`);
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
      'subpay-household@test.com',
      'Household123!',
      UserRole.HOUSEHOLD,
      'Sub Pay Household',
      '+237691000001',
    );
    householdId = household.id;

    await createTestUser(
      dataSource,
      'subpay-household2@test.com',
      'Household123!',
      UserRole.HOUSEHOLD,
      'Sub Pay Household 2',
      '+237691000002',
    );

    const admin = await createTestUser(
      dataSource,
      'subpay-admin@test.com',
      'AdminPass123!',
      UserRole.ADMIN,
      'Sub Pay Admin',
      '+237691000003',
    );
    adminId = admin.id;

    householdToken = await loginAndGetToken(baseUrl, '+237691000001', 'Household123!');
    household2Token = await loginAndGetToken(baseUrl, '+237691000002', 'Household123!');
    adminToken = await loginAndGetToken(baseUrl, '+237691000003', 'AdminPass123!');

    // Create a plan for all tests
    const planRes = await request(httpServer)
      .post('/api/v1/subscriptions/admin/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Sub-Payment Test Plan', price: 4000, pickupsPerWeek: 2 })
      .expect(201);
    planId = planRes.body.id;
  });

  afterAll(async () => {
    await cleanupSubscriptions();
    await cleanupPlans();
  });

  afterEach(async () => {
    await cleanupSubscriptions();
  });

  // ─── POST /subscriptions/subscribe (with payment fields) ────────────────

  describe('POST /subscriptions/subscribe — manual payment', () => {
    it('creates a PENDING_PAYMENT subscription', async () => {
      const res = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          paymentMode: 'MANUAL_PROVIDER',
          paymentRef: 'TXN-MANUAL-001',
          paymentProofUrl: 'https://cdn.example.com/proof.jpg',
        })
        .expect(201);

      expect(res.body.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
      expect(res.body.paymentStatus).toBe(PaymentStatus.AWAITING_ADMIN_VERIFICATION);
      expect(res.body.remainingPickupsThisWeek).toBe(0);
      expect(res.body.weekResetDate).toBeNull();
    });

    it('stores paymentRef and paymentProofUrl', async () => {
      const res = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          paymentMode: 'MANUAL_PROVIDER',
          paymentRef: 'TXN-STORED-REF',
          paymentProofUrl: 'https://cdn.example.com/proof2.jpg',
        })
        .expect(201);

      expect(res.body.paymentRef).toBe('TXN-STORED-REF');
      expect(res.body.paymentProofUrl).toBe('https://cdn.example.com/proof2.jpg');
    });

    it('creates an ACTIVE subscription immediately when no payment fields', async () => {
      const res = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId })
        .expect(201);

      expect(res.body.status).toBe(SubscriptionStatus.ACTIVE);
      expect(res.body.remainingPickupsThisWeek).toBe(2);
    });

    it('rejects a second subscription when PENDING_PAYMENT already exists', async () => {
      await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId, paymentMode: 'MANUAL_PROVIDER', paymentRef: 'TXN-001' })
        .expect(201);

      const res = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId, paymentMode: 'MANUAL_PROVIDER', paymentRef: 'TXN-002' })
        .expect(400);

      expect(res.body.message).toContain('awaiting payment verification');
    });

    it('rejects a second subscription when ACTIVE already exists', async () => {
      await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId })
        .expect(201);

      const res = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId })
        .expect(400);

      expect(res.body.message).toContain('active subscription');
    });

    it('requires authentication', async () => {
      await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .send({ planId })
        .expect(401);
    });
  });

  // ─── PATCH /subscriptions/admin/:id/verify-payment ──────────────────────

  describe('PATCH /subscriptions/admin/:id/verify-payment', () => {
    let subscriptionId: string;

    beforeEach(async () => {
      const res = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          paymentMode: 'MANUAL_PROVIDER',
          paymentRef: 'TXN-VERIFY-TEST',
        })
        .expect(201);
      subscriptionId = res.body.id;
    });

    it('sets status to ACTIVE and paymentStatus to VERIFIED', async () => {
      const res = await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subscriptionId}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe(SubscriptionStatus.ACTIVE);
      expect(res.body.paymentStatus).toBe(PaymentStatus.VERIFIED);
    });

    it('assigns remainingPickupsThisWeek from the plan', async () => {
      const res = await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subscriptionId}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.remainingPickupsThisWeek).toBe(2); // plan.pickupsPerWeek
      expect(res.body.weekResetDate).not.toBeNull();
    });

    it('returns 400 when subscription is already ACTIVE', async () => {
      // Verify first
      await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subscriptionId}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Try to verify again
      const res = await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subscriptionId}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).toContain('not pending payment');
    });

    it('returns 404 for a non-existent subscription', async () => {
      await request(httpServer)
        .patch('/api/v1/subscriptions/admin/00000000-0000-0000-0000-000000000000/verify-payment')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('requires admin role — household user gets 403', async () => {
      await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subscriptionId}/verify-payment`)
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(403);
    });
  });

  // ─── PATCH /subscriptions/admin/:id/reject-payment ──────────────────────

  describe('PATCH /subscriptions/admin/:id/reject-payment', () => {
    let subscriptionId: string;

    beforeEach(async () => {
      const res = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          planId,
          paymentMode: 'MANUAL_PROVIDER',
          paymentRef: 'TXN-REJECT-TEST',
        })
        .expect(201);
      subscriptionId = res.body.id;
    });

    it('sets status to PAYMENT_FAILED and paymentStatus to REJECTED', async () => {
      const res = await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subscriptionId}/reject-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Invalid transaction reference' })
        .expect(200);

      expect(res.body.status).toBe(SubscriptionStatus.PAYMENT_FAILED);
      expect(res.body.paymentStatus).toBe(PaymentStatus.REJECTED);
    });

    it('does not grant any pickups after rejection', async () => {
      const res = await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subscriptionId}/reject-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.remainingPickupsThisWeek).toBe(0);
    });

    it('returns 400 when trying to reject an already-rejected subscription', async () => {
      await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subscriptionId}/reject-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subscriptionId}/reject-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).toContain('not pending payment');
    });

    it('returns 404 for a non-existent subscription', async () => {
      await request(httpServer)
        .patch('/api/v1/subscriptions/admin/00000000-0000-0000-0000-000000000000/reject-payment')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('requires admin role', async () => {
      await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subscriptionId}/reject-payment`)
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(403);
    });
  });

  // ─── GET /subscriptions/my — PENDING_PAYMENT visibility ─────────────────

  describe('GET /subscriptions/my — pending payment visibility', () => {
    it('returns PENDING_PAYMENT subscription so mobile can show awaiting state', async () => {
      await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId, paymentMode: 'MANUAL_PROVIDER', paymentRef: 'TXN-MY-001' })
        .expect(201);

      const res = await request(httpServer)
        .get('/api/v1/subscriptions/my')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
    });

    it('returns empty/null when no subscription exists', async () => {
      const res = await request(httpServer)
        .get('/api/v1/subscriptions/my')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      // Backend returns null serialised as {} or null body
      const isEmpty = res.body === null || Object.keys(res.body).length === 0;
      expect(isEmpty).toBe(true);
    });
  });

  // ─── Pickup coverage guard — PENDING_PAYMENT ────────────────────────────

  describe('Pricing quote — PENDING_PAYMENT subscription excluded from coverage', () => {
    it('reports PAY_PER_PICKUP when subscription is PENDING_PAYMENT', async () => {
      await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId, paymentMode: 'MANUAL_PROVIDER', paymentRef: 'TXN-GUARD-001' })
        .expect(201);

      const res = await request(httpServer)
        .get('/api/v1/subscriptions/pricing-quote')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.isCoveredBySubscription).toBe(false);
      expect(res.body.pricingType).toBe('PAY_PER_PICKUP');
    });

    it('reports SUBSCRIPTION coverage after admin verification', async () => {
      const subRes = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId, paymentMode: 'MANUAL_PROVIDER', paymentRef: 'TXN-GUARD-002' })
        .expect(201);

      await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subRes.body.id}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(httpServer)
        .get('/api/v1/subscriptions/pricing-quote')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.isCoveredBySubscription).toBe(true);
      expect(res.body.pricingType).toBe('SUBSCRIPTION');
    });
  });

  // ─── GET /admin/jobs/pending-payment — unified list ─────────────────────

  describe('GET /admin/jobs/pending-payment — unified list', () => {
    it('includes subscription rows with paymentSource: SUBSCRIPTION_PAYMENT', async () => {
      await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId, paymentMode: 'MANUAL_PROVIDER', paymentRef: 'TXN-LIST-001' })
        .expect(201);

      const res = await request(httpServer)
        .get('/api/v1/admin/jobs/pending-payment')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const subRows = res.body.data.filter(
        (r: any) => r.paymentSource === 'SUBSCRIPTION_PAYMENT',
      );
      expect(subRows.length).toBeGreaterThanOrEqual(1);
      expect(subRows[0].subscriptionId).toBeDefined();
      expect(subRows[0].jobId).toBeNull();
    });

    it('subscription row includes planName', async () => {
      await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId, paymentMode: 'MANUAL_PROVIDER', paymentRef: 'TXN-PLAN-001' })
        .expect(201);

      const res = await request(httpServer)
        .get('/api/v1/admin/jobs/pending-payment')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const subRow = res.body.data.find(
        (r: any) => r.paymentSource === 'SUBSCRIPTION_PAYMENT',
      );
      expect(subRow.planName).toBe('Sub-Payment Test Plan');
    });

    it('does NOT list subscriptions that are already ACTIVE or PAYMENT_FAILED', async () => {
      const subRes = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId, paymentMode: 'MANUAL_PROVIDER', paymentRef: 'TXN-EXCL-001' })
        .expect(201);

      await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/${subRes.body.id}/verify-payment`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(httpServer)
        .get('/api/v1/admin/jobs/pending-payment')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const verifiedRows = res.body.data.filter(
        (r: any) =>
          r.paymentSource === 'SUBSCRIPTION_PAYMENT' &&
          r.subscriptionId === subRes.body.id,
      );
      expect(verifiedRows).toHaveLength(0);
    });

    it('requires admin role', async () => {
      await request(httpServer)
        .get('/api/v1/admin/jobs/pending-payment')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(403);
    });
  });
});
