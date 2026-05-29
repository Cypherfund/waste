import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommissionService } from './commission.service';
import { BudgetService } from './budget.service';
import {
  CommissionScheme,
  CommissionTransaction,
  CommissionStatus,
  MarketerProfile,
  MarketerSchemeAssignment,
  MarketingCampaign,
} from '../entities';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CommissionService', () => {
  let service: CommissionService;
  let schemeRepo: any;
  let transactionRepo: any;
  let profileRepo: any;
  let assignmentRepo: any;
  let campaignRepo: any;

  beforeEach(async () => {
    schemeRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'scheme-1', ...entity })),
      update: jest.fn(),
    };

    transactionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    profileRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    assignmentRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'assign-1', ...entity })),
      update: jest.fn(),
    };

    campaignRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: getRepositoryToken(CommissionScheme), useValue: schemeRepo },
        { provide: getRepositoryToken(CommissionTransaction), useValue: transactionRepo },
        { provide: getRepositoryToken(MarketerProfile), useValue: profileRepo },
        { provide: getRepositoryToken(MarketerSchemeAssignment), useValue: assignmentRepo },
        { provide: getRepositoryToken(MarketingCampaign), useValue: campaignRepo },
        { provide: BudgetService, useValue: { reserveBudget: jest.fn() } },
      ],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
  });

  describe('approveTransaction', () => {
    it('should move amount from pending to approved and increment totalEarned', async () => {
      const profile = {
        id: 'profile-1',
        pendingAmount: 2000,
        approvedAmount: 3000,
        totalEarned: 5000,
      };
      const campaign = {
        id: 'campaign-1',
        status: 'ACTIVE',
        committedAmount: 0,
        budgetPeriod: { remainingBudget: 10000, status: 'ACTIVE' },
      };
      const tx = {
        id: 'tx-1',
        status: CommissionStatus.PENDING,
        amount: 500,
        marketerProfile: profile,
        campaignId: 'campaign-1',
      };
      transactionRepo.findOne.mockResolvedValue(tx);
      campaignRepo.findOne.mockResolvedValue(campaign);

      const result = await service.approveTransaction('tx-1', 'admin-1');

      expect(result.status).toBe(CommissionStatus.APPROVED);
      expect(result.reviewedBy).toBe('admin-1');
      expect(result.reviewedAt).toBeInstanceOf(Date);

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingAmount: 1500,   // 2000 - 500
          approvedAmount: 3500,  // 3000 + 500
          totalEarned: 5500,     // 5000 + 500
        }),
      );
    });

    it('should throw NotFoundException if transaction not found', async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approveTransaction('nonexistent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if transaction is not pending', async () => {
      transactionRepo.findOne.mockResolvedValue({
        id: 'tx-1',
        status: CommissionStatus.APPROVED,
      });

      await expect(
        service.approveTransaction('tx-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject re-approving an already approved transaction', async () => {
      transactionRepo.findOne.mockResolvedValue({
        id: 'tx-1',
        status: CommissionStatus.APPROVED,
      });

      await expect(
        service.approveTransaction('tx-1', 'admin-1'),
      ).rejects.toThrow('Transaction is not pending');
    });

    it('should reject approving a rejected transaction', async () => {
      transactionRepo.findOne.mockResolvedValue({
        id: 'tx-1',
        status: CommissionStatus.REJECTED,
      });

      await expect(
        service.approveTransaction('tx-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectTransaction', () => {
    it('should subtract from pendingAmount only (no totalEarned change)', async () => {
      const profile = {
        id: 'profile-1',
        pendingAmount: 2000,
        approvedAmount: 3000,
        totalEarned: 5000,
      };
      const tx = {
        id: 'tx-1',
        status: CommissionStatus.PENDING,
        amount: 500,
        marketerProfile: profile,
      };
      transactionRepo.findOne.mockResolvedValue(tx);

      const result = await service.rejectTransaction('tx-1', 'admin-1', { reason: 'Fraudulent lead' });

      expect(result.status).toBe(CommissionStatus.REJECTED);
      expect(result.rejectionReason).toBe('Fraudulent lead');
      expect(result.reviewedBy).toBe('admin-1');

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pendingAmount: 1500,   // 2000 - 500
          approvedAmount: 3000,  // unchanged
          totalEarned: 5000,     // unchanged
        }),
      );
    });

    it('should throw NotFoundException if transaction not found', async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.rejectTransaction('nonexistent', 'admin-1', { reason: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if transaction already rejected', async () => {
      transactionRepo.findOne.mockResolvedValue({
        id: 'tx-1',
        status: CommissionStatus.REJECTED,
      });

      await expect(
        service.rejectTransaction('tx-1', 'admin-1', { reason: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEligibleSchemes', () => {
    it('should return only active schemes of matching type', async () => {
      assignmentRepo.find.mockResolvedValue([
        { scheme: { id: 's1', type: 'HOUSEHOLD_ONBOARDING', isActive: true } },
        { scheme: { id: 's2', type: 'COLLECTOR_ONBOARDING', isActive: true } },
        { scheme: { id: 's3', type: 'HOUSEHOLD_ONBOARDING', isActive: false } },
      ]);

      const result = await service.getEligibleSchemes('profile-1', 'HOUSEHOLD_ONBOARDING');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('s1');
    });

    it('should return empty array when no schemes match', async () => {
      assignmentRepo.find.mockResolvedValue([]);

      const result = await service.getEligibleSchemes('profile-1', 'HOUSEHOLD_ONBOARDING');

      expect(result).toHaveLength(0);
    });
  });

  describe('assignScheme', () => {
    it('should reactivate existing assignment instead of creating duplicate', async () => {
      const existing = {
        id: 'assign-1',
        marketerProfileId: 'profile-1',
        schemeId: 'scheme-1',
        isActive: false,
      };
      assignmentRepo.findOne.mockResolvedValue(existing);

      await service.assignScheme('profile-1', 'scheme-1', 'admin-1');

      expect(assignmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
      expect(assignmentRepo.create).not.toHaveBeenCalled();
    });

    it('should create new assignment when none exists', async () => {
      assignmentRepo.findOne.mockResolvedValue(null);

      await service.assignScheme('profile-1', 'scheme-1', 'admin-1');

      expect(assignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          marketerProfileId: 'profile-1',
          schemeId: 'scheme-1',
          assignedBy: 'admin-1',
          isActive: true,
        }),
      );
    });
  });
});
