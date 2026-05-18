import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MarketerPayoutService } from './marketer-payout.service';
import { MarketerNotificationService } from './marketer-notification.service';
import { MarketerPayoutRequest, PayoutStatus, PayoutMethod, MarketerProfile, CommissionTransaction } from '../entities';
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

  describe('createPayoutRequest', () => {
    it('should reject when amount exceeds approved balance', async () => {
      profileRepo.findOne.mockResolvedValue({
        id: 'profile-1',
        approvedAmount: 1000,
      });

      await expect(
        service.createPayoutRequest('profile-1', {
          amount: 2000,
          method: PayoutMethod.MTN_MOMO,
          accountNumber: '670000000',
          accountName: 'Test Name',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when a pending payout already exists', async () => {
      profileRepo.findOne.mockResolvedValue({
        id: 'profile-1',
        approvedAmount: 5000,
      });
      payoutRepo.findOne.mockResolvedValue({ id: 'existing-payout', status: 'PENDING' });

      await expect(
        service.createPayoutRequest('profile-1', {
          amount: 2000,
          method: PayoutMethod.MTN_MOMO,
          accountNumber: '670000000',
          accountName: 'Test Name',
        }),
      ).rejects.toThrow('You already have a pending payout request');
    });

    it('should deduct approvedAmount transactionally on successful creation', async () => {
      profileRepo.findOne.mockResolvedValue({
        id: 'profile-1',
        approvedAmount: 5000,
      });
      payoutRepo.findOne.mockResolvedValue(null); // no existing pending

      const savedProfile = { id: 'profile-1', approvedAmount: 3000 };
      dataSource.transaction.mockImplementation(async (cb: any) => {
        const manager = {
          create: jest.fn((_E: any, dto: any) => dto),
          save: jest.fn(async (entity: any) => {
            if (entity.approvedAmount !== undefined) {
              Object.assign(savedProfile, entity);
              return savedProfile;
            }
            return { id: 'payout-1', ...entity };
          }),
        };
        return cb(manager);
      });

      const result = await service.createPayoutRequest('profile-1', {
        amount: 2000,
        method: PayoutMethod.MTN_MOMO,
        accountNumber: '670000000',
          accountName: 'Test Name',
      });

      expect(result).toBeDefined();
      expect(savedProfile.approvedAmount).toBe(3000); // 5000 - 2000
    });

    it('should throw NotFoundException if marketer profile not found', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPayoutRequest('nonexistent', {
          amount: 1000,
          method: PayoutMethod.MTN_MOMO,
          accountNumber: '670000000',
          accountName: 'Test Name',
        }),
      ).rejects.toThrow(NotFoundException);
    });
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
        method: PayoutMethod.MTN_MOMO,
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
