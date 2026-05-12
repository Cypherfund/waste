/**
 * E2E Test: Pricing Integration
 *
 * Tests the complete pricing flow:
 *   Get pricing quote → Create job with pricing → Verify pricing stored
 *   Test subscription coverage → Test pickup consumption
 */
import { app, httpServer, dataSource, baseUrl } from '../test-setup';
import * as request from 'supertest';
import { UserRole } from '../../src/common/enums/role.enum';
import { JobStatus } from '../../src/common/enums/job-status.enum';
import { PricingType } from '../../src/common/enums/pricing-type.enum';
import { createTestUser, loginAndGetToken } from '../helpers/test-utils';

describe('E2E: Pricing Integration', () => {
  let householdToken: string;
  let adminToken: string;
  let householdId: string;
  let adminId: string;
  let planId: string;
  let subscriptionId: string;

  // ─── SETUP ────────────────────────────────────────────────────

  beforeAll(async () => {
    // Create test users
    const household = await createTestUser(
      dataSource,
      'pricing-household@test.com',
      'Household123!',
      UserRole.HOUSEHOLD,
      'Pricing Household',
      '+237690000010',
    );
    householdId = household.id;

    const admin = await createTestUser(
      dataSource,
      'pricing-admin@test.com',
      'AdminPass123!',
      UserRole.ADMIN,
      'Pricing Admin',
      '+237690000011',
    );
    adminId = admin.id;

    // Login users
    householdToken = await loginAndGetToken(baseUrl, '+237690000010', 'Household123!');
    adminToken = await loginAndGetToken(baseUrl, '+237690000011', 'AdminPass123!');

    // Create a subscription plan via admin
    const planResponse = await request(httpServer)
      .post('/api/v1/subscriptions/admin/plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Plan',
        price: 3500,
        pickupsPerWeek: 3,
        description: 'Test plan for pricing e2e',
      });

    planId = planResponse.body.id;
  });

  afterAll(async () => {
    // Cleanup subscription if created
    if (subscriptionId) {
      await request(httpServer)
        .post('/api/v1/subscriptions/cancel')
        .set('Authorization', `Bearer ${householdToken}`);
    }

    // Cleanup plan
    if (planId) {
      await request(httpServer)
        .patch(`/api/v1/subscriptions/admin/plans/${planId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
    }
  });

  // ─── TESTS ───────────────────────────────────────────────────

  describe('GET /subscriptions/pricing-quote', () => {
    it('should return pay-per-pickup pricing for user without subscription', async () => {
      const response = await request(httpServer)
        .get('/api/v1/subscriptions/pricing-quote')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        quotedPrice: expect.any(Number),
        pricingType: 'PAY_PER_PICKUP',
        isCoveredBySubscription: false,
        remainingPickupsThisWeek: null,
        planName: null,
        perPickupPrice: expect.any(Number),
        subscriptionPrice: expect.any(Number),
      });

      expect(response.body.quotedPrice).toBeGreaterThan(0);
      expect(response.body.subscriptionSavingsMessage).toContain('save up to');
    });

    it('should require authentication', async () => {
      await request(httpServer)
        .get('/api/v1/subscriptions/pricing-quote')
        .expect(401);
    });

    it('should require household role', async () => {
      await request(httpServer)
        .get('/api/v1/subscriptions/pricing-quote')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('POST /jobs with pricing integration', () => {
    it('should create job with pricing info stored', async () => {
      const response = await request(httpServer)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          scheduledTime: '09:00-12:00',
          locationAddress: 'Test Address, Yaounde',
          locationLat: 3.848,
          locationLng: 11.502,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        quotedPrice: expect.any(Number),
        pricingType: 'PAY_PER_PICKUP',
        isCoveredBySubscription: false,
      });

      expect(response.body.quotedPrice).toBeGreaterThan(0);
    });

    it('should store pricing type as SUBSCRIPTION when covered', async () => {
      // Subscribe user
      const subResponse = await request(httpServer)
        .post('/api/v1/subscriptions/subscribe')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({ planId })
        .expect(201);

      subscriptionId = subResponse.body.id;

      // Create job - should be covered by subscription
      const jobResponse = await request(httpServer)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          scheduledTime: '09:00-12:00',
          locationAddress: 'Test Address, Yaounde',
          locationLat: 3.848,
          locationLng: 11.502,
        })
        .expect(201);

      expect(jobResponse.body).toMatchObject({
        quotedPrice: 0,
        pricingType: 'SUBSCRIPTION',
        isCoveredBySubscription: true,
      });
    });

    it('should consume pickup when job is covered by subscription', async () => {
      // Get initial quote with remaining pickups
      const quoteBefore = await request(httpServer)
        .get('/api/v1/subscriptions/pricing-quote')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      const initialPickups = quoteBefore.body.remainingPickupsThisWeek;

      // Create job
      await request(httpServer)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          scheduledTime: '10:00-13:00',
          locationAddress: 'Test Address 2, Yaounde',
          locationLat: 3.849,
          locationLng: 11.503,
        })
        .expect(201);

      // Get quote again - pickups should be consumed
      const quoteAfter = await request(httpServer)
        .get('/api/v1/subscriptions/pricing-quote')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(quoteAfter.body.remainingPickupsThisWeek).toBe(initialPickups - 1);
    });

    it('should return pay-per-pickup when subscription pickups exhausted', async () => {
      // Create jobs to exhaust pickups
      for (let i = 0; i < 3; i++) {
        await request(httpServer)
          .post('/api/v1/jobs')
          .set('Authorization', `Bearer ${householdToken}`)
          .send({
            scheduledDate: new Date(Date.now() + 86400000 + i * 86400000).toISOString().split('T')[0],
            scheduledTime: `${9 + i}:00-${12 + i}:00`,
            locationAddress: `Test Address ${i}, Yaounde`,
            locationLat: 3.848 + i * 0.001,
            locationLng: 11.502 + i * 0.001,
          })
          .expect(201);
      }

      // Get quote - should show 0 remaining
      const quote = await request(httpServer)
        .get('/api/v1/subscriptions/pricing-quote')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(quote.body.remainingPickupsThisWeek).toBe(0);
      expect(quote.body.isCoveredBySubscription).toBe(false);

      // Create another job - should be pay-per-pickup
      const jobResponse = await request(httpServer)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${householdToken}`)
        .send({
          scheduledDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
          scheduledTime: '14:00-17:00',
          locationAddress: 'Test Address Final, Yaounde',
          locationLat: 3.852,
          locationLng: 11.506,
        })
        .expect(201);

      expect(jobResponse.body).toMatchObject({
        quotedPrice: expect.any(Number),
        pricingType: 'PAY_PER_PICKUP',
        isCoveredBySubscription: false,
      });

      expect(jobResponse.body.quotedPrice).toBeGreaterThan(0);
    });
  });

  describe('GET /jobs with pricing fields', () => {
    it('should include pricing fields in job response', async () => {
      const response = await request(httpServer)
        .get('/api/v1/jobs/mine')
        .set('Authorization', `Bearer ${householdToken}`)
        .expect(200);

      const jobs = response.body.data;
      expect(jobs.length).toBeGreaterThan(0);

      const firstJob = jobs[0];
      expect(firstJob).toHaveProperty('quotedPrice');
      expect(firstJob).toHaveProperty('pricingType');
      expect(firstJob).toHaveProperty('isCoveredBySubscription');
    });
  });
});
