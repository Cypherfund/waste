import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CommissionEngineService } from './commission-engine.service';
import { CommissionService } from './commission.service';
import { LeadService } from './lead.service';
import { MarketerNotificationService } from './marketer-notification.service';
import { Lead, LeadStatus, CommissionTransaction, TriggerType, MarketerProfile } from '../entities';
import { Job } from '../../jobs/entities/job.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { JobEventPayload, SubscriptionPaidPayload } from '../../events/events.types';

describe('CommissionEngineService', () => {
  let service: CommissionEngineService;
  let leadRepo: any;
  let transactionRepo: any;
  let profileRepo: any;
  let jobRepo: any;
  let commissionService: any;
  let leadService: any;
  let notificationService: any;

  // Simulates how TypeORM actually returns decimal columns from PostgreSQL — as strings
  const makeProfile = (pendingAmount: number | string = '0') => ({
    id: 'profile-1',
    userId: 'marketer-1',
    pendingAmount: pendingAmount as any,
    approvedAmount: '0' as any,
    totalEarned: '0' as any,
    totalPaid: '0' as any,
  });

  const makeHouseholdLead = (extra: Partial<any> = {}) => ({
    id: 'lead-1',
    marketerId: 'marketer-1',
    registeredUserId: 'hh-user-1',
    type: 'HOUSEHOLD',
    status: LeadStatus.REGISTERED,
    campaignId: 'campaign-1',
    ...extra,
  });

  const makeCollectorLead = (extra: Partial<any> = {}) => ({
    id: 'lead-2',
    marketerId: 'marketer-1',
    registeredUserId: 'col-user-1',
    type: 'COLLECTOR',
    status: LeadStatus.REGISTERED,
    campaignId: 'campaign-1',
    ...extra,
  });

  const makeJob = (paymentStatus: PaymentStatus = PaymentStatus.VERIFIED) => ({
    id: 'job-1',
    paymentStatus,
  });

  const mockScheme = { id: 'scheme-1', commissionType: 'FIXED', amount: 500, type: 'HOUSEHOLD_ONBOARDING' };

  const jobValidatedPayload: JobEventPayload = {
    jobId: 'job-1',
    householdId: 'hh-user-1',
    collectorId: 'col-user-1',
    status: 'validated' as any,
    timestamp: new Date(),
  };

  const jobCompletedPayload: JobEventPayload = {
    jobId: 'job-1',
    householdId: 'hh-user-1',
    collectorId: 'col-user-1',
    status: 'completed' as any,
    timestamp: new Date(),
  };

  const subscriptionPaidPayload: SubscriptionPaidPayload = {
    subscriptionId: 'sub-1',
    userId: 'hh-user-1',
    planId: 'plan-1',
    planName: 'Basic Plan',
    amount: 3000,
    timestamp: new Date(),
  };

  beforeEach(async () => {
    leadRepo = { findOne: jest.fn() };
    transactionRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'tx-1', ...entity })),
    };
    profileRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    jobRepo = { findOne: jest.fn() };
    commissionService = { getEligibleSchemes: jest.fn() };
    leadService = { markLeadQualified: jest.fn() };
    notificationService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionEngineService,
        { provide: getRepositoryToken(Lead), useValue: leadRepo },
        { provide: getRepositoryToken(CommissionTransaction), useValue: transactionRepo },
        { provide: getRepositoryToken(MarketerProfile), useValue: profileRepo },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: CommissionService, useValue: commissionService },
        { provide: LeadService, useValue: leadService },
        { provide: MarketerNotificationService, useValue: notificationService },
        { provide: EventEmitter2, useValue: { emit: jest.fn(), emitAsync: jest.fn() } },
      ],
    }).compile();

    service = module.get<CommissionEngineService>(CommissionEngineService);
  });

  // ── Regression: TypeORM returns decimal columns as strings ──────────────────
  describe('REGRESSION: pendingAmount decimal string concatenation bug', () => {
    it('should store pendingAmount as a NUMBER (not string-concatenated) when profile.pendingAmount comes from DB as a string', async () => {
      // Simulate DB returning pendingAmount as string "0.00" (TypeORM decimal behaviour)
      const profile = makeProfile('0.00');
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead());
      profileRepo.findOne.mockResolvedValue(profile);
      jobRepo.findOne.mockResolvedValue(makeJob());
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleJobValidated(jobValidatedPayload);

      const savedProfile = profileRepo.save.mock.calls[0][0];
      // Bug: "0.00" + 500 = "0.00500" → NaN or wrong on parseFloat
      // Fix: parseFloat("0.00") + 500 = 500
      expect(typeof savedProfile.pendingAmount).toBe('number');
      expect(savedProfile.pendingAmount).toBe(500);
    });

    it('should accumulate correctly when pendingAmount already has a value as DB string', async () => {
      // Simulate profile that already had a commission: DB returns "500.00"
      const profile = makeProfile('500.00');
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead({ id: 'lead-99', registeredUserId: 'hh-user-1' }));
      profileRepo.findOne.mockResolvedValue(profile);
      jobRepo.findOne.mockResolvedValue({ ...makeJob(), id: 'job-99' });
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleJobValidated({ ...jobValidatedPayload, jobId: 'job-99' });

      const savedProfile = profileRepo.save.mock.calls[0][0];
      expect(savedProfile.pendingAmount).toBe(1000); // 500 + 500, not "500.00500"
    });
  });

  // ── handleJobValidated (HOUSEHOLD commission) ────────────────────────────────
  describe('handleJobValidated', () => {
    it('should create a PENDING commission for a household lead on job validated', async () => {
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead());
      profileRepo.findOne.mockResolvedValue(makeProfile());
      jobRepo.findOne.mockResolvedValue(makeJob());
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleJobValidated(jobValidatedPayload);

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerType: TriggerType.FIRST_SUCCESSFUL_BOOKING,
          referenceId: 'job-1',
          amount: 500,
          status: 'PENDING',
          campaignId: 'campaign-1',
        }),
      );
      expect(transactionRepo.save).toHaveBeenCalled();
      expect(leadService.markLeadQualified).toHaveBeenCalledWith('lead-1', 'booking');
    });

    it('should skip when no lead found for household', async () => {
      leadRepo.findOne.mockResolvedValue(null);

      await service.handleJobValidated(jobValidatedPayload);

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should skip when lead has no campaignId', async () => {
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead({ campaignId: null }));

      await service.handleJobValidated(jobValidatedPayload);

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should skip when job payment is not VERIFIED or NOT_REQUIRED', async () => {
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead());
      jobRepo.findOne.mockResolvedValue(makeJob(PaymentStatus.PENDING));

      await service.handleJobValidated(jobValidatedPayload);

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should not skip when job payment is NOT_REQUIRED', async () => {
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead());
      profileRepo.findOne.mockResolvedValue(makeProfile());
      jobRepo.findOne.mockResolvedValue(makeJob(PaymentStatus.NOT_REQUIRED));
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleJobValidated(jobValidatedPayload);

      expect(transactionRepo.save).toHaveBeenCalled();
    });

    it('should skip when commission already exists (idempotency)', async () => {
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead());
      profileRepo.findOne.mockResolvedValue(makeProfile());
      jobRepo.findOne.mockResolvedValue(makeJob());
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue({ id: 'existing-tx' });

      await service.handleJobValidated(jobValidatedPayload);

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should skip when no eligible schemes assigned to marketer', async () => {
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead());
      profileRepo.findOne.mockResolvedValue(makeProfile());
      jobRepo.findOne.mockResolvedValue(makeJob());
      commissionService.getEligibleSchemes.mockResolvedValue([]);

      await service.handleJobValidated(jobValidatedPayload);

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── handleJobCompleted (COLLECTOR commission) ────────────────────────────────
  describe('handleJobCompleted', () => {
    it('should create a PENDING commission for a collector lead on job completed', async () => {
      leadRepo.findOne.mockResolvedValue(makeCollectorLead());
      profileRepo.findOne.mockResolvedValue(makeProfile());
      jobRepo.findOne.mockResolvedValue(makeJob());
      commissionService.getEligibleSchemes.mockResolvedValue([
        { ...mockScheme, type: 'COLLECTOR_ONBOARDING' },
      ]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleJobCompleted(jobCompletedPayload);

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerType: TriggerType.FIRST_PICKUP_COMPLETED,
          referenceId: 'job-1',
        }),
      );
      expect(transactionRepo.save).toHaveBeenCalled();
    });

    it('should skip when no collectorId in payload', async () => {
      await service.handleJobCompleted({ ...jobCompletedPayload, collectorId: undefined });

      expect(leadRepo.findOne).not.toHaveBeenCalled();
    });

    it('should skip when commission already exists (idempotency)', async () => {
      leadRepo.findOne.mockResolvedValue(makeCollectorLead());
      profileRepo.findOne.mockResolvedValue(makeProfile());
      jobRepo.findOne.mockResolvedValue(makeJob());
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue({ id: 'existing-tx' });

      await service.handleJobCompleted(jobCompletedPayload);

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should save pendingAmount as a number when DB returns string for collector commission', async () => {
      const profile = makeProfile('250.00');
      leadRepo.findOne.mockResolvedValue(makeCollectorLead());
      profileRepo.findOne.mockResolvedValue(profile);
      jobRepo.findOne.mockResolvedValue(makeJob());
      commissionService.getEligibleSchemes.mockResolvedValue([{ ...mockScheme, type: 'COLLECTOR_ONBOARDING' }]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleJobCompleted(jobCompletedPayload);

      const savedProfile = profileRepo.save.mock.calls[0][0];
      expect(typeof savedProfile.pendingAmount).toBe('number');
      expect(savedProfile.pendingAmount).toBe(750); // 250 + 500
    });
  });

  // ── handleSubscriptionPaid (SUBSCRIPTION commission) ─────────────────────────
  describe('handleSubscriptionPaid', () => {
    const subScheme = { id: 'scheme-sub', commissionType: 'PERCENTAGE', amount: 10, type: 'SUBSCRIPTION_PAYMENT' };

    it('should create commission with correct percentage of subscription amount', async () => {
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead());
      profileRepo.findOne.mockResolvedValue(makeProfile());
      commissionService.getEligibleSchemes.mockResolvedValue([subScheme]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleSubscriptionPaid(subscriptionPaidPayload);

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 300, // 10% of 3000
          triggerType: TriggerType.SUBSCRIPTION_PAID,
          referenceId: 'sub-1',
        }),
      );
    });

    it('should skip when commission already exists (idempotency)', async () => {
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead());
      profileRepo.findOne.mockResolvedValue(makeProfile());
      commissionService.getEligibleSchemes.mockResolvedValue([subScheme]);
      transactionRepo.findOne.mockResolvedValue({ id: 'existing-tx' });

      await service.handleSubscriptionPaid(subscriptionPaidPayload);

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should skip when lead has no campaignId', async () => {
      leadRepo.findOne.mockResolvedValue(makeHouseholdLead({ campaignId: null }));

      await service.handleSubscriptionPaid(subscriptionPaidPayload);

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });
  });
});
