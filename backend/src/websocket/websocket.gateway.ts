import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from './websocket.guard';
import { LocationService, LocationUpdateInput } from './location.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import {
  JobEvents,
  JobEventPayload,
  JobAssignedPayload,
  JobCancelledPayload,
  JobCompletedPayload,
  JobAssignmentEscalatedPayload,
  FraudEvents,
  FraudFlagCreatedPayload,
} from '../events/events.types';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class AppWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppWebSocketGateway.name);

  constructor(
    private readonly wsGuard: WsJwtGuard,
    private readonly locationService: LocationService,
  ) {}

  // ─── CONNECTION LIFECYCLE ─────────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    const authenticated = await this.wsGuard.authenticateSocket(client);

    if (!authenticated) {
      this.logger.debug(`Rejecting unauthenticated socket ${client.id}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
      return;
    }

    const user = client.data.user as JwtPayload;
    this.logger.log(`Socket connected: ${client.id} user=${user.sub} role=${user.role}`);
  }

  handleDisconnect(client: Socket): void {
    const user = client.data?.user as JwtPayload | undefined;
    this.logger.log(`Socket disconnected: ${client.id} user=${user?.sub ?? 'unknown'}`);
  }

  // ─── CHANNEL SUBSCRIPTION ────────────────────────────────────

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ): Promise<{ event: string; data: any }> {
    const user = client.data.user as JwtPayload;
    if (!user) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    const channel = data?.channel;
    if (!channel) {
      return { event: 'error', data: { message: 'Channel is required' } };
    }

    // Authorize channel access
    const authorized = this.authorizeChannel(user, channel);
    if (!authorized) {
      this.logger.debug(
        `Unauthorized channel subscription: user=${user.sub} channel=${channel}`,
      );
      return { event: 'error', data: { message: `Not authorized for channel: ${channel}` } };
    }

    client.join(channel);
    this.logger.debug(`User ${user.sub} joined channel ${channel}`);
    return { event: 'subscribed', data: { channel } };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ): { event: string; data: any } {
    const channel = data?.channel;
    if (channel) {
      client.leave(channel);
    }
    return { event: 'unsubscribed', data: { channel } };
  }

  // ─── LOCATION UPDATES ────────────────────────────────────────

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LocationUpdateInput,
  ): Promise<{ event: string; data: any }> {
    const user = client.data.user as JwtPayload;
    if (!user) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    try {
      const location = await this.locationService.updateLocation(user.sub, data);

      // Broadcast to job channel
      this.server.to(`job:${data.jobId}`).emit('job:location', {
        jobId: data.jobId,
        collectorLat: Number(location.latitude),
        collectorLng: Number(location.longitude),
        accuracy: Number(location.accuracy),
        updatedAt: location.updatedAt,
      });

      return { event: 'location:ack', data: { jobId: data.jobId } };
    } catch (err) {
      return { event: 'error', data: { message: err.message } };
    }
  }

  // ─── EVENT-DRIVEN BROADCASTING ────────────────────────────────

  @OnEvent(JobEvents.ASSIGNED)
  handleJobAssigned(payload: JobAssignedPayload): void {
    const statusData = this.buildStatusPayload(payload);

    // Notify collector
    if (payload.collectorId) {
      this.server.to(`collector:${payload.collectorId}`).emit('collector:assigned', statusData);
    }

    // Notify job channel + household + admin
    this.broadcastJobStatus(payload, statusData);
  }

  @OnEvent(JobEvents.ACCEPTED)
  handleJobAccepted(payload: JobEventPayload): void {
    this.broadcastJobStatus(payload, this.buildStatusPayload(payload));
  }

  @OnEvent(JobEvents.STARTED)
  handleJobStarted(payload: JobEventPayload): void {
    this.broadcastJobStatus(payload, this.buildStatusPayload(payload));
  }

  @OnEvent(JobEvents.COMPLETED)
  async handleJobCompleted(payload: JobCompletedPayload): Promise<void> {
    this.broadcastJobStatus(payload, this.buildStatusPayload(payload));

    // Clean up location record on completion (privacy by design)
    try {
      await this.locationService.deleteLocation(payload.jobId);
    } catch (err) {
      this.logger.error(`Failed to clean location for job ${payload.jobId}: ${err.message}`);
    }
  }

  @OnEvent(JobEvents.VALIDATED)
  handleJobValidated(payload: JobEventPayload): void {
    this.broadcastJobStatus(payload, this.buildStatusPayload(payload));
  }

  @OnEvent(JobEvents.CANCELLED)
  async handleJobCancelled(payload: JobCancelledPayload): Promise<void> {
    const statusData = {
      ...this.buildStatusPayload(payload),
      cancelledBy: payload.cancelledBy,
      reason: payload.reason,
    };
    this.broadcastJobStatus(payload, statusData);

    // Clean up location record
    try {
      await this.locationService.deleteLocation(payload.jobId);
    } catch (err) {
      this.logger.error(`Failed to clean location for job ${payload.jobId}: ${err.message}`);
    }
  }

  @OnEvent(JobEvents.ASSIGNMENT_ESCALATED)
  handleAssignmentEscalated(payload: JobAssignmentEscalatedPayload): void {
    this.server.to('admin:alerts').emit('admin:escalation', {
      jobId: payload.jobId,
      householdId: payload.householdId,
      attempts: payload.attempts,
      timestamp: payload.timestamp,
    });

    this.server.to('admin:jobs').emit('admin:job_update', {
      jobId: payload.jobId,
      event: 'ASSIGNMENT_ESCALATED',
      timestamp: payload.timestamp,
    });
  }

  @OnEvent(FraudEvents.FLAG_CREATED)
  handleFraudFlagCreated(payload: FraudFlagCreatedPayload): void {
    this.server.to('admin:alerts').emit('admin:fraud_alert', {
      flagId: payload.flagId,
      jobId: payload.jobId,
      collectorId: payload.collectorId,
      type: payload.type,
      severity: payload.severity,
      timestamp: payload.timestamp,
    });
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  /**
   * Authorize a user for a specific channel.
   */
  authorizeChannel(user: JwtPayload, channel: string): boolean {
    // Admin channels
    if (channel === 'admin:jobs' || channel === 'admin:alerts') {
      return user.role === UserRole.ADMIN;
    }

    // Household personal channel
    if (channel.startsWith('household:')) {
      const channelUserId = channel.split(':')[1];
      return (
        user.role === UserRole.HOUSEHOLD && user.sub === channelUserId
      ) || user.role === UserRole.ADMIN;
    }

    // Collector personal channel
    if (channel.startsWith('collector:')) {
      const channelUserId = channel.split(':')[1];
      return (
        user.role === UserRole.COLLECTOR && user.sub === channelUserId
      ) || user.role === UserRole.ADMIN;
    }

    // Job channel — household and collector can join their own jobs, admin can join any
    if (channel.startsWith('job:')) {
      // Full ownership check would require a DB lookup.
      // For now: HOUSEHOLD and COLLECTOR can join job channels (validated by their client).
      // ADMIN can join any job channel.
      return (
        user.role === UserRole.HOUSEHOLD ||
        user.role === UserRole.COLLECTOR ||
        user.role === UserRole.ADMIN
      );
    }

    return false;
  }

  /**
   * Broadcast job status to job:{id}, household:{id}, and admin:jobs channels.
   */
  private broadcastJobStatus(
    payload: JobEventPayload,
    data: Record<string, any>,
  ): void {
    // Job channel
    this.server.to(`job:${payload.jobId}`).emit('job:status', data);

    // Household channel
    this.server
      .to(`household:${payload.householdId}`)
      .emit('job:status', data);

    // Collector channel
    if (payload.collectorId) {
      this.server
        .to(`collector:${payload.collectorId}`)
        .emit('job:status', data);
    }

    // Admin jobs channel
    this.server.to('admin:jobs').emit('admin:job_update', data);
  }

  private buildStatusPayload(payload: JobEventPayload): Record<string, any> {
    return {
      jobId: payload.jobId,
      status: payload.status,
      householdId: payload.householdId,
      collectorId: payload.collectorId ?? null,
      updatedAt: payload.timestamp,
    };
  }
}
