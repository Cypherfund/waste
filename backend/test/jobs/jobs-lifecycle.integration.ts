import { httpServer, dataSource, baseUrl } from '../test-setup';
import { createTestUser, createTestJob, loginAndGetToken, cleanupTestData } from '../helpers/test-utils';
import { UserRole } from '../../src/common/enums/role.enum';
import { JobStatus } from '../../src/common/enums/job-status.enum';
import * as request from 'supertest';

describe('Jobs Lifecycle Integration Tests', () => {
  let householdToken: string;
  let collectorToken: string;
  let householdId: string;
  let collectorId: string;
  let jobId: string;

  beforeAll(async () => {
    // Create test users
    const household = await createTestUser(
      dataSource,
      'household@test.com',
      'Household123!',
      UserRole.HOUSEHOLD,
      'Test Household',
      '+237600000001'
    );
    householdId = household.id;

    const collector = await createTestUser(
      dataSource,
      'collector@test.com',
      'Collector123!',
      UserRole.COLLECTOR,
      'Test Collector',
      '+237600000002'
    );
    collectorId = collector.id;

    // Login and get tokens
    householdToken = await loginAndGetToken(baseUrl, '+237600000001', 'Household123!');
    collectorToken = await loginAndGetToken(baseUrl, '+237600000002', 'Collector123!');
  });

  afterAll(async () => {
    await cleanupTestData(dataSource);
  });

  describe('Job Creation', () => {
    it('should allow a household to create a job', async () => {
      const scheduledDate = new Date(Date.now() + 86400000); // Tomorrow
      
      const response = await request(httpServer)
        .post('/api/v1/jobs')
        .set('authorization', `Bearer ${householdToken}`)
        .send({
          locationAddress: '123 Test Street, Akwa, Douala',
          wasteType: 'plastic',
          quantity: 15,
          scheduledDate: scheduledDate.toISOString(),
          scheduledTime: '09:00',
          locationLat: 4.0,
          locationLng: 9.7,
          notes: 'Test job for integration testing',
        })
        .expect(201);

      const result = response.body;
      expect(result).toHaveProperty('id');
      expect(result.status).toBe(JobStatus.REQUESTED);
      expect(result.householdId).toBe(householdId);
      expect(result.locationAddress).toBe('123 Test Street, Akwa, Douala');
      
      jobId = result.id;
    });

    it('should not allow unauthenticated users to create jobs', async () => {
      await request(httpServer)
        .post('/api/v1/jobs')
        .send({
          address: '123 Test Street',
          wasteType: 'plastic',
          quantity: 10,
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(401);
    });

    it('should not allow collectors to create jobs', async () => {
      await request(httpServer)
        .post('/api/v1/jobs')
        .set('authorization', `Bearer ${collectorToken}`)
        .send({
          address: '123 Test Street',
          wasteType: 'plastic',
          quantity: 10,
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(403);
    });
  });

  describe('Job Retrieval', () => {
    it('should allow household to retrieve their own jobs', async () => {
      const response = await request(httpServer)
        .get('/api/v1/jobs/mine')
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      const result = response.body;
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].id).toBe(jobId);
    });

    it('should allow retrieving a specific job by ID', async () => {
      const response = await request(httpServer)
        .get(`/api/v1/jobs/${jobId}`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      const result = response.body;
      expect(result.id).toBe(jobId);
      expect(result.status).toBe(JobStatus.REQUESTED);
    });
  });

  describe('Job Assignment and Acceptance', () => {
    it('should allow admin to assign a job to a collector', async () => {
      // First create an admin user
      const admin = await createTestUser(
        dataSource,
        'admin@test.com',
        'Admin123!',
        UserRole.ADMIN,
        'Test Admin',
        '+237600000003'
      );
      const adminToken = await loginAndGetToken(baseUrl, '+237600000003', 'Admin123!');

      const response = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/assign`)
        .set('authorization', `Bearer ${adminToken}`)
        .send({ collectorId })
        .expect(200);

      const result = response.body;
      expect(result.message).toBe('Job assigned successfully');
    });

    it('should allow collector to accept an assigned job', async () => {
      const response = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/accept`)
        .set('authorization', `Bearer ${collectorToken}`)
        .expect(200);

      const result = response.body;
      // Accept is a confirmation — status stays ASSIGNED per Phase 2 spec
      // The separate /start endpoint transitions to IN_PROGRESS
      expect(result.status).toBe(JobStatus.ASSIGNED);
    });

    it('should allow collector to start an accepted job', async () => {
      const response = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/start`)
        .set('authorization', `Bearer ${collectorToken}`)
        .expect(200);

      const result = response.body;
      expect(result.status).toBe(JobStatus.IN_PROGRESS);
    });

    it('should not allow household to accept a job', async () => {
      // Create a new ASSIGNED job for this negative test
      const newJob = await createTestJob(dataSource, householdId);
      // Assign it directly in DB
      await dataSource.getRepository('Job').update(newJob.id, {
        collectorId,
        status: JobStatus.ASSIGNED,
        assignedAt: new Date(),
      });
      await request(httpServer)
        .post(`/api/v1/jobs/${newJob.id}/accept`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(403);
    });
  });

  describe('Job Completion', () => {
    it('should allow collector to complete a job with proof', async () => {
      const response = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('authorization', `Bearer ${collectorToken}`)
        .send({
          proofImageUrl: 'https://example.com/proof.jpg',
          collectorLat: 4.0,
          collectorLng: 9.7,
        })
        .expect(200);

      const result = response.body;
      expect(result.status).toBe(JobStatus.COMPLETED);
    });

    it('should not allow completing a job that is not in progress', async () => {
      // Try to complete again
      await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/complete`)
        .set('authorization', `Bearer ${collectorToken}`)
        .send({
          proofImageUrl: 'https://example.com/proof2.jpg',
        })
        .expect(400);
    });
  });

  describe('Job Validation', () => {
    it('should allow household to validate a completed job', async () => {
      const response = await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/validate`)
        .set('authorization', `Bearer ${householdToken}`)
        .expect(200);

      const result = response.body;
      expect(result.status).toBe(JobStatus.VALIDATED);
    });

    it('should not allow collector to validate a job', async () => {
      await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/validate`)
        .set('authorization', `Bearer ${collectorToken}`)
        .expect(403);
    });
  });

  describe('Job Cancellation', () => {
    let cancelableJobId: string;

    beforeAll(async () => {
      // Create a new job for cancellation test
      const job = await createTestJob(dataSource, householdId, {
        locationAddress: 'Cancel Test Address',
      });
      cancelableJobId = job.id;
    });

    it('should allow household to cancel a pending job', async () => {
      const response = await request(httpServer)
        .post(`/api/v1/jobs/${cancelableJobId}/cancel`)
        .set('authorization', `Bearer ${householdToken}`)
        .send({ reason: 'No longer needed' })
        .expect(200);

      const result = response.body;
      expect(result.status).toBe(JobStatus.CANCELLED);
    });

    it('should not allow household to cancel a validated job', async () => {
      // Per Phase 2 spec: households can only cancel REQUESTED or ASSIGNED jobs
      // jobId is now VALIDATED after the lifecycle tests above
      await request(httpServer)
        .post(`/api/v1/jobs/${jobId}/cancel`)
        .set('authorization', `Bearer ${householdToken}`)
        .send({ reason: 'Changed mind' })
        .expect(400);
    });
  });
});
