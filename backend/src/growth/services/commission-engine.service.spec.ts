import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommissionEngineService } from './commission-engine.service';
import { CommissionService } from './commission.service';
import { LeadService } from './lead.service';
import { MarketerNotificationService } from './marketer-notification.service';
import { Lead, LeadStatus, CommissionTransaction, CommissionStatus, TriggerType, MarketerProfile } from '../entities';

describe('CommissionEngineService', () => {
  let service: CommissionEngineService;
  let leadRepo: any;
  let transactionRepo: any;
  let profileRepo: any;
  let commissionService: any;
  let leadService: any;
  let notificationService: any;

  const mockProfile = {
    id: 'profile-1',
    userId: 'marketer-1',
    pendingAmount: 0,
    approvedAmount: 0,
    totalEarned: 0,
  };

  const mockLead = {
    id: 'lead-1',
    marketerId: 'marketer-1',
    registeredUserId: 'user-1',
    type: 'HOUSEHOLD',
    status: LeadStatus.REGISTERED,
  };

  const mockScheme = {
    id: 'scheme-1',
    commissionType: 'FIXED',
    amount: 500,
  };

  beforeEach(async () => {
    leadRepo = {
      findOne: jest.fn(),
    };

    transactionRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'tx-1', ...entity })),
    };

    profileRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    commissionService = {
      getEligibleSchemes: jest.fn(),
    };

    leadService = {
      markLeadQualified: jest.fn(),
    };

    notificationService = {
      sendNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionEngineService,
        { provide: getRepositoryToken(Lead), useValue: leadRepo },
        { provide: getRepositoryToken(CommissionTransaction), useValue: transactionRepo },
        { provide: getRepositoryToken(MarketerProfile), useValue: profileRepo },
        { provide: CommissionService, useValue: commissionService },
        { provide: LeadService, useValue: leadService },
        { provide: MarketerNotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<CommissionEngineService>(CommissionEngineService);
  });

  describe('handleBookingCompleted - duplicate prevention', () => {
    it('should skip if commission already exists for same lead+trigger+reference', async () => {
      leadRepo.findOne.mockResolvedValue(mockLead);
      profileRepo.findOne.mockResolvedValue({ ...mockProfile });
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue({ id: 'existing-tx' }); // already exists

      await service.handleBookingCompleted({
        bookingId: 'booking-1',
        userId: 'user-1',
        amount: 5000,
        collectorId: 'col-1',
        paymentStatus: 'PAID',
      });

      expect(transactionRepo.save).not.toHaveBeenCalled();
      expect(leadService.markLeadQualified).not.toHaveBeenCalled();
    });

    it('should create commission when no duplicate exists', async () => {
      leadRepo.findOne.mockResolvedValue(mockLead);
      profileRepo.findOne.mockResolvedValue({ ...mockProfile });
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue(null); // no duplicate

      await service.handleBookingCompleted({
        bookingId: 'booking-1',
        userId: 'user-1',
        amount: 5000,
        collectorId: 'col-1',
        paymentStatus: 'PAID',
      });

      expect(transactionRepo.save).toHaveBeenCalled();
      expect(leadService.markLeadQualified).toHaveBeenCalledWith('lead-1');
    });

    it('should skip when payment is not PAID', async () => {
      await service.handleBookingCompleted({
        bookingId: 'booking-1',
        userId: 'user-1',
        amount: 5000,
        collectorId: 'col-1',
        paymentStatus: 'PENDING',
      });

      expect(leadRepo.findOne).not.toHaveBeenCalled();
    });

    it('should skip when no lead found', async () => {
      leadRepo.findOne.mockResolvedValue(null);

      await service.handleBookingCompleted({
        bookingId: 'booking-1',
        userId: 'user-1',
        amount: 5000,
        collectorId: 'col-1',
        paymentStatus: 'PAID',
      });

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should skip when no marketer profile found', async () => {
      leadRepo.findOne.mockResolvedValue(mockLead);
      profileRepo.findOne.mockResolvedValue(null);

      await service.handleBookingCompleted({
        bookingId: 'booking-1',
        userId: 'user-1',
        amount: 5000,
        collectorId: 'col-1',
        paymentStatus: 'PAID',
      });

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should skip when no eligible schemes', async () => {
      leadRepo.findOne.mockResolvedValue(mockLead);
      profileRepo.findOne.mockResolvedValue({ ...mockProfile });
      commissionService.getEligibleSchemes.mockResolvedValue([]);

      await service.handleBookingCompleted({
        bookingId: 'booking-1',
        userId: 'user-1',
        amount: 5000,
        collectorId: 'col-1',
        paymentStatus: 'PAID',
      });

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should calculate percentage-based commission correctly', async () => {
      const percentScheme = { id: 'scheme-2', commissionType: 'PERCENTAGE', amount: 10 };
      leadRepo.findOne.mockResolvedValue(mockLead);
      profileRepo.findOne.mockResolvedValue({ ...mockProfile });
      commissionService.getEligibleSchemes.mockResolvedValue([percentScheme]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleBookingCompleted({
        bookingId: 'booking-1',
        userId: 'user-1',
        amount: 5000,
        collectorId: 'col-1',
        paymentStatus: 'PAID',
      });

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500 }), // 10% of 5000
      );
    });

    it('should increment pendingAmount on profile after creating commission', async () => {
      const profile = { ...mockProfile, pendingAmount: 1000 };
      leadRepo.findOne.mockResolvedValue(mockLead);
      profileRepo.findOne.mockResolvedValue(profile);
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleBookingCompleted({
        bookingId: 'booking-1',
        userId: 'user-1',
        amount: 5000,
        collectorId: 'col-1',
        paymentStatus: 'PAID',
      });

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ pendingAmount: 1500 }), // 1000 + 500
      );
    });
  });

  describe('handleJobCompleted - duplicate prevention', () => {
    const collectorLead = {
      ...mockLead,
      type: 'COLLECTOR',
      registeredUserId: 'col-user-1',
    };

    it('should skip if commission already exists for same job', async () => {
      leadRepo.findOne.mockResolvedValue(collectorLead);
      profileRepo.findOne.mockResolvedValue({ ...mockProfile });
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue({ id: 'existing-tx' });

      await service.handleJobCompleted({
        jobId: 'job-1',
        collectorId: 'col-user-1',
        householdId: 'hh-1',
        completedAt: new Date(),
      });

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should create commission when no duplicate exists', async () => {
      leadRepo.findOne.mockResolvedValue(collectorLead);
      profileRepo.findOne.mockResolvedValue({ ...mockProfile });
      commissionService.getEligibleSchemes.mockResolvedValue([mockScheme]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleJobCompleted({
        jobId: 'job-1',
        collectorId: 'col-user-1',
        householdId: 'hh-1',
        completedAt: new Date(),
      });

      expect(transactionRepo.save).toHaveBeenCalled();
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerType: TriggerType.FIRST_PICKUP_COMPLETED,
          referenceId: 'job-1',
        }),
      );
    });
  });

  describe('handleSubscriptionPaid - duplicate prevention', () => {
    it('should skip if commission already exists for same subscription', async () => {
      leadRepo.findOne.mockResolvedValue(mockLead);
      profileRepo.findOne.mockResolvedValue({ ...mockProfile });
      commissionService.getEligibleSchemes.mockResolvedValue([{
        id: 'scheme-sub',
        commissionType: 'PERCENTAGE',
        amount: 10,
      }]);
      transactionRepo.findOne.mockResolvedValue({ id: 'existing-tx' });

      await service.handleSubscriptionPaid({
        subscriptionId: 'sub-1',
        userId: 'user-1',
        amount: 3000,
        planType: 'MONTHLY',
      });

      expect(transactionRepo.save).not.toHaveBeenCalled();
    });

    it('should create commission with correct percentage amount', async () => {
      leadRepo.findOne.mockResolvedValue(mockLead);
      profileRepo.findOne.mockResolvedValue({ ...mockProfile });
      commissionService.getEligibleSchemes.mockResolvedValue([{
        id: 'scheme-sub',
        commissionType: 'PERCENTAGE',
        amount: 10,
      }]);
      transactionRepo.findOne.mockResolvedValue(null);

      await service.handleSubscriptionPaid({
        subscriptionId: 'sub-1',
        userId: 'user-1',
        amount: 3000,
        planType: 'MONTHLY',
      });

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 300, // 10% of 3000
          triggerType: TriggerType.SUBSCRIPTION_PAID,
          referenceId: 'sub-1',
        }),
      );
    });
  });
});
