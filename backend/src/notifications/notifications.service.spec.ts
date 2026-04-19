import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { FcmProvider } from './providers/fcm.provider';
import { SmsProvider } from './providers/sms.provider';
import { FeatureFlagService } from '../config/feature-flags';
import { UsersService } from '../users/users.service';
import { NotificationChannel, NotificationStatus } from '../common/enums/notification-channel.enum';
import { NotificationType } from '../common/enums/notification-type.enum';
import { JobEvents } from '../events/events.types';
import { JobStatus } from '../common/enums/job-status.enum';

// ─── Helpers ────────────────────────────────────────────────────

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    userId: 'user-1',
    type: NotificationType.JOB_ASSIGNED,
    title: 'Test',
    body: 'Test body',
    data: {},
    channel: NotificationChannel.IN_APP,
    status: NotificationStatus.SENT,
    sentAt: new Date(),
    readAt: null,
    createdAt: new Date(),
    user: null as any,
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notifRepo: any;
  let fcmProvider: Partial<FcmProvider>;
  let smsProvider: Partial<SmsProvider>;
  let featureFlagService: Partial<FeatureFlagService>;
  let usersService: Partial<UsersService>;

  beforeEach(async () => {
    notifRepo = {
      create: jest.fn((dto) => ({
        ...dto,
        id: `notif-${Date.now()}`,
        createdAt: new Date(),
      })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      }),
    };

    fcmProvider = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'fcm-123' }),
    };

    smsProvider = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'sms-123' }),
    };

    featureFlagService = {
      isEnabled: jest.fn().mockResolvedValue(false), // SMS off by default
    };

    usersService = {
      findById: jest.fn().mockResolvedValue({
        id: 'user-1',
        phone: '+237600000000',
        fcmToken: 'fcm-token-abc',
      }),
      findByRole: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: notifRepo },
        { provide: FcmProvider, useValue: fcmProvider },
        { provide: SmsProvider, useValue: smsProvider },
        { provide: FeatureFlagService, useValue: featureFlagService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  // ─── Template Generation ──────────────────────────────────────

  describe('createAndDispatch', () => {
    it('should always create an IN_APP notification marked SENT', async () => {
      await service.createAndDispatch('user-1', NotificationType.JOB_ASSIGNED, {
        jobId: 'job-1',
      });

      // First save call = IN_APP
      const firstSave = notifRepo.save.mock.calls[0][0];
      expect(firstSave.channel).toBe(NotificationChannel.IN_APP);
      expect(firstSave.status).toBe(NotificationStatus.SENT);
      expect(firstSave.sentAt).toBeDefined();
    });

    it('should generate correct template for JOB_ASSIGNED', async () => {
      await service.createAndDispatch('user-1', NotificationType.JOB_ASSIGNED, {
        jobId: 'abcd1234-5678-abcd-1234-567890abcdef',
      });

      const inAppSave = notifRepo.save.mock.calls[0][0];
      expect(inAppSave.title).toBe('New Job Assigned');
      expect(inAppSave.body).toContain('abcd1234');
    });

    it('should generate correct template for JOB_CANCELLED with reason', async () => {
      await service.createAndDispatch('user-1', NotificationType.JOB_CANCELLED, {
        jobId: 'job-1',
        reason: 'No longer needed',
      });

      const inAppSave = notifRepo.save.mock.calls[0][0];
      expect(inAppSave.title).toBe('Job Cancelled');
      expect(inAppSave.body).toContain('No longer needed');
    });

    it('should attempt PUSH if user has FCM token', async () => {
      await service.createAndDispatch('user-1', NotificationType.JOB_STARTED, {
        jobId: 'job-1',
      });

      expect(fcmProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'fcm-token-abc' }),
      );
    });

    it('should not attempt PUSH if user has no FCM token', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue({
        id: 'user-1',
        phone: '+237600000000',
        fcmToken: null,
      });

      await service.createAndDispatch('user-1', NotificationType.JOB_STARTED, {
        jobId: 'job-1',
      });

      expect(fcmProvider.send).not.toHaveBeenCalled();
    });

    it('should mark PUSH as FAILED when provider fails', async () => {
      (fcmProvider.send as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Token expired',
      });

      await service.createAndDispatch('user-1', NotificationType.JOB_STARTED, {
        jobId: 'job-1',
      });

      // IN_APP (save 1), PUSH created (save 2), PUSH updated (save 3)
      const pushUpdate = notifRepo.save.mock.calls[2][0];
      expect(pushUpdate.status).toBe(NotificationStatus.FAILED);
      expect(pushUpdate.sentAt).toBeNull();
    });
  });

  // ─── SMS Feature Flag Behavior ────────────────────────────────

  describe('SMS delivery', () => {
    it('should NOT send SMS when flag is off and event is non-critical', async () => {
      // JOB_ACCEPTED is non-critical, SMS flag off
      await service.createAndDispatch('user-1', NotificationType.JOB_ACCEPTED, {
        jobId: 'job-1',
      });

      expect(smsProvider.send).not.toHaveBeenCalled();
    });

    it('should send SMS when flag is ON', async () => {
      (featureFlagService.isEnabled as jest.Mock).mockResolvedValue(true);

      await service.createAndDispatch('user-1', NotificationType.JOB_ACCEPTED, {
        jobId: 'job-1',
      });

      expect(smsProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+237600000000' }),
      );
    });

    it('should send SMS for critical event even when flag is OFF', async () => {
      // JOB_ASSIGNED is critical
      await service.createAndDispatch('user-1', NotificationType.JOB_ASSIGNED, {
        jobId: 'job-1',
      });

      expect(smsProvider.send).toHaveBeenCalled();
    });

    it('should send SMS for JOB_CANCELLED (critical) even when flag is OFF', async () => {
      await service.createAndDispatch('user-1', NotificationType.JOB_CANCELLED, {
        jobId: 'job-1',
      });

      expect(smsProvider.send).toHaveBeenCalled();
    });

    it('should send SMS for ASSIGNMENT_ESCALATED (critical) even when flag is OFF', async () => {
      await service.createAndDispatch('user-1', NotificationType.ASSIGNMENT_ESCALATED, {
        jobId: 'job-1',
        attempts: 3,
      });

      expect(smsProvider.send).toHaveBeenCalled();
    });

    it('should send SMS for JOB_COMPLETED (critical) even when flag is OFF', async () => {
      await service.createAndDispatch('user-1', NotificationType.JOB_COMPLETED, {
        jobId: 'job-1',
      });

      expect(smsProvider.send).toHaveBeenCalled();
    });

    it('should send SMS for ASSIGNMENT_TIMEOUT (critical) even when flag is OFF', async () => {
      await service.createAndDispatch('user-1', NotificationType.ASSIGNMENT_TIMEOUT, {
        jobId: 'job-1',
      });

      expect(smsProvider.send).toHaveBeenCalled();
    });
  });

  // ─── Event Listeners (recipient resolution) ───────────────────

  describe('event listeners', () => {
    beforeEach(() => {
      jest.spyOn(service, 'createAndDispatch').mockResolvedValue();
    });

    it('onJobAssigned should notify the collector', async () => {
      await service.onJobAssigned({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        status: JobStatus.ASSIGNED,
        timestamp: new Date(),
        attempt: 1,
      });

      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'col-1',
        NotificationType.JOB_ASSIGNED,
        expect.objectContaining({ jobId: 'job-1' }),
      );
    });

    it('onJobAccepted should notify the household', async () => {
      await service.onJobAccepted({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        status: JobStatus.ASSIGNED,
        timestamp: new Date(),
      });

      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'hh-1',
        NotificationType.JOB_ACCEPTED,
        expect.any(Object),
      );
    });

    it('onJobCancelled should notify both household and collector', async () => {
      await service.onJobCancelled({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        status: JobStatus.CANCELLED,
        timestamp: new Date(),
        cancelledBy: 'hh-1',
        reason: 'No longer needed',
      });

      expect(service.createAndDispatch).toHaveBeenCalledTimes(2);
      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'hh-1',
        NotificationType.JOB_CANCELLED,
        expect.any(Object),
      );
      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'col-1',
        NotificationType.JOB_CANCELLED,
        expect.any(Object),
      );
    });

    it('onJobValidated should notify the collector', async () => {
      await service.onJobValidated({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        status: JobStatus.VALIDATED,
        timestamp: new Date(),
      });

      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'col-1',
        NotificationType.PROOF_VALIDATED,
        expect.any(Object),
      );
    });

    it('onAssignmentTimeout should notify the collector', async () => {
      await service.onAssignmentTimeout({
        jobId: 'job-1',
        collectorId: 'col-1',
        attempt: 1,
        timestamp: new Date(),
      });

      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'col-1',
        NotificationType.ASSIGNMENT_TIMEOUT,
        expect.any(Object),
      );
    });

    it('onProofUploaded should notify the household', async () => {
      await service.onProofUploaded({
        proofId: 'proof-1',
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        timestamp: new Date(),
      });

      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'hh-1',
        NotificationType.PROOF_UPLOADED,
        expect.objectContaining({ jobId: 'job-1' }),
      );
    });

    it('onProofAutoValidated should notify both household and collector', async () => {
      await service.onProofAutoValidated({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        timestamp: new Date(),
      });

      expect(service.createAndDispatch).toHaveBeenCalledTimes(2);
      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'hh-1',
        NotificationType.PROOF_AUTO_VALIDATED,
        expect.objectContaining({ jobId: 'job-1' }),
      );
      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'col-1',
        NotificationType.PROOF_AUTO_VALIDATED,
        expect.objectContaining({ jobId: 'job-1' }),
      );
    });

    it('onJobRated should notify the collector', async () => {
      await service.onJobRated({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        ratingId: 'rating-1',
        value: 5,
        timestamp: new Date(),
      });

      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'col-1',
        NotificationType.JOB_RATED,
        expect.objectContaining({ jobId: 'job-1' }),
      );
    });

    it('onEarningsConfirmed should notify the collector', async () => {
      await service.onEarningsConfirmed({
        earningsId: 'earn-1',
        jobId: 'job-1',
        collectorId: 'col-1',
        amount: 750,
        timestamp: new Date(),
      });

      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'col-1',
        NotificationType.EARNINGS_CONFIRMED,
        expect.objectContaining({ jobId: 'job-1' }),
      );
    });

    it('onAssignmentEscalated should notify admin users (not household)', async () => {
      (usersService.findByRole as jest.Mock).mockResolvedValue([
        { id: 'admin-1' },
        { id: 'admin-2' },
      ]);

      await service.onAssignmentEscalated({
        jobId: 'job-1',
        householdId: 'hh-1',
        attempts: 3,
        timestamp: new Date(),
      });

      expect(usersService.findByRole).toHaveBeenCalledWith('ADMIN');
      expect(service.createAndDispatch).toHaveBeenCalledTimes(2);
      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'admin-1',
        NotificationType.ASSIGNMENT_ESCALATED,
        expect.objectContaining({ attempts: 3 }),
      );
      expect(service.createAndDispatch).toHaveBeenCalledWith(
        'admin-2',
        NotificationType.ASSIGNMENT_ESCALATED,
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });

  // ─── Mark as Read ─────────────────────────────────────────────

  describe('markAsRead', () => {
    it('should mark a notification as READ', async () => {
      const notif = makeNotif({ status: NotificationStatus.SENT });
      notifRepo.findOne.mockResolvedValue(notif);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result.status).toBe(NotificationStatus.READ);
      expect(result.readAt).toBeDefined();
    });

    it('should throw NotFoundException for non-existent notification', async () => {
      notifRepo.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('notif-999', 'user-1')).rejects.toThrow(
        'Notification not found',
      );
    });

    it('should throw ForbiddenException if notification belongs to another user', async () => {
      const notif = makeNotif({ userId: 'other-user' });
      notifRepo.findOne.mockResolvedValue(notif);

      await expect(service.markAsRead('notif-1', 'user-1')).rejects.toThrow(
        'Cannot access this notification',
      );
    });
  });

  // ─── Mark All as Read ─────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('should return count of notifications marked as read', async () => {
      const result = await service.markAllAsRead('user-1');
      expect(result).toEqual({ count: 3 });
    });
  });

  // ─── getNotifications ─────────────────────────────────────────

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const notifs = [makeNotif(), makeNotif({ id: 'notif-2' })];
      notifRepo.findAndCount.mockResolvedValue([notifs, 2]);

      const result = await service.getNotifications('user-1', {});

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should apply unreadOnly filter', async () => {
      notifRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getNotifications('user-1', { unreadOnly: true });

      const whereArg = notifRepo.findAndCount.mock.calls[0][0].where;
      expect(whereArg).toHaveProperty('readAt');
    });
  });
});
