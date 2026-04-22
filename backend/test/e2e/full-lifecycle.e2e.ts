/**
 * E2E Test: Full Job Lifecycle
 *
 * Tests the complete flow through the system:
 *   Register users → Login → Create job → Assign → Accept → Start →
 *   Complete (with proof) → Validate → Rate
 *
 * Also verifies WebSocket real-time updates at each stage.
 */
import { app, httpServer, dataSource, baseUrl } from '../test-setup';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole } from '../../src/common/enums/role.enum';
import { JobStatus } from '../../src/common/enums/job-status.enum';
import { createTestUser, loginAndGetToken } from '../helpers/test-utils';

describe('E2E: Full Job Lifecycle', () => {
  let householdToken: string;
  let collectorToken: string;
  let adminToken: string;
  let householdId: string;
  let collectorId: string;
  let adminId: string;
  let jobId: string;

  // WebSocket connections
  let householdSocket: Socket;
  let collectorSocket: Socket;
  const wsEvents: Record<string, any[]> = {
    household: [],
    collector: [],
  };

  // ─── SETUP ────────────────────────────────────────────────────

  beforeAll(async () => {
    // Create test users directly in DB (admin can't self-register)
    const household = await createTestUser(
      dataSource,
      'e2e-household@test.com',
      'Household123!',
      UserRole.HOUSEHOLD,
      'E2E Household',
      '+237690000001',
    );
    householdId = household.id;

    const collector = await createTestUser(
      dataSource,
      'e2e-collector@test.com',
      'Collector123!',
      UserRole.COLLECTOR,
      'E2E Collector',
      '+237690000002',
    );
    collectorId = collector.id;

    const admin = await createTestUser(
      dataSource,
      'e2e-admin@test.com',
      'AdminPass123!',
      UserRole.ADMIN,
      'E2E Admin',
      '+237690000003',
    );
    adminId = admin.id;

    // Login all users via API
    householdToken = await loginAndGetToken(baseUrl, '+237690000001', 'Household123!');
    collectorToken = await loginAndGetToken(baseUrl, '+237690000002', 'Collector123!');
    adminToken = await loginAndGetToken(baseUrl, '+237690000003', 'AdminPass123!');

    // Connect WebSockets
    householdSocket = io(`${baseUrl}/ws`, {
      auth: { token: householdToken },
      transports: ['websocket'],
    });

    collectorSocket = io(`${baseUrl}/ws`, {
      auth: { token: collectorToken },
      transports: ['websocket'],
    });

    // Wait for both sockets to connect
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        householdSocket.on('connect', resolve);
        householdSocket.on('connect_error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        collectorSocket.on('connect', resolve);
        collectorSocket.on('connect_error', reject);
      }),
    ]);

    // Subscribe to channels
    householdSocket.emit('subscribe', { channel: `household:${householdId}` });
    collectorSocket.emit('subscribe', { channel: `collector:${collectorId}` });

    // Collect all WS events
    householdSocket.on('job:status', (data) => wsEvents.household.push(data));
    collectorSocket.on('job:status', (data) => wsEvents.collector.push(data));
    collectorSocket.on('collector:assigned', (data) => wsEvents.collector.push(data));

    // Small delay for subscriptions to complete
    await new Promise((r) => setTimeout(r, 300));
  });

  afterAll(async () => {
    if (householdSocket) {
      householdSocket.removeAllListeners();
      householdSocket.disconnect();
    }
    if (collectorSocket) {
      collectorSocket.removeAllListeners();
      collectorSocket.disconnect();
    }
  });

  // ─── 1. JOB CREATION ─────────────────────────────────────────

  describe('Step 1: Household creates a job', () => {
    it('should create a job via the API', async () => {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 1);

      const res = await request(httpServer)
        .post('/api/v1/jobs')
        .set('authorization', `Bearer ${householdToken}`)
        .send({
          locationAddress: '456 E2E Street, Bonapriso, Douala',
          wasteType: 'mixed',
          quantity: 20,
          scheduledDate: scheduledDate.toISOString(),
          scheduledTime: '10:00',
          locationLat: 4.04,
          locationLng: 9.69,
          notes: 'E2E test job',
        })
        .expect(201);

      jobId = res.body.id;
      expect(jobId).toBeDefined();
      expect(res.body.status).toBe(JobStatus.REQUESTED);
      expect(res.body.householdId).toBe(householdId);
    });

    it('should be visible in the household job list', async () => {
      const res = await request(httpServer)
        .get('/api/v1/jobs/mine')
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      const jobs = res.body.data || res.body;
      const found = Array.isArray(jobs)
        ? jobs.find((j: any) => j.id === jobId)
        : null;
      expect(found).toBeDefined();
    });

    it('should be retrievable by ID', async () => {
      const res = await request(httpServer)
        .get(`/api/v1/jobs/${jobId}`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.id).toBe(jobId);
      expect(res.body.status).toBe(JobStatus.REQUESTED);
    });
  });

  // ─── 2. JOB ASSIGNMENT ────────────────────────────────────────

  describe('Step 2: Admin assigns collector', () => {
    it('should subscribe sockets to job channel', async () => {
      householdSocket.emit('subscribe', { channel: `job:${jobId}` });
      collectorSocket.emit('subscribe', { channel: `job:${jobId}` });
      await new Promise((r) => setTimeout(r, 300));
    });

    it('should assign the job to a collector', async () => {
      wsEvents.household = [];
      wsEvents.collector = [];

      const res = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/assign`)
        .set('authorization', `Bearer ${adminToken}`)
        .send({ collectorId })
        .expect(200);

      expect(res.body.message).toBe('Job assigned successfully');

      // Wait for event propagation
      await new Promise((r) => setTimeout(r, 1000));
    });

    it('should show ASSIGNED status when fetched', async () => {
      const res = await request(httpServer)
        .get(`/api/v1/jobs/${jobId}`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.status).toBe(JobStatus.ASSIGNED);
      expect(res.body.collectorId).toBe(collectorId);
    });

    it('should have sent WebSocket events for assignment', async () => {
      // Collector receives via collector:{id} channel (collector:assigned and job:status)
      const collectorAssignEvent = wsEvents.collector.find(
        (e) => e.jobId === jobId,
      );
      expect(collectorAssignEvent).toBeDefined();
      expect(collectorAssignEvent.status).toBe(JobStatus.ASSIGNED);
    });
  });

  // ─── 3. JOB ACCEPTANCE ────────────────────────────────────────

  describe('Step 3: Collector accepts the job', () => {
    it('should accept the assigned job', async () => {
      const res = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/accept`)
        .set('authorization', `Bearer ${collectorToken}`)
        .expect(200);

      // Accept confirms assignment — status stays ASSIGNED
      expect(res.body.status).toBe(JobStatus.ASSIGNED);
    });
  });

  // ─── 4. JOB START ─────────────────────────────────────────────

  describe('Step 4: Collector starts the job', () => {
    it('should start the accepted job', async () => {
      wsEvents.household = [];

      const res = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/start`)
        .set('authorization', `Bearer ${collectorToken}`)
        .expect(200);

      expect(res.body.status).toBe(JobStatus.IN_PROGRESS);
    });

    it('should show IN_PROGRESS when fetched', async () => {
      const res = await request(httpServer)
        .get(`/api/v1/jobs/${jobId}`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.status).toBe(JobStatus.IN_PROGRESS);
    });

    it('should have sent WebSocket event for start', async () => {
      await new Promise((r) => setTimeout(r, 500));

      const startEvent = wsEvents.household.find(
        (e) => e.jobId === jobId && e.status === JobStatus.IN_PROGRESS,
      );
      expect(startEvent).toBeDefined();
    });
  });

  // ─── 5. JOB COMPLETION ────────────────────────────────────────

  describe('Step 5: Collector completes with proof', () => {
    it('should complete the job with proof image', async () => {
      wsEvents.household = [];

      const res = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('authorization', `Bearer ${collectorToken}`)
        .send({
          proofImageUrl: 'https://cdn.example.com/proof/e2e-test.jpg',
          collectorLat: 4.04,
          collectorLng: 9.69,
        })
        .expect(200);

      expect(res.body.status).toBe(JobStatus.COMPLETED);
    });

    it('should show COMPLETED when fetched', async () => {
      const res = await request(httpServer)
        .get(`/api/v1/jobs/${jobId}`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.status).toBe(JobStatus.COMPLETED);
    });

    it('should have sent WebSocket event for completion', async () => {
      await new Promise((r) => setTimeout(r, 500));

      const completeEvent = wsEvents.household.find(
        (e) => e.jobId === jobId && e.status === JobStatus.COMPLETED,
      );
      expect(completeEvent).toBeDefined();
    });
  });

  // ─── 6. JOB VALIDATION ────────────────────────────────────────

  describe('Step 6: Household validates the completed job', () => {
    it('should validate the completed job', async () => {
      wsEvents.collector = [];

      const res = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/validate`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.status).toBe(JobStatus.VALIDATED);
    });

    it('should show VALIDATED when fetched', async () => {
      const res = await request(httpServer)
        .get(`/api/v1/jobs/${jobId}`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.status).toBe(JobStatus.VALIDATED);
    });
  });

  // ─── 7. JOB RATING ────────────────────────────────────────────

  describe('Step 7: Household rates the job', () => {
    it('should rate the validated job', async () => {
      const res = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/rate`)
        .set('authorization', `Bearer ${householdToken}`)
        .send({
          value: 5,
          comment: 'Excellent E2E service!',
        })
        .expect(201);

      expect(res.body.value).toBe(5);
      expect(res.body.comment).toBe('Excellent E2E service!');
      expect(res.body.jobId).toBe(jobId);
      expect(res.body.householdId).toBe(householdId);
      expect(res.body.collectorId).toBe(collectorId);
    });

    it('should show RATED as the final job status', async () => {
      const res = await request(httpServer)
        .get(`/api/v1/jobs/${jobId}`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.status).toBe(JobStatus.RATED);
    });

    it('should not allow rating the same job again', async () => {
      // Job is now RATED — status check returns 400 before duplicate check (409)
      const res = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/rate`)
        .set('authorization', `Bearer ${householdToken}`)
        .send({ value: 3, comment: 'Duplicate' });

      // Either 400 (wrong status) or 409 (already rated) is acceptable
      expect([400, 409]).toContain(res.status);
    });
  });

  // ─── 8. NEGATIVE FLOWS ────────────────────────────────────────

  describe('Step 8: Negative / edge-case flows', () => {
    it('should not allow unauthenticated job creation', async () => {
      await request(httpServer)
        .post('/api/v1/jobs')
        .send({ locationAddress: 'X', wasteType: 'plastic' })
        .expect(401);
    });

    it('should not allow collector to create a job', async () => {
      await request(httpServer)
        .post('/api/v1/jobs')
        .set('authorization', `Bearer ${collectorToken}`)
        .send({
          locationAddress: 'X',
          wasteType: 'plastic',
          scheduledDate: new Date().toISOString(),
          scheduledTime: '10:00',
          locationLat: 4.0,
          locationLng: 9.7,
        })
        .expect(403);
    });

    it('should not allow household to cancel a RATED job', async () => {
      await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/cancel`)
        .set('authorization', `Bearer ${householdToken}`)
        .send({ reason: 'Too late' })
        .expect(400);
    });

    it('should not allow completing an already rated job', async () => {
      await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('authorization', `Bearer ${collectorToken}`)
        .send({ proofImageUrl: 'https://example.com/x.jpg' })
        .expect(400);
    });
  });

  // ─── 9. CANCELLATION FLOW ─────────────────────────────────────

  describe('Step 9: Job cancellation flow', () => {
    let cancelJobId: string;

    it('should create a new job for cancellation test', async () => {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 2);

      const res = await request(httpServer)
        .post('/api/v1/jobs')
        .set('authorization', `Bearer ${householdToken}`)
        .send({
          locationAddress: '789 Cancel Street, Douala',
          wasteType: 'organic',
          quantity: 5,
          scheduledDate: scheduledDate.toISOString(),
          scheduledTime: '14:00',
          locationLat: 4.05,
          locationLng: 9.71,
        })
        .expect(201);

      cancelJobId = res.body.id;
      expect(res.body.status).toBe(JobStatus.REQUESTED);
    });

    it('should allow household to cancel a REQUESTED job', async () => {
      const res = await request(httpServer)
        .post(`/api/v1/jobs/${cancelJobId}/cancel`)
        .set('authorization', `Bearer ${householdToken}`)
        .send({ reason: 'No longer needed' })
        .expect(200);

      expect(res.body.status).toBe(JobStatus.CANCELLED);
    });

    it('should show CANCELLED when fetched', async () => {
      const res = await request(httpServer)
        .get(`/api/v1/jobs/${cancelJobId}`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      expect(res.body.status).toBe(JobStatus.CANCELLED);
    });
  });
});
