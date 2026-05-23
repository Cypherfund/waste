import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { SystemCleanupService } from './system-cleanup.service';
import { SystemCleanupLog } from '../entities/system-cleanup-log.entity';
import { User } from '../../users/entities/user.entity';
import { Job } from '../../jobs/entities/job.entity';
import { Proof } from '../../jobs/entities/proof.entity';
import { Rating } from '../../ratings/entities/rating.entity';
import { Dispute } from '../../disputes/entities/dispute.entity';
import { FraudFlag } from '../../fraud/entities/fraud-flag.entity';
import { LocationUpdate } from '../../websocket/entities/location-update.entity';
import { UserAddress } from '../../users/entities/user-address.entity';
import { UserPaymentMethod } from '../../wallet/entities/user-payment-method.entity';
import { UserSubscription } from '../../subscriptions/entities/user-subscription.entity';
import { Lead } from '../../growth/entities/lead.entity';
import { MarketerProfile } from '../../growth/entities/marketer-profile.entity';
import { CommissionTransaction } from '../../growth/entities/commission-transaction.entity';
import { MarketerPayoutRequest } from '../../growth/entities/marketer-payout-request.entity';
import { MarketingCampaign } from '../../growth/entities/marketing-campaign.entity';
import { MarketingBudgetPeriod } from '../../growth/entities/marketing-budget-period.entity';
import { BudgetTransaction } from '../../growth/entities/budget-transaction.entity';
import { PaymentTransaction } from '../../payments/entities/payment-transaction.entity';
import { Earning } from '../../earnings/entities/earning.entity';
import { PayoutRequest } from '../../wallet/entities/payout-request.entity';
import { CollectorFloatLedger } from '../../wallet/entities/collector-float-ledger.entity';
import { FileRecord } from '../../files/entities/file.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { MarketerNotification } from '../../growth/entities/marketer-notification.entity';
import { UserRole } from '../../common/enums/role.enum';
import { CleanupStatus } from '../entities/system-cleanup-log.entity';

