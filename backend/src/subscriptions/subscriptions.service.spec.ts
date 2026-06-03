import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { AdminAuditService } from '../admin/services/admin-audit.service';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { Job } from '../jobs/entities/job.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { SubscriptionEvents } from '../events/events.types';
import { SystemConfigService } from '../config/system-config.service';
import { SentryService } from '../sentry/sentry.service';
import { BusinessLoggerService } from '../common/services/business-logger.service';
import { PaymentService } from '../payments/payment.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let planRepo: any;
  let subRepo: any;
  let eventEmitter: any;

  const makePlan = (overrides: any = {}): any => ({
    id: 'plan-1',
    name: 'Basic',
    price: 3500,
    pickupsPerWeek: 3,
    isActive: true,
    currency: 'XAF',
    ...overrides,
  });

  const makeSub = (overrides: any = {}): any => ({
    id: 'sub-1',
    userId: 'user-1',
    planId: 'plan-1',
    plan: makePlan(),
    status: SubscriptionStatus.ACTIVE,
    paymentStatus: null,
    paymentMode: null,
    paymentRef: null,
    paymentProofUrl: null,
    paymentPhone: null,
    providerTransactionId: null,
    remainingPickupsThisWeek: 3,
    weekResetDate: '2026-05-19',
    startDate: '2026-05-26',
    endDate: '2026-06-26',
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    planRepo = {
      find: jest.fn().mockResolvedValue([makePlan()]),
      findOne: jest.fn().mockResolvedValue(makePlan()),
      create: jest.fn((dto) => dto),
      save: jest.fn((dto) => Promise.resolve({ id: 'plan-new', ...dto })),
    };

    subRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((dto) => dto),
      save: jest.fn((dto) => Promise.resolve({ id: 'sub-1', ...dto })),
    };

    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getRepositoryToken(SubscriptionPlan), useValue: planRepo },
        { provide: getRepositoryToken(UserSubscription), useValue: subRepo },
        { provide: getRepositoryToken(Job), useValue: {} },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: SystemConfigService, useValue: { getNumber: jest.fn().mockResolvedValue(24) } },
        { provide: AdminAuditService, useValue: { log: jest.fn() } },
        {
          provide: SentryService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(false),
            captureException: jest.fn(),
            addBreadcrumb: jest.fn(),
            setContext: jest.fn(),
          },
        },
        {
          provide: BusinessLoggerService,
          useValue: {
            logFailure: jest.fn(),
            logWarning: jest.fn(),
            logInfo: jest.fn(),
            extractRequestContext: jest.fn(),
          },
        },
        {
          provide: PaymentService,
          useValue: {
            initiatePayment: jest.fn().mockResolvedValue({ id: 'mock-tx-id' }),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  // ─── subscribe() — no payment fields ──────────────────────────────────────

  describe('subscribe() without payment fields', () => {
    it('creates an ACTIVE subscription immediately', async () => {
      const result = await service.subscribe('user-1', 'plan-1');

      expect(subRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          remainingPickupsThisWeek: 3,
          paymentMode: null,
          paymentStatus: null,
        }),
      );
      expect(subRepo.save).toHaveBeenCalled();
    });

    it('emits SubscriptionEvents.PAID immediately for free-activate', async () => {
      await service.subscribe('user-1', 'plan-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SubscriptionEvents.PAID,
        expect.objectContaining({ userId: 'user-1', planId: 'plan-1' }),
      );
    });

    it('throws BadRequestException when an ACTIVE subscription already exists', async () => {
      subRepo.findOne.mockResolvedValue(makeSub({ status: SubscriptionStatus.ACTIVE }));

      await expect(service.subscribe('user-1', 'plan-1')).rejects.toThrow(BadRequestException);
      await expect(service.subscribe('user-1', 'plan-1')).rejects.toThrow('active subscription');
    });

    it('throws BadRequestException when a PENDING_PAYMENT subscription already exists', async () => {
      subRepo.findOne.mockResolvedValue(makeSub({ status: SubscriptionStatus.PENDING_PAYMENT }));

      await expect(service.subscribe('user-1', 'plan-1')).rejects.toThrow(
        'awaiting payment verification',
      );
    });

    it('throws NotFoundException when plan does not exist', async () => {
      planRepo.findOne.mockResolvedValue(null);

      await expect(service.subscribe('user-1', 'plan-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── subscribe() — with payment fields (PENDING_PAYMENT path) ─────────────

  describe('subscribe() with payment fields', () => {
    const paymentFields = {
      paymentMode: 'MANUAL_PROVIDER',
      paymentRef: 'TXN-123',
      paymentProofUrl: 'https://cdn.example.com/proof.jpg',
    };

    it('creates a PENDING_PAYMENT subscription', async () => {
      await service.subscribe('user-1', 'plan-1', paymentFields);

      expect(subRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SubscriptionStatus.PENDING_PAYMENT,
          paymentMode: 'MANUAL_PROVIDER',
          paymentStatus: PaymentStatus.AWAITING_ADMIN_VERIFICATION,
          paymentRef: 'TXN-123',
          paymentProofUrl: 'https://cdn.example.com/proof.jpg',
          remainingPickupsThisWeek: 0,
          weekResetDate: null,
        }),
      );
    });

    it('does NOT emit commission event when payment is pending', async () => {
      await service.subscribe('user-1', 'plan-1', paymentFields);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('initiates payment and stores transaction ID for integrated payments', async () => {
      await service.subscribe('user-1', 'plan-1', {
        paymentMode: 'INTEGRATED_PROVIDER',
        paymentPhone: '+237612345678',
      });

      expect(subRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentPhone: '+237612345678',
          providerTransactionId: 'mock-tx-id',
          status: SubscriptionStatus.PENDING_PAYMENT,
        }),
      );
    });
  });

  // ─── adminVerifySubscription() ────────────────────────────────────────────

  describe('adminVerifySubscription()', () => {
    it('sets status to ACTIVE and paymentStatus to VERIFIED', async () => {
      subRepo.findOne.mockResolvedValue(
        makeSub({
          status: SubscriptionStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.AWAITING_ADMIN_VERIFICATION,
        }),
      );
      subRepo.save.mockImplementation((s: any) => Promise.resolve(s));

      const result = await service.adminVerifySubscription('sub-1', 'admin-1');

      expect(subRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          paymentStatus: PaymentStatus.VERIFIED,
        }),
      );
    });

    it('assigns remainingPickupsThisWeek from the plan', async () => {
      subRepo.findOne.mockResolvedValue(
        makeSub({ status: SubscriptionStatus.PENDING_PAYMENT, remainingPickupsThisWeek: 0 }),
      );
      subRepo.save.mockImplementation((s: any) => Promise.resolve(s));

      await service.adminVerifySubscription('sub-1', 'admin-1');

      const saved = subRepo.save.mock.calls[0][0];
      expect(saved.remainingPickupsThisWeek).toBe(3); // plan.pickupsPerWeek
    });

    it('emits SubscriptionEvents.PAID after verification', async () => {
      const sub = makeSub({ status: SubscriptionStatus.PENDING_PAYMENT });
      subRepo.findOne.mockResolvedValue(sub);
      subRepo.save.mockImplementation((s: any) => Promise.resolve({ ...s, id: 'sub-1' }));

      await service.adminVerifySubscription('sub-1', 'admin-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        SubscriptionEvents.PAID,
        expect.objectContaining({ subscriptionId: 'sub-1', userId: 'user-1' }),
      );
    });

    it('throws NotFoundException when subscription does not exist', async () => {
      subRepo.findOne.mockResolvedValue(null);

      await expect(service.adminVerifySubscription('bad-id', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when subscription is not PENDING_PAYMENT', async () => {
      subRepo.findOne.mockResolvedValue(makeSub({ status: SubscriptionStatus.ACTIVE }));

      await expect(service.adminVerifySubscription('sub-1', 'admin-1')).rejects.toThrow(BadRequestException);
      await expect(service.adminVerifySubscription('sub-1', 'admin-1')).rejects.toThrow('not pending payment');
    });
  });

  // ─── adminRejectSubscription() ────────────────────────────────────────────

  describe('adminRejectSubscription()', () => {
    it('sets status to PAYMENT_FAILED and paymentStatus to REJECTED', async () => {
      subRepo.findOne.mockResolvedValue(makeSub({ status: SubscriptionStatus.PENDING_PAYMENT }));
      subRepo.save.mockImplementation((s: any) => Promise.resolve(s));

      await service.adminRejectSubscription('sub-1', 'Fake reference');

      expect(subRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SubscriptionStatus.PAYMENT_FAILED,
          paymentStatus: PaymentStatus.REJECTED,
        }),
      );
    });

    it('does NOT emit any event after rejection', async () => {
      subRepo.findOne.mockResolvedValue(makeSub({ status: SubscriptionStatus.PENDING_PAYMENT }));
      subRepo.save.mockImplementation((s: any) => Promise.resolve(s));

      await service.adminRejectSubscription('sub-1', 'admin-1');

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when subscription does not exist', async () => {
      subRepo.findOne.mockResolvedValue(null);

      await expect(service.adminRejectSubscription('bad-id', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when subscription is already ACTIVE', async () => {
      subRepo.findOne.mockResolvedValue(makeSub({ status: SubscriptionStatus.ACTIVE }));

      await expect(service.adminRejectSubscription('sub-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getMySubscription() ──────────────────────────────────────────────────

  describe('getMySubscription()', () => {
    it('returns an ACTIVE subscription', async () => {
      subRepo.findOne.mockResolvedValue(makeSub());

      const result = await service.getMySubscription('user-1');

      expect(subRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({ status: SubscriptionStatus.ACTIVE }),
            expect.objectContaining({ status: SubscriptionStatus.PENDING_PAYMENT }),
          ]),
        }),
      );
      expect(result).not.toBeNull();
    });

    it('returns a PENDING_PAYMENT subscription so UI can show awaiting state', async () => {
      const pendingSub = makeSub({ status: SubscriptionStatus.PENDING_PAYMENT });
      subRepo.findOne.mockResolvedValue(pendingSub);

      const result = await service.getMySubscription('user-1');

      expect(result?.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
    });

    it('returns null when no subscription found', async () => {
      subRepo.findOne.mockResolvedValue(null);

      const result = await service.getMySubscription('user-1');

      expect(result).toBeNull();
    });
  });

  // ─── adminListPendingSubscriptionPayments() ───────────────────────────────

  describe('adminListPendingSubscriptionPayments()', () => {
    it('queries only PENDING_PAYMENT subscriptions', async () => {
      subRepo.find.mockResolvedValue([makeSub({ status: SubscriptionStatus.PENDING_PAYMENT })]);

      const result = await service.adminListPendingSubscriptionPayments();

      expect(subRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: SubscriptionStatus.PENDING_PAYMENT },
          relations: ['plan', 'user', 'linkedFirstJob'],
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('returns empty array when no pending subscriptions', async () => {
      subRepo.find.mockResolvedValue([]);

      const result = await service.adminListPendingSubscriptionPayments();

      expect(result).toHaveLength(0);
    });
  });
});
