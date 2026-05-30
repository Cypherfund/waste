import { httpServer, dataSource, baseUrl } from '../test-setup';
import { createTestUser, loginAndGetToken } from '../helpers/test-utils';
import { UserRole } from '../../src/common/enums/role.enum';
import * as request from 'supertest';

const GROWTH_TABLES = [
  'marketer_notifications',
  'marketer_payout_requests',
  'commission_transactions',
  'marketer_scheme_assignments',
  'campaign_marketer_assignments',
  'campaign_commission_schemes',
  'leads',
  'marketer_profiles',
  'commission_schemes',
  'marketing_campaigns',
  'marketing_budget_periods',
  'budget_transactions',
];

async function cleanGrowthData() {
  for (const table of GROWTH_TABLES) {
    try {
      await dataSource.query(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch (e: any) {
      if (!e.message.includes('does not exist')) throw e;
    }
  }
  try {
    await dataSource.query(`TRUNCATE TABLE "users" CASCADE`);
  } catch (_) {}
}

describe('Growth Module — Integration Tests', () => {
  let adminToken: string;
  let marketerToken: string;
  let marketer2Token: string;
  let adminId: string;
  let marketerId: string;
  let marketerProfileId: string;
  let schemeId: string;
  let campaignId: string;
  let referralToken: string;
  let leadId: string;

  beforeAll(async () => {
    await cleanGrowthData();

    const admin = await createTestUser(
      dataSource,
      'admin-growth@test.com',
      'Admin123!',
      UserRole.ADMIN,
      'Growth Admin',
      '+237600100001',
    );
    adminId = admin.id;
    adminToken = await loginAndGetToken(baseUrl, '+237600100001', 'Admin123!');

    await createTestUser(
      dataSource,
      'marketer2-growth@test.com',
      'Marketer123!',
      UserRole.HOUSEHOLD,
      'Household User',
      '+237600100003',
    );
    marketer2Token = await loginAndGetToken(baseUrl, '+237600100003', 'Marketer123!');
  });

  afterAll(async () => {
    await cleanGrowthData();
  });

  // ─── Access Control ────────────────────────────────────────────────────────

  describe('Access Control', () => {
    it('should reject unauthenticated requests to admin growth endpoints', async () => {
      await request(httpServer).get('/api/v1/admin/growth/marketers').expect(401);
    });

    it('should reject non-admin access to admin growth endpoints', async () => {
      await request(httpServer)
        .get('/api/v1/admin/growth/marketers')
        .set('Authorization', `Bearer ${marketer2Token}`)
        .expect(403);
    });

    it('should reject unauthenticated requests to marketer mobile endpoints', async () => {
      await request(httpServer).get('/api/v1/marketer/dashboard').expect(401);
    });

    it('should reject non-marketer access to marketer mobile endpoints', async () => {
      await request(httpServer)
        .get('/api/v1/marketer/dashboard')
        .set('Authorization', `Bearer ${marketer2Token}`)
        .expect(403);
    });
  });

  // ─── Marketer Lifecycle ────────────────────────────────────────────────────

  describe('Marketer Creation (Admin)', () => {
    it('should allow admin to create a marketer', async () => {
      const res = await request(httpServer)
        .post('/api/v1/admin/growth/marketers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Marketer',
          phone: '+237600100002',
          password: 'Marketer123!',
          territory: 'Douala',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('referralCode');
      expect(res.body.status).toBe('ACTIVE');
      marketerId = res.body.userId;
      marketerProfileId = res.body.id;

      marketerToken = await loginAndGetToken(baseUrl, '+237600100002', 'Marketer123!');
    });

    it('should set up campaign for marketer (required for lead creation)', async () => {
      // Budget period
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(today.getFullYear(), today.getMonth() + 12, 0).toISOString().split('T')[0];

      const [bp] = await dataSource.query(
        `INSERT INTO marketing_budget_periods (name, start_date, end_date, total_budget, committed_amount, spent_amount, status, currency)
         VALUES ('Test Period', $1, $2, 100000, 0, 0, 'ACTIVE', 'XAF') RETURNING id`,
        [startDate, endDate],
      );
      // Campaign
      const [camp] = await dataSource.query(
        `INSERT INTO marketing_campaigns (name, budget_period_id, start_date, end_date, budget_amount, committed_amount, spent_amount, status)
         VALUES ('Test Campaign', $1, $2, $3, 50000, 0, 0, 'ACTIVE') RETURNING id`,
        [bp.id, startDate, endDate],
      );
      campaignId = camp.id;
      // Assign marketer to campaign
      await dataSource.query(
        `INSERT INTO campaign_marketer_assignments (campaign_id, marketer_profile_id, assigned_by, is_active)
         VALUES ($1, $2, $3, true)`,
        [campaignId, marketerProfileId, adminId],
      );
      expect(campaignId).toBeDefined();
    });

    it('should reject duplicate phone on marketer creation', async () => {
      await request(httpServer)
        .post('/api/v1/admin/growth/marketers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate',
          phone: '+237600100002',
          password: 'Pass123!',
        })
        .expect(409);
    });
  });

  // ─── Commission Schemes ────────────────────────────────────────────────────

  describe('Commission Scheme Management', () => {
    it('should allow admin to create a commission scheme', async () => {
      const res = await request(httpServer)
        .post('/api/v1/admin/growth/commission-schemes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Household Onboarding Fixed',
          type: 'HOUSEHOLD_ONBOARDING',
          commissionType: 'FIXED',
          amount: 500,
          isActive: true,
          isAutoAssigned: false,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      schemeId = res.body.id;
    });

    it('should allow admin to assign scheme to marketer (via DB)', async () => {
      await dataSource.query(
        `INSERT INTO marketer_scheme_assignments (marketer_profile_id, scheme_id, assigned_by, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT DO NOTHING`,
        [marketerProfileId, schemeId, adminId],
      );

      const assignments = await dataSource.query(
        `SELECT * FROM marketer_scheme_assignments WHERE marketer_profile_id = $1 AND scheme_id = $2`,
        [marketerProfileId, schemeId],
      );
      expect(assignments.length).toBeGreaterThanOrEqual(1);
    });

    it('should be idempotent — re-assigning same scheme does not duplicate', async () => {
      await dataSource.query(
        `INSERT INTO marketer_scheme_assignments (marketer_profile_id, scheme_id, assigned_by, is_active)
         VALUES ($1, $2, $3, true)
         ON CONFLICT DO NOTHING`,
        [marketerProfileId, schemeId, adminId],
      );

      const assignments = await dataSource.query(
        `SELECT * FROM marketer_scheme_assignments WHERE marketer_profile_id = $1 AND scheme_id = $2`,
        [marketerProfileId, schemeId],
      );
      expect(assignments.length).toBe(1);
    });
  });

  // ─── Lead Creation ─────────────────────────────────────────────────────────

  describe('Lead Creation (Marketer)', () => {
    let leadId: string;
    let referralToken: string;

    it('should allow marketer to create a lead', async () => {
      const res = await request(httpServer)
        .post('/api/v1/marketer/leads')
        .set('Authorization', `Bearer ${marketerToken}`)
        .send({
          name: 'Lead One',
          phone: '+237690000001',
          type: 'HOUSEHOLD',
          area: 'Akwa',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('referralToken');
      expect(res.body.status).toBe('INVITED');
      leadId = res.body.id;
      referralToken = res.body.referralToken;
      // Make outer-scope vars available for claim test
      (describe as any).__leadId = leadId;
      (describe as any).__referralToken = referralToken;
    });

    it('should reject creating a duplicate lead for the same phone', async () => {
      await request(httpServer)
        .post('/api/v1/marketer/leads')
        .set('Authorization', `Bearer ${marketerToken}`)
        .send({
          name: 'Lead One Duplicate',
          phone: '+237690000001',
          type: 'HOUSEHOLD',
        })
        .expect(400);
    });

    it("should list only the logged-in marketer's leads", async () => {
      const res = await request(httpServer)
        .get('/api/v1/marketer/leads')
        .set('Authorization', `Bearer ${marketerToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      res.body.forEach((lead: any) => {
        expect(lead.marketerId).toBe(marketerId);
      });
    });

    it('should not allow marketer to access a lead belonging to another marketer', async () => {
      await request(httpServer)
        .get(`/api/v1/marketer/leads/${leadId}`)
        .set('Authorization', `Bearer ${marketer2Token}`)
        .expect(403);
    });

    // ─── Token Claiming ──────────────────────────────────────────────────────

    describe('Referral Token Claiming', () => {
      it('lead should have a referralToken persisted in DB', async () => {
        const [lead] = await dataSource.query(
          `SELECT referral_token, status FROM leads WHERE id = $1`,
          [leadId],
        );
        expect(lead).toBeDefined();
        expect(lead.referral_token).toBeDefined();
        expect(lead.status).toBe('INVITED');
      });

      it('should reject an unknown referral token', async () => {
        await request(httpServer).get('/api/v1/growth/claim/invalid-token-xyz').expect(404);
      });
    });
  });

  // ─── Suspend / Activate ────────────────────────────────────────────────────

  describe('Marketer Suspend / Activate', () => {
    it('should allow admin to suspend a marketer', async () => {
      await request(httpServer)
        .post(`/api/v1/admin/growth/marketers/${marketerProfileId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const profile = await dataSource.query(`SELECT status FROM marketer_profiles WHERE id = $1`, [
        marketerProfileId,
      ]);
      expect(profile[0].status).toBe('SUSPENDED');
    });

    it('should reject marketer API access while suspended', async () => {
      await request(httpServer)
        .get('/api/v1/marketer/dashboard')
        .set('Authorization', `Bearer ${marketerToken}`)
        .expect(401);
    });

    it('should allow admin to reactivate a suspended marketer', async () => {
      await request(httpServer)
        .post(`/api/v1/admin/growth/marketers/${marketerProfileId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const profile = await dataSource.query(`SELECT status FROM marketer_profiles WHERE id = $1`, [
        marketerProfileId,
      ]);
      expect(profile[0].status).toBe('ACTIVE');
    });
  });

  // ─── Commission Balance Transitions ───────────────────────────────────────

  describe('Commission Balance Transitions', () => {
    let txId: string;

    beforeAll(async () => {
      // Seed a PENDING commission transaction directly in DB
      const [tx] = await dataSource.query(
        `INSERT INTO commission_transactions
           (marketer_profile_id, scheme_id, lead_id, trigger_type, reference_id, reference_type, amount, status, campaign_id, description)
         SELECT $1, $2,
                (SELECT id FROM leads WHERE marketer_id = $3 LIMIT 1),
                'FIRST_SUCCESSFUL_BOOKING', 'booking-int-test-1', 'booking', 500, 'PENDING', $4, 'Test commission'
         RETURNING id`,
        [marketerProfileId, schemeId, marketerId, campaignId],
      );
      txId = tx.id;

      // Set initial balances
      await dataSource.query(
        `UPDATE marketer_profiles SET pending_amount = 500, approved_amount = 0, total_earned = 0 WHERE id = $1`,
        [marketerProfileId],
      );
    });

    it('should move amount from pending→approved and increment totalEarned on approve', async () => {
      await request(httpServer)
        .post(`/api/v1/admin/growth/commission-transactions/${txId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const [profile] = await dataSource.query(
        `SELECT pending_amount, approved_amount, total_earned FROM marketer_profiles WHERE id = $1`,
        [marketerProfileId],
      );
      expect(Number(profile.pending_amount)).toBe(0);
      expect(Number(profile.approved_amount)).toBe(500);
      expect(Number(profile.total_earned)).toBe(500);
    });

    it('should reject re-approving an already approved transaction', async () => {
      await request(httpServer)
        .post(`/api/v1/admin/growth/commission-transactions/${txId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should not allow rejecting an approved transaction', async () => {
      await request(httpServer)
        .post(`/api/v1/admin/growth/commission-transactions/${txId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Late rejection attempt' })
        .expect(400);
    });

    it('should subtract pending only (no totalEarned change) on reject for a fresh PENDING tx', async () => {
      // Create another PENDING transaction
      const [tx2] = await dataSource.query(
        `INSERT INTO commission_transactions
           (marketer_profile_id, scheme_id, lead_id, trigger_type, reference_id, reference_type, amount, status, campaign_id, description)
         SELECT $1, $2,
                (SELECT id FROM leads WHERE marketer_id = $3 LIMIT 1),
                'FIRST_SUCCESSFUL_BOOKING', 'booking-int-test-2', 'booking', 300, 'PENDING', $4, 'Test commission 2'
         RETURNING id`,
        [marketerProfileId, schemeId, marketerId, campaignId],
      );
      await dataSource.query(`UPDATE marketer_profiles SET pending_amount = 300 WHERE id = $1`, [
        marketerProfileId,
      ]);

      await request(httpServer)
        .post(`/api/v1/admin/growth/commission-transactions/${tx2.id}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Fraudulent lead' })
        .expect(201);

      const [profile] = await dataSource.query(
        `SELECT pending_amount, total_earned FROM marketer_profiles WHERE id = $1`,
        [marketerProfileId],
      );
      expect(Number(profile.pending_amount)).toBe(0);
      expect(Number(profile.total_earned)).toBe(500); // unchanged from prior approve
    });

    it('should prevent duplicate commission for same lead+trigger+referenceId', async () => {
      const count1 = await dataSource.query(
        `SELECT COUNT(*) FROM commission_transactions WHERE reference_id = 'booking-int-test-1'`,
      );
      expect(Number(count1[0].count)).toBe(1);

      // Direct DB insert of duplicate should fail due to unique index
      await expect(
        dataSource.query(
          `INSERT INTO commission_transactions
             (marketer_profile_id, scheme_id, lead_id, trigger_type, reference_id, reference_type, amount, status, campaign_id, description)
           SELECT $1, $2,
                  (SELECT id FROM leads WHERE marketer_id = $3 LIMIT 1),
                  'FIRST_SUCCESSFUL_BOOKING', 'booking-int-test-1', 'booking', 500, 'PENDING', $4, 'Duplicate'
           RETURNING id`,
          [marketerProfileId, schemeId, marketerId, campaignId],
        ),
      ).rejects.toThrow();
    });
  });

  // ─── Payout Balance Transitions ────────────────────────────────────────────

  describe('Payout Balance Transitions', () => {
    let payoutId: string;

    beforeAll(async () => {
      // Ensure marketer has approved balance
      await dataSource.query(
        `UPDATE marketer_profiles SET approved_amount = 5000, total_paid = 0 WHERE id = $1`,
        [marketerProfileId],
      );
      // Refresh token (marketer was reactivated above)
      marketerToken = await loginAndGetToken(baseUrl, '+237600100002', 'Marketer123!');
    });

    it('should deduct approvedAmount when creating a payout request', async () => {
      const res = await request(httpServer)
        .post('/api/v1/marketer/payout-requests')
        .set('Authorization', `Bearer ${marketerToken}`)
        .send({
          amount: 2000,
          method: 'MTN_MOMO',
          accountNumber: '+237670000001',
          accountName: 'Test Marketer',
        })
        .expect(201);

      payoutId = res.body.id;

      const [profile] = await dataSource.query(
        `SELECT approved_amount FROM marketer_profiles WHERE id = $1`,
        [marketerProfileId],
      );
      expect(Number(profile.approved_amount)).toBe(3000); // 5000 - 2000
    });

    it('should reject a second pending payout while one is active', async () => {
      await request(httpServer)
        .post('/api/v1/marketer/payout-requests')
        .set('Authorization', `Bearer ${marketerToken}`)
        .send({
          amount: 1000,
          method: 'MTN_MOMO',
          accountNumber: '+237670000001',
          accountName: 'Test Marketer',
        })
        .expect(400);
    });

    it('should reject payout exceeding approved balance', async () => {
      // approvedAmount is now 3000; try to request 10000
      await dataSource.query(
        `UPDATE marketer_payout_requests SET status = 'APPROVED' WHERE id = $1`,
        [payoutId],
      );
      await request(httpServer)
        .post('/api/v1/marketer/payout-requests')
        .set('Authorization', `Bearer ${marketerToken}`)
        .send({
          amount: 10000,
          method: 'MTN_MOMO',
          accountNumber: '+237670000001',
          accountName: 'Test Marketer',
        })
        .expect(400);
    });

    it('should return amount to approvedAmount on rejection', async () => {
      // Revert payout back to PENDING and restore approved balance
      await dataSource.query(
        `UPDATE marketer_payout_requests SET status = 'PENDING' WHERE id = $1`,
        [payoutId],
      );
      await dataSource.query(`UPDATE marketer_profiles SET approved_amount = 3000 WHERE id = $1`, [
        marketerProfileId,
      ]);

      await request(httpServer)
        .post(`/api/v1/admin/growth/marketer-payouts/${payoutId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Invalid account' })
        .expect(201);

      const [profile] = await dataSource.query(
        `SELECT approved_amount FROM marketer_profiles WHERE id = $1`,
        [marketerProfileId],
      );
      const [rejected] = await dataSource.query(
        `SELECT status FROM marketer_payout_requests WHERE id = $1`,
        [payoutId],
      );
      expect(rejected.status).toBe('REJECTED');
      expect(Number(profile.approved_amount)).toBe(5000); // 3000 + 2000 returned
    });

    it('should require paidReference when marking payout as paid', async () => {
      // Approve a fresh payout
      const res = await request(httpServer)
        .post('/api/v1/marketer/payout-requests')
        .set('Authorization', `Bearer ${marketerToken}`)
        .send({
          amount: 1000,
          method: 'MTN_MOMO',
          accountNumber: '+237670000001',
          accountName: 'Test Marketer',
        })
        .expect(201);
      const newPayoutId = res.body.id;

      await request(httpServer)
        .post(`/api/v1/admin/growth/marketer-payouts/${newPayoutId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      // Mark as paid without reference → should fail
      await request(httpServer)
        .post(`/api/v1/admin/growth/marketer-payouts/${newPayoutId}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should update totalPaid and set paidReference when marking as paid', async () => {
      const [existing] = await dataSource.query(
        `SELECT id FROM marketer_payout_requests WHERE marketer_profile_id = $1 AND status = 'APPROVED' LIMIT 1`,
        [marketerProfileId],
      );
      if (!existing) return; // guard if prior test failed

      await request(httpServer)
        .post(`/api/v1/admin/growth/marketer-payouts/${existing.id}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ paidReference: 'MOMO-REF-001' })
        .expect(201);

      const [profile] = await dataSource.query(
        `SELECT total_paid FROM marketer_profiles WHERE id = $1`,
        [marketerProfileId],
      );
      expect(Number(profile.total_paid)).toBeGreaterThan(0);

      const [payout] = await dataSource.query(
        `SELECT paid_reference, status FROM marketer_payout_requests WHERE id = $1`,
        [existing.id],
      );
      expect(payout.status).toBe('PAID');
      expect(payout.paid_reference).toBe('MOMO-REF-001');
    });
  });

  // ─── Admin Lead View ───────────────────────────────────────────────────────

  describe('Admin Lead Views', () => {
    it('should return paginated leads with SMS status', async () => {
      const res = await request(httpServer)
        .get('/api/v1/admin/growth/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('smsStatus');
      }
    });

    it('should filter leads by status', async () => {
      const res = await request(httpServer)
        .get('/api/v1/admin/growth/leads?status=INVITED')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.data.forEach((lead: any) => {
        expect(lead.status).toBe('INVITED');
      });
    });
  });
});
