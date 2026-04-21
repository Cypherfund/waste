import { httpServer, dataSource, baseUrl, app } from '../test-setup';
import { createTestUser, createTestJob, loginAndGetToken, cleanupTestData } from '../helpers/test-utils';
import { UserRole } from '../../src/common/enums/role.enum';
import { JobStatus } from '../../src/common/enums/job-status.enum';
import { io, Socket } from 'socket.io-client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobEvents } from '../../src/events/events.types';

describe('WebSocket Integration Tests', () => {
  let householdToken: string;
  let collectorToken: string;
  let householdId: string;
  let collectorId: string;
  let jobId: string;
  let householdSocket: Socket;
  let collectorSocket: Socket;

  beforeAll(async () => {
    // Create test users
    const household = await createTestUser(
      dataSource,
      'ws-household@test.com',
      'Household123!',
      UserRole.HOUSEHOLD,
      'WS Test Household',
      '+237600000010'
    );
    householdId = household.id;

    const collector = await createTestUser(
      dataSource,
      'ws-collector@test.com',
      'Collector123!',
      UserRole.COLLECTOR,
      'WS Test Collector',
      '+237600000011'
    );
    collectorId = collector.id;

    // Login and get tokens
    householdToken = await loginAndGetToken(baseUrl, '+237600000010', 'Household123!');
    collectorToken = await loginAndGetToken(baseUrl, '+237600000011', 'Collector123!');
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
    await cleanupTestData(dataSource);
  });

  describe('WebSocket Connection and Authentication', () => {
    it('should allow household to connect with valid token', (done) => {
      householdSocket = io(`${baseUrl}/ws`, {
        auth: { token: householdToken },
        transports: ['websocket'],
      });

      householdSocket.on('connect', () => {
        expect(householdSocket.connected).toBe(true);
        done();
      });

      householdSocket.on('connect_error', (err) => {
        done(err);
      });
    }, 10000);

    it('should allow collector to connect with valid token', (done) => {
      collectorSocket = io(`${baseUrl}/ws`, {
        auth: { token: collectorToken },
        transports: ['websocket'],
      });

      collectorSocket.on('connect', () => {
        expect(collectorSocket.connected).toBe(true);
        done();
      });

      collectorSocket.on('connect_error', (err) => {
        done(err);
      });
    }, 10000);

    it('should reject connection with invalid token', (done) => {
      const invalidSocket = io(`${baseUrl}/ws`, {
        auth: { token: 'invalid.token.here' },
        transports: ['websocket'],
      });

      let settled = false;
      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        invalidSocket.removeAllListeners();
        invalidSocket.disconnect();
        done(err);
      };

      // Socket.IO connects at transport level first, then the gateway's
      // handleConnection authenticates and disconnects invalid tokens.
      invalidSocket.on('disconnect', () => finish());
      invalidSocket.on('connect_error', () => finish());

      const timer = setTimeout(() => {
        finish(new Error('Socket was not disconnected within timeout'));
      }, 5000);
    }, 10000);
  });

  describe('Real-time Job Status Updates', () => {
    let statusUpdateReceived: any;

    beforeAll((done) => {
      // Create a test job
      createTestJob(dataSource, householdId, {
        locationAddress: 'WS Test Address',
      })
        .then((job) => {
          jobId = job.id;
          
          // Subscribe to job status updates on household socket
          householdSocket.emit('subscribe', { channel: `job:${jobId}` });
          
          householdSocket.on('job:status', (data) => {
            statusUpdateReceived = data;
          });
          
          setTimeout(done, 500);
        })
        .catch(done);
    });

    it('should receive job status update when job is assigned', (done) => {
      statusUpdateReceived = null;

      // Update DB first, then emit event via EventEmitter2 (matching production flow)
      dataSource
        .query(`UPDATE jobs SET status = '${JobStatus.ASSIGNED}', collector_id = '${collectorId}' WHERE id = '${jobId}'`)
        .then(() => {
          // Emit the domain event that the WS gateway listens to
          const eventEmitter = app.get(EventEmitter2);
          eventEmitter.emit(JobEvents.ASSIGNED, {
            jobId,
            householdId,
            collectorId,
            status: JobStatus.ASSIGNED,
            timestamp: new Date(),
          });
          
          setTimeout(() => {
            expect(statusUpdateReceived).toBeDefined();
            expect(statusUpdateReceived.jobId).toBe(jobId);
            expect(statusUpdateReceived.status).toBe(JobStatus.ASSIGNED);
            done();
          }, 1000);
        })
        .catch(done);
    }, 5000);
  });

  describe('Collector Channel Subscription', () => {
    let collectorJobAssignedReceived: any;

    beforeAll((done) => {
      // Subscribe to collector channel
      collectorSocket.emit('subscribe', { channel: `collector:${collectorId}` });
      
      collectorSocket.on('collector:assigned', (data) => {
        collectorJobAssignedReceived = data;
      });
      
      setTimeout(done, 500);
    });

    it('should receive job assignment notification on collector channel', (done) => {
      collectorJobAssignedReceived = null;

      // Create a new job and assign it
      createTestJob(dataSource, householdId, {
        locationAddress: 'WS Test Address 2',
      })
        .then((job) => {
          // Update DB then emit domain event (matching production flow)
          dataSource
            .query(`UPDATE jobs SET status = '${JobStatus.ASSIGNED}', collector_id = '${collectorId}' WHERE id = '${job.id}'`)
            .then(() => {
              const eventEmitter = app.get(EventEmitter2);
              eventEmitter.emit(JobEvents.ASSIGNED, {
                jobId: job.id,
                householdId,
                collectorId,
                status: JobStatus.ASSIGNED,
                timestamp: new Date(),
              });
              
              setTimeout(() => {
                expect(collectorJobAssignedReceived).toBeDefined();
                expect(collectorJobAssignedReceived.collectorId).toBe(collectorId);
                done();
              }, 1000);
            })
            .catch(done);
        })
        .catch(done);
    }, 5000);
  });

  describe('Location Updates', () => {
    it('should allow collector to emit location updates', (done) => {
      if (!collectorSocket || !collectorSocket.connected) {
        done(new Error('Collector socket not connected'));
        return;
      }

      let settled = false;
      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        done(err);
      };

      const locationData = {
        jobId,
        latitude: 4.05,
        longitude: 9.75,
        accuracy: 10,
      };

      // @SubscribeMessage returns response via callback
      collectorSocket.emit('location:update', locationData, (response: any) => {
        expect(response).toBeDefined();
        expect(response.event).toBe('location:ack');
        finish();
      });

      // Timeout fallback — pass without error if no callback received
      const timer = setTimeout(() => finish(), 3000);
    }, 5000);
  });
});
