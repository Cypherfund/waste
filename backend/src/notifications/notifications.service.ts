import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, FindOptionsWhere } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Notification } from './entities/notification.entity';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { FcmProvider } from './providers/fcm.provider';
import { SmsProvider } from './providers/sms.provider';
import {
  getTemplate,
  CRITICAL_NOTIFICATION_TYPES,
  TemplateContext,
} from './templates/notification.templates';
import { FeatureFlagService, FEATURE_FLAGS } from '../config/feature-flags';
import { UsersService } from '../users/users.service';
import { NotificationChannel, NotificationStatus } from '../common/enums/notification-channel.enum';
import { NotificationType } from '../common/enums/notification-type.enum';
import { PaginatedResponse, paginate } from '../common/dto/pagination.dto';
import {
  JobEvents,
  JobEventPayload,
  JobCancelledPayload,
  JobCompletedPayload,
  JobRejectedPayload,
  JobAssignedPayload,
  JobAssignmentTimeoutPayload,
  JobAssignmentEscalatedPayload,
  ProofEvents,
  ProofUploadedPayload,
  ProofAutoValidatedPayload,
  JobRatedPayload,
  EarningsEvents,
  EarningsConfirmedPayload,
} from '../events/events.types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    private readonly fcmProvider: FcmProvider,
    private readonly smsProvider: SmsProvider,
    private readonly featureFlagService: FeatureFlagService,
    private readonly usersService: UsersService,
  ) {}

  // ─── EVENT LISTENERS ──────────────────────────────────────────

  @OnEvent(JobEvents.ASSIGNED)
  async onJobAssigned(payload: JobAssignedPayload): Promise<void> {
    if (payload.collectorId) {
      await this.createAndDispatch(
        payload.collectorId,
        NotificationType.JOB_ASSIGNED,
        { jobId: payload.jobId },
      );
    }
  }

  @OnEvent(JobEvents.ACCEPTED)
  async onJobAccepted(payload: JobEventPayload): Promise<void> {
    await this.createAndDispatch(
      payload.householdId,
      NotificationType.JOB_ACCEPTED,
      { jobId: payload.jobId },
    );
  }

  @OnEvent(JobEvents.REJECTED)
  async onJobRejected(payload: JobRejectedPayload): Promise<void> {
    await this.createAndDispatch(
      payload.householdId,
      NotificationType.JOB_REJECTED,
      { jobId: payload.jobId, reason: payload.reason },
    );
  }

  @OnEvent(JobEvents.STARTED)
  async onJobStarted(payload: JobEventPayload): Promise<void> {
    await this.createAndDispatch(
      payload.householdId,
      NotificationType.JOB_STARTED,
      { jobId: payload.jobId },
    );
  }

  @OnEvent(JobEvents.COMPLETED)
  async onJobCompleted(payload: JobCompletedPayload): Promise<void> {
    await this.createAndDispatch(
      payload.householdId,
      NotificationType.JOB_COMPLETED,
      { jobId: payload.jobId },
    );
  }

  @OnEvent(JobEvents.VALIDATED)
  async onJobValidated(payload: JobEventPayload): Promise<void> {
    if (payload.collectorId) {
      await this.createAndDispatch(
        payload.collectorId,
        NotificationType.PROOF_VALIDATED,
        { jobId: payload.jobId },
      );
    }
  }

  @OnEvent(JobEvents.CANCELLED)
  async onJobCancelled(payload: JobCancelledPayload): Promise<void> {
    // Notify both household and collector (if assigned)
    await this.createAndDispatch(
      payload.householdId,
      NotificationType.JOB_CANCELLED,
      { jobId: payload.jobId, reason: payload.reason },
    );

    if (payload.collectorId) {
      await this.createAndDispatch(
        payload.collectorId,
        NotificationType.JOB_CANCELLED,
        { jobId: payload.jobId, reason: payload.reason },
      );
    }
  }

  @OnEvent(JobEvents.ASSIGNMENT_TIMEOUT)
  async onAssignmentTimeout(payload: JobAssignmentTimeoutPayload): Promise<void> {
    await this.createAndDispatch(
      payload.collectorId,
      NotificationType.ASSIGNMENT_TIMEOUT,
      { jobId: payload.jobId },
    );
  }

  @OnEvent(JobEvents.ASSIGNMENT_ESCALATED)
  async onAssignmentEscalated(payload: JobAssignmentEscalatedPayload): Promise<void> {
    // Notify all active admins per Phase 1 §7.2
    const admins = await this.usersService.findByRole('ADMIN');
    for (const admin of admins) {
      await this.createAndDispatch(
        admin.id,
        NotificationType.ASSIGNMENT_ESCALATED,
        { jobId: payload.jobId, attempts: payload.attempts },
      );
    }
  }

  @OnEvent(ProofEvents.UPLOADED)
  async onProofUploaded(payload: ProofUploadedPayload): Promise<void> {
    // Notify household that proof was uploaded — Phase 1 §7.2
    await this.createAndDispatch(
      payload.householdId,
      NotificationType.PROOF_UPLOADED,
      { jobId: payload.jobId },
    );
  }

  @OnEvent(ProofEvents.AUTO_VALIDATED)
  async onProofAutoValidated(payload: ProofAutoValidatedPayload): Promise<void> {
    // Notify both household and collector — Phase 1 §7.2
    await this.createAndDispatch(
      payload.householdId,
      NotificationType.PROOF_AUTO_VALIDATED,
      { jobId: payload.jobId },
    );
    if (payload.collectorId) {
      await this.createAndDispatch(
        payload.collectorId,
        NotificationType.PROOF_AUTO_VALIDATED,
        { jobId: payload.jobId },
      );
    }
  }

  @OnEvent(JobEvents.RATED)
  async onJobRated(payload: JobRatedPayload): Promise<void> {
    // Notify collector of new rating — Phase 1 §7.2
    await this.createAndDispatch(
      payload.collectorId,
      NotificationType.JOB_RATED,
      { jobId: payload.jobId },
    );
  }

  @OnEvent(EarningsEvents.CONFIRMED)
  async onEarningsConfirmed(payload: EarningsConfirmedPayload): Promise<void> {
    // Notify collector earnings confirmed — Phase 1 §7.2
    await this.createAndDispatch(
      payload.collectorId,
      NotificationType.EARNINGS_CONFIRMED,
      { jobId: payload.jobId },
    );
  }

  // ─── CORE METHODS ─────────────────────────────────────────────

  /**
   * Create a notification, persist it, and dispatch via appropriate channels.
   */
  async createAndDispatch(
    userId: string,
    type: string,
    context: TemplateContext,
  ): Promise<void> {
    try {
      const template = getTemplate(type, context);

      // 1. Always persist IN_APP notification (marked SENT immediately)
      const inApp = this.notifRepo.create({
        userId,
        type,
        title: template.title,
        body: template.body,
        data: context,
        channel: NotificationChannel.IN_APP,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
      await this.notifRepo.save(inApp);

      // 2. Attempt PUSH delivery
      const user = await this.usersService.findById(userId);
      if (user?.fcmToken) {
        const pushNotif = this.notifRepo.create({
          userId,
          type,
          title: template.title,
          body: template.body,
          data: context,
          channel: NotificationChannel.PUSH,
          status: NotificationStatus.PENDING,
        });
        const savedPush = await this.notifRepo.save(pushNotif);

        const pushResult = await this.fcmProvider.send({
          token: user.fcmToken,
          title: template.title,
          body: template.body,
          data: this.stringifyData(context),
        });

        savedPush.status = pushResult.success
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED;
        savedPush.sentAt = pushResult.success ? new Date() : null;
        await this.notifRepo.save(savedPush);
      }

      // 3. SMS — only if flag enabled OR critical event
      const smsEnabled = await this.featureFlagService.isEnabled(
        FEATURE_FLAGS.SMS_NOTIFICATIONS,
        false,
      );
      const isCritical = CRITICAL_NOTIFICATION_TYPES.has(type);

      if ((smsEnabled || isCritical) && user?.phone) {
        const smsNotif = this.notifRepo.create({
          userId,
          type,
          title: template.title,
          body: template.body,
          data: context,
          channel: NotificationChannel.SMS,
          status: NotificationStatus.PENDING,
        });
        const savedSms = await this.notifRepo.save(smsNotif);

        const smsResult = await this.smsProvider.send({
          phone: user.phone,
          body: `${template.title}: ${template.body}`,
        });

        savedSms.status = smsResult.success
          ? NotificationStatus.SENT
          : NotificationStatus.FAILED;
        savedSms.sentAt = smsResult.success ? new Date() : null;
        await this.notifRepo.save(savedSms);
      }

      this.logger.log(`Notification dispatched: ${type} → user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to dispatch notification ${type} to user ${userId}: ${error.message}`,
      );
    }
  }

  // ─── READ APIs ────────────────────────────────────────────────

  async getNotifications(
    userId: string,
    filter: NotificationFilterDto,
  ): Promise<PaginatedResponse<NotificationResponseDto>> {
    const where: FindOptionsWhere<Notification> = {
      userId,
      channel: NotificationChannel.IN_APP,
    };

    if (filter.unreadOnly) {
      where.readAt = IsNull();
    }

    const [items, total] = await this.notifRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: ((filter.page ?? 1) - 1) * (filter.limit ?? 20),
      take: filter.limit ?? 20,
    });

    return paginate(
      items.map((n) => this.toResponseDto(n)),
      total,
      filter.page ?? 1,
      filter.limit ?? 20,
    );
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationResponseDto> {
    const notif = await this.notifRepo.findOne({
      where: { id: notificationId },
    });

    if (!notif) {
      throw new NotFoundException('Notification not found');
    }

    if (notif.userId !== userId) {
      throw new ForbiddenException('Cannot access this notification');
    }

    notif.status = NotificationStatus.READ;
    notif.readAt = new Date();
    const saved = await this.notifRepo.save(notif);
    return this.toResponseDto(saved);
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({
        status: NotificationStatus.READ,
        readAt: new Date(),
      })
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .andWhere('channel = :channel', { channel: NotificationChannel.IN_APP })
      .execute();

    return { count: result.affected ?? 0 };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  private toResponseDto(n: Notification): NotificationResponseDto {
    return {
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      channel: n.channel,
      status: n.status,
      sentAt: n.sentAt,
      readAt: n.readAt,
      createdAt: n.createdAt,
    };
  }

  private stringifyData(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
    return result;
  }
}