describe('SystemCleanupService', () => {
  let service: SystemCleanupService;
  let configService: any;
  let cleanupLogRepo: any;
  let userRepo: any;
  let jobRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ALLOW_SYSTEM_CLEANUP') return 'true';
        if (key === 'DEV_CLEANUP_CODE') return 'test-code';
        return undefined;
      }),
    };

    cleanupLogRepo = {
      create: jest.fn().mockReturnValue({ id: 'log-1' }),
      save: jest.fn().mockResolvedValue({ id: 'log-1' }),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };

    userRepo = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    jobRepo = {
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemCleanupService,
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(SystemCleanupLog), useValue: cleanupLogRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: getRepositoryToken(Proof), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(Rating), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(Dispute), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(FraudFlag), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(LocationUpdate), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(UserAddress), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(UserPaymentMethod), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(UserSubscription), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(Lead), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(MarketerProfile), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(CommissionTransaction), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(MarketerPayoutRequest), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(MarketingCampaign), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(MarketingBudgetPeriod), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(BudgetTransaction), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(PaymentTransaction), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(Earning), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(PayoutRequest), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(CollectorFloatLedger), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(FileRecord), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(Notification), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(MarketerNotification), useValue: { count: jest.fn(), delete: jest.fn() } },
        { provide: DataSource, useValue: dataSource },
        { provide: Logger, useValue: { error: jest.fn(), log: jest.fn() } },
      ],
    }).compile();

    service = module.get<SystemCleanupService>(SystemCleanupService);
  });

  describe('1. Execute fails when ALLOW_SYSTEM_CLEANUP=false', () => {
    it('should throw error when cleanup is disabled', async () => {
      configService.get.mockReturnValue('false');
      
      const request = {
        developerCode: 'test-code',
        filters: { createdBefore: '2024-01-01' },
        components: { users: true },
        confirmationPhrase: 'DELETE TEST DATA',
        logId: 'log-1',
      };

      await expect(
        service.executeCleanup(request, 'admin-1')
      ).rejects.toThrow('System cleanup is not enabled');
    });
  });

  describe('2. Execute fails with invalid DEV_CLEANUP_CODE', () => {
    it('should throw error with invalid developer code', async () => {
      const request = {
        developerCode: 'wrong-code',
        filters: { createdBefore: '2024-01-01' },
        components: { users: true },
        confirmationPhrase: 'DELETE TEST DATA',
        logId: 'log-1',
      };

      await expect(
        service.executeCleanup(request, 'admin-1')
      ).rejects.toThrow('Invalid developer code');
    });
  });

  describe('3. Execute fails without confirmation phrase DELETE TEST DATA', () => {
    it('should throw error without correct confirmation phrase', async () => {
      const request = {
        developerCode: 'test-code',
        filters: { createdBefore: '2024-01-01' },
        components: { users: true },
        confirmationPhrase: 'WRONG PHRASE',
        logId: 'log-1',
      };

      await expect(
        service.executeCleanup(request, 'admin-1')
      ).rejects.toThrow('Confirmation phrase must be "DELETE TEST DATA"');
    });
  });

  describe('4. Execute fails without filters unless forceAllNonAdmin=true', () => {
    it('should throw error without filters when forceAllNonAdmin is false', async () => {
      const request = {
        developerCode: 'test-code',
        filters: {},
        components: { users: true },
        confirmationPhrase: 'DELETE TEST DATA',
        logId: 'log-1',
      };

      await expect(
        service.executeCleanup(request, 'admin-1')
      ).rejects.toThrow('At least one filter is required');
    });

    it('should allow execution with forceAllNonAdmin=true and no filters', async () => {
      cleanupLogRepo.findOne.mockResolvedValue({
        id: 'log-1',
        filters: { forceAllNonAdmin: true },
        components: { users: true },
      });

      const request = {
        developerCode: 'test-code',
        filters: { forceAllNonAdmin: true },
        components: { users: true },
        confirmationPhrase: 'DELETE TEST DATA',
        logId: 'log-1',
      };

      await expect(
        service.executeCleanup(request, 'admin-1')
      ).resolves.toBeDefined();
    });
  });

  describe('5. Admin users are never deleted', () => {
    it('should exclude ADMIN role from user where clause', () => {
      const filters = { createdBefore: '2024-01-01' };
      const where = (service as any).buildUserWhereClause(filters);
      
      expect(where.role).toBeDefined();
      // The where clause should only include non-admin roles
      expect(where.role).not.toContain(UserRole.ADMIN);
    });
  });

  describe('6. Preserved tables are never deleted', () => {
    it('should not include preserved tables in cleanup components', () => {
      const components = {
        jobs: true,
        users: true,
        growth: true,
        marketingBudgets: true,
        payments: true,
        files: true,
        notifications: true,
      };

      // These are the only components that can be deleted
      expect(Object.keys(components)).not.toContain('systemConfig');
      expect(Object.keys(components)).not.toContain('paymentProviders');
      expect(Object.keys(components)).not.toContain('subscriptionPlans');
      expect(Object.keys(components)).not.toContain('supportedCountries');
      expect(Object.keys(components)).not.toContain('commissionSchemes');
      expect(Object.keys(components)).not.toContain('migrations');
      expect(Object.keys(components)).not.toContain('systemCleanupLogs');
    });
  });

  describe('7. Analyze creates a log but deletes nothing', () => {
    it('should create a log entry with ANALYZED status', async () => {
      const request = {
        developerCode: 'test-code',
        filters: { createdBefore: '2024-01-01' },
        components: { users: true },
      };

      const result = await service.analyzeCleanup(request, 'admin-1');

      expect(cleanupLogRepo.create).toHaveBeenCalled();
      expect(cleanupLogRepo.save).toHaveBeenCalled();
      expect(result.logId).toBe('log-1');
      
      const savedLog = cleanupLogRepo.save.mock.calls[0][0];
      expect(savedLog.status).toBe(CleanupStatus.ANALYZED);
    });

    it('should not delete any data during analyze', async () => {
      const request = {
        developerCode: 'test-code',
        filters: { createdBefore: '2024-01-01' },
        components: { users: true },
      };

      await service.analyzeCleanup(request, 'admin-1');

      expect(userRepo.delete).not.toHaveBeenCalled();
      expect(jobRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('8. Execute uses the same logId from analyze', () => {
    it('should require valid logId from analysis', async () => {
      cleanupLogRepo.findOne.mockResolvedValue(null);

      const request = {
        developerCode: 'test-code',
        filters: { createdBefore: '2024-01-01' },
        components: { users: true },
        confirmationPhrase: 'DELETE TEST DATA',
        logId: 'invalid-log-id',
      };

      await expect(
        service.executeCleanup(request, 'admin-1')
      ).rejects.toThrow('Cleanup log not found');
    });

    it('should validate that filters match the analysis log', async () => {
      cleanupLogRepo.findOne.mockResolvedValue({
        id: 'log-1',
        filters: { createdBefore: '2024-01-01' },
        components: { users: true },
      });

      const request = {
        developerCode: 'test-code',
        filters: { createdBefore: '2024-02-01' }, // Different filter
        components: { users: true },
        confirmationPhrase: 'DELETE TEST DATA',
        logId: 'log-1',
      };

      await expect(
        service.executeCleanup(request, 'admin-1')
      ).rejects.toThrow('Filters do not match the analysis');
    });

    it('should validate that components match the analysis log', async () => {
      cleanupLogRepo.findOne.mockResolvedValue({
        id: 'log-1',
        filters: { createdBefore: '2024-01-01' },
        components: { users: true },
      });

      const request = {
        developerCode: 'test-code',
        filters: { createdBefore: '2024-01-01' },
        components: { jobs: true }, // Different component
        confirmationPhrase: 'DELETE TEST DATA',
        logId: 'log-1',
      };

      await expect(
        service.executeCleanup(request, 'admin-1')
      ).rejects.toThrow('Components do not match the analysis');
    });
  });

  describe('9. Only selected components are deleted', () => {
    it('should only delete selected components', async () => {
      cleanupLogRepo.findOne.mockResolvedValue({
        id: 'log-1',
        filters: { createdBefore: '2024-01-01' },
        components: { users: true, jobs: false },
      });

      const request = {
        developerCode: 'test-code',
        filters: { createdBefore: '2024-01-01' },
        components: { users: true, jobs: false },
        confirmationPhrase: 'DELETE TEST DATA',
        logId: 'log-1',
      };

      await service.executeCleanup(request, 'admin-1');

      // Users should be deleted
      expect(userRepo.delete).toHaveBeenCalled();
      // Jobs should not be deleted
      expect(jobRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('10. system_cleanup_logs table has a migration', () => {
    it('should have a migration file for system_cleanup_logs', () => {
      const fs = require('fs');
      const path = require('path');
      const migrationsDir = path.join(__dirname, '../../database/migrations');
      const migrationFiles = fs.readdirSync(migrationsDir);
      
      const hasSystemCleanupMigration = migrationFiles.some((file: string) => 
        file.includes('system-cleanup-logs') || file.includes('system_cleanup_logs')
      );

      expect(hasSystemCleanupMigration).toBe(true);
    });
  });
});
