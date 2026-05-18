import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MarketerPayoutService } from './marketer-payout.service';
import { MarketerNotificationService } from './marketer-notification.service';
import { MarketerPayoutRequest, PayoutStatus, MarketerProfile, CommissionTransaction } from '../entities';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MarketerPayoutService', () => {
  let service: MarketerPayoutService;
  let payoutRepo: any;
  let profileRepo: any;
  let transactionRepo: any;
  let notificationService: any;
  let dataSource: any;

  const mockProfile = {
    id: 'profile-1',
    approvedAmount: 5000,
  };

  beforeEach(async () => {
    payoutRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      save: jest.fn((entity) => Promise.resolve({ id: 'payout-1', ...entity })),
    };

    profileRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    transactionRepo = {};

    notificationService = {
      sendNotification: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(async (cb: any) => {
        const manager = {
          create: jest.fn((_Entity: any, dto: any) => dto),
          save: jest.fn((entity: any) => Promise.resolve({ id: 'payout-1', ...entity })),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketerPayoutService,
        { provide: getRepositoryToken(MarketerPayoutRequest), useValue: payoutRepo },
        { provide: getRepositoryToken(MarketerProfile), useValue: profileRepo },
        { provide: getRepositoryToken(CommissionTransaction), useValue: transactionRepo },
        { provide: MarketerNotificationService, useValue: notificationService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<MarketerPayoutService>(MarketerPayoutService);
  });

  describe('rejectPayout - balance return', () => {
    it('should return amount to approvedAmount when payout is rejected', async () => {
      const mockPayout = {
        id: 'payout-1',
        status: PayoutStatus.PENDING,
        amount: 2000,
        marketerProfile: { ...mockProfile, approvedAmount: 3000 },
      };
      payoutRepo.findOne.mockResolvedValue(mockPayout);

      await service.rejectPayout('payout-1', 'admin-1', 'Insufficient docs');

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ approvedAmount: 5000 }),
      );
    });

    it('should reject if payout is not pending', async () => {
      payoutRepo.findOne.mockResolvedValue({
        id: 'payout-1',
        status: PayoutStatus.APPROVED,
      });

      await expect(
        service.rejectPayout('payout-1', 'admin-1', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markAsPaid', () => {
    it('should require paidReference', async () => {
      payoutRepo.findOne.mockResolvedValue({
        id: 'payout-1',
        status: PayoutStatus.APPROVED,
        marketerProfile: { ...mockProfile },
      });

      await expect(
        service.markAsPaid('payout-1', 'admin-1', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update totalPaid when marked as paid', async () => {
      const profile = { ...mockProfile, totalPaid: 1000 };
      payoutRepo.findOne.mockResolvedValue({
        id: 'payout-1',
        status: PayoutStatus.APPROVED,
        amount: 2000,
        method: 'MTN_MOMO',
        marketerProfile: profile,
      });

      await service.markAsPaid('payout-1', 'admin-1', 'REF-123');

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalPaid: 3000 }),
      );
    });

    it('should reject if payout is not approved', async () => {
      payoutRepo.findOne.mockResolvedValue({
        id: 'payout-1',
        status: PayoutStatus.PENDING,
      });

      await expect(
        service.markAsPaid('payout-1', 'admin-1', 'REF-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
