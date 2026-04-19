import { Test, TestingModule } from '@nestjs/testing';
import { AppWebSocketGateway } from './websocket.gateway';
import { WsJwtGuard } from './websocket.guard';
import { LocationService } from './location.service';
import { UserRole } from '../common/enums/role.enum';
import { JobStatus } from '../common/enums/job-status.enum';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { FraudEvents } from '../events/events.types';

describe('AppWebSocketGateway', () => {
  let gateway: AppWebSocketGateway;
  let wsGuard: any;
  let locationService: any;
  let mockServer: any;

  const householdUser: JwtPayload = { sub: 'hh-1', role: UserRole.HOUSEHOLD };
  const collectorUser: JwtPayload = { sub: 'col-1', role: UserRole.COLLECTOR };
  const adminUser: JwtPayload = { sub: 'admin-1', role: UserRole.ADMIN };

  function makeSocket(user?: JwtPayload): any {
    const rooms = new Set<string>();
    return {
      id: `socket-${Math.random().toString(36).slice(2)}`,
      data: { user: user ?? null },
      join: jest.fn((room: string) => rooms.add(room)),
      leave: jest.fn((room: string) => rooms.delete(room)),
      emit: jest.fn(),
      disconnect: jest.fn(),
      handshake: { auth: { token: 'valid-token' }, query: {} },
      rooms,
    };
  }

  beforeEach(async () => {
    wsGuard = {
      authenticateSocket: jest.fn().mockImplementation(async (client: any) => {
        // Simulate real guard: set user on socket if token present
        if (client.handshake?.auth?.token) {
          client.data.user = { sub: 'default-user', role: UserRole.HOUSEHOLD };
          return true;
        }
        return false;
      }),
    };

    locationService = {
      updateLocation: jest.fn().mockResolvedValue({
        jobId: 'job-1',
        latitude: 4.0511,
        longitude: 9.7679,
        accuracy: 15.0,
        updatedAt: new Date(),
      }),
      deleteLocation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppWebSocketGateway,
        { provide: WsJwtGuard, useValue: wsGuard },
        { provide: LocationService, useValue: locationService },
      ],
    }).compile();

    gateway = module.get<AppWebSocketGateway>(AppWebSocketGateway);

    // Mock the Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    gateway.server = mockServer;
  });

  // ─── Connection Auth ────────────────────────────────────────────

  describe('handleConnection', () => {
    it('should accept authenticated socket', async () => {
      const socket = makeSocket();

      await gateway.handleConnection(socket);

      expect(wsGuard.authenticateSocket).toHaveBeenCalledWith(socket);
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated socket', async () => {
      const socket = makeSocket();
      socket.handshake = { auth: {}, query: {} }; // no token

      await gateway.handleConnection(socket);

      expect(socket.emit).toHaveBeenCalledWith('error', { message: 'Authentication failed' });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  // ─── Channel Authorization ──────────────────────────────────────

  describe('authorizeChannel', () => {
    // Household
    it('household can join own household channel', () => {
      expect(gateway.authorizeChannel(householdUser, 'household:hh-1')).toBe(true);
    });

    it('household cannot join other household channel', () => {
      expect(gateway.authorizeChannel(householdUser, 'household:hh-2')).toBe(false);
    });

    it('household can join job channels', () => {
      expect(gateway.authorizeChannel(householdUser, 'job:job-1')).toBe(true);
    });

    it('household cannot join admin channels', () => {
      expect(gateway.authorizeChannel(householdUser, 'admin:jobs')).toBe(false);
      expect(gateway.authorizeChannel(householdUser, 'admin:alerts')).toBe(false);
    });

    it('household cannot join collector channels', () => {
      expect(gateway.authorizeChannel(householdUser, 'collector:col-1')).toBe(false);
    });

    // Collector
    it('collector can join own collector channel', () => {
      expect(gateway.authorizeChannel(collectorUser, 'collector:col-1')).toBe(true);
    });

    it('collector cannot join other collector channel', () => {
      expect(gateway.authorizeChannel(collectorUser, 'collector:col-2')).toBe(false);
    });

    it('collector can join job channels', () => {
      expect(gateway.authorizeChannel(collectorUser, 'job:job-1')).toBe(true);
    });

    it('collector cannot join admin channels', () => {
      expect(gateway.authorizeChannel(collectorUser, 'admin:jobs')).toBe(false);
    });

    // Admin
    it('admin can join admin:jobs', () => {
      expect(gateway.authorizeChannel(adminUser, 'admin:jobs')).toBe(true);
    });

    it('admin can join admin:alerts', () => {
      expect(gateway.authorizeChannel(adminUser, 'admin:alerts')).toBe(true);
    });

    it('admin can join any job channel', () => {
      expect(gateway.authorizeChannel(adminUser, 'job:any-job')).toBe(true);
    });

    it('admin can join any household channel', () => {
      expect(gateway.authorizeChannel(adminUser, 'household:hh-1')).toBe(true);
    });

    it('admin can join any collector channel', () => {
      expect(gateway.authorizeChannel(adminUser, 'collector:col-1')).toBe(true);
    });

    // Unknown channels
    it('rejects unknown channel patterns', () => {
      expect(gateway.authorizeChannel(householdUser, 'unknown:channel')).toBe(false);
    });
  });

  // ─── Subscribe ──────────────────────────────────────────────────

  describe('handleSubscribe', () => {
    it('should join authorized channel', async () => {
      const socket = makeSocket(householdUser);

      const result = await gateway.handleSubscribe(socket, { channel: 'household:hh-1' });

      expect(socket.join).toHaveBeenCalledWith('household:hh-1');
      expect(result).toEqual({ event: 'subscribed', data: { channel: 'household:hh-1' } });
    });

    it('should reject unauthorized channel', async () => {
      const socket = makeSocket(householdUser);

      const result = await gateway.handleSubscribe(socket, { channel: 'admin:jobs' });

      expect(socket.join).not.toHaveBeenCalled();
      expect(result.event).toBe('error');
    });

    it('should reject missing channel', async () => {
      const socket = makeSocket(householdUser);

      const result = await gateway.handleSubscribe(socket, { channel: '' });

      expect(result.event).toBe('error');
    });
  });

  // ─── Location Update ───────────────────────────────────────────

  describe('handleLocationUpdate', () => {
    it('should persist location and broadcast to job channel', async () => {
      const socket = makeSocket(collectorUser);
      const input = {
        jobId: 'job-1',
        latitude: 4.0511,
        longitude: 9.7679,
        accuracy: 15.0,
      };

      const result = await gateway.handleLocationUpdate(socket, input as any);

      expect(locationService.updateLocation).toHaveBeenCalledWith('col-1', input);
      expect(mockServer.to).toHaveBeenCalledWith('job:job-1');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'job:location',
        expect.objectContaining({
          jobId: 'job-1',
          collectorLat: 4.0511,
          collectorLng: 9.7679,
        }),
      );
      expect(result.event).toBe('location:ack');
    });

    it('should return error if location service rejects', async () => {
      locationService.updateLocation.mockRejectedValue(
        new Error('Job must be IN_PROGRESS'),
      );
      const socket = makeSocket(collectorUser);

      const result = await gateway.handleLocationUpdate(socket, {
        jobId: 'job-1',
        latitude: 4.0,
        longitude: 9.0,
        accuracy: 10,
      } as any);

      expect(result.event).toBe('error');
      expect(result.data.message).toContain('IN_PROGRESS');
    });

    it('should reject unauthenticated location update', async () => {
      const socket = makeSocket(); // no user
      socket.data.user = null;

      const result = await gateway.handleLocationUpdate(socket, {
        jobId: 'job-1',
        latitude: 4.0,
        longitude: 9.0,
        accuracy: 10,
      } as any);

      expect(result.event).toBe('error');
      expect(result.data.message).toBe('Not authenticated');
    });
  });

  // ─── Event Broadcasting ─────────────────────────────────────────

  describe('event broadcasting', () => {
    const basePayload = {
      jobId: 'job-1',
      householdId: 'hh-1',
      collectorId: 'col-1',
      status: JobStatus.ASSIGNED,
      timestamp: new Date(),
    };

    it('JOB_ASSIGNED broadcasts to job, household, collector, and admin channels', () => {
      gateway.handleJobAssigned({ ...basePayload, attempt: 1 });

      // collector:col-1 gets special assigned event
      expect(mockServer.to).toHaveBeenCalledWith('collector:col-1');

      // broadcastJobStatus calls: job:{id}, household:{id}, collector:{id}, admin:jobs
      expect(mockServer.to).toHaveBeenCalledWith('job:job-1');
      expect(mockServer.to).toHaveBeenCalledWith('household:hh-1');
      expect(mockServer.to).toHaveBeenCalledWith('admin:jobs');
    });

    it('JOB_COMPLETED broadcasts and cleans up location', async () => {
      await gateway.handleJobCompleted({
        ...basePayload,
        status: JobStatus.COMPLETED,
        proofId: 'proof-1',
      });

      expect(mockServer.to).toHaveBeenCalledWith('job:job-1');
      expect(locationService.deleteLocation).toHaveBeenCalledWith('job-1');
    });

    it('JOB_CANCELLED broadcasts and cleans up location', async () => {
      await gateway.handleJobCancelled({
        ...basePayload,
        status: JobStatus.CANCELLED,
        cancelledBy: 'hh-1',
        reason: 'Changed mind',
      });

      expect(mockServer.to).toHaveBeenCalledWith('job:job-1');
      expect(locationService.deleteLocation).toHaveBeenCalledWith('job-1');
    });

    it('ASSIGNMENT_ESCALATED broadcasts to admin:alerts and admin:jobs', () => {
      gateway.handleAssignmentEscalated({
        jobId: 'job-1',
        householdId: 'hh-1',
        attempts: 3,
        timestamp: new Date(),
      });

      expect(mockServer.to).toHaveBeenCalledWith('admin:alerts');
      expect(mockServer.to).toHaveBeenCalledWith('admin:jobs');
    });

    it('FRAUD_FLAG_CREATED broadcasts to admin:alerts', () => {
      gateway.handleFraudFlagCreated({
        flagId: 'flag-1',
        jobId: 'job-1',
        collectorId: 'col-1',
        type: 'GPS_MISMATCH',
        severity: 'HIGH',
        timestamp: new Date(),
      });

      expect(mockServer.to).toHaveBeenCalledWith('admin:alerts');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'admin:fraud_alert',
        expect.objectContaining({ flagId: 'flag-1' }),
      );
    });

    it('JOB_ACCEPTED broadcasts to correct channels', () => {
      gateway.handleJobAccepted(basePayload);

      expect(mockServer.to).toHaveBeenCalledWith('job:job-1');
      expect(mockServer.to).toHaveBeenCalledWith('household:hh-1');
      expect(mockServer.to).toHaveBeenCalledWith('collector:col-1');
      expect(mockServer.to).toHaveBeenCalledWith('admin:jobs');
    });

    it('JOB_STARTED broadcasts to correct channels', () => {
      gateway.handleJobStarted({ ...basePayload, status: JobStatus.IN_PROGRESS });

      expect(mockServer.to).toHaveBeenCalledWith('job:job-1');
      expect(mockServer.to).toHaveBeenCalledWith('household:hh-1');
    });

    it('JOB_VALIDATED broadcasts to correct channels', () => {
      gateway.handleJobValidated({ ...basePayload, status: JobStatus.VALIDATED });

      expect(mockServer.to).toHaveBeenCalledWith('job:job-1');
      expect(mockServer.to).toHaveBeenCalledWith('household:hh-1');
    });
  });
});
