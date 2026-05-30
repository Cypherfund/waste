import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationSummary } from '../entities/reconciliation-summary.entity';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let dataSource: any;
  let reconciliationSummaryRepo: any;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
      getRepository: jest.fn(),
    };

    reconciliationSummaryRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    dataSource.getRepository.mockReturnValue(reconciliationSummaryRepo);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReconciliationService, { provide: DataSource, useValue: dataSource }],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  describe('saveDailySummary', () => {
    it('should create new summary when none exists for date', async () => {
      const date = '2024-01-15';
      const mockMetrics = {
        moneyIn: {
          integratedProviderPayments: 1000,
          manualProviderPayments: 500,
          walletTopups: 2000,
          cashCollected: 3000,
        },
        moneyOut: {
          collectorEarnings: 1500,
          marketerCommissions: 200,
          approvedPayouts: 1000,
          walletBalanceLiabilities: 5000,
        },
        internalMovements: {
          walletDebits: 0,
          collectorFloatDeductions: 2000,
          platformShareCashJobs: 500,
          platformShareCashFirstPickup: 300,
        },
        pendingRisk: {
          manualPaymentsPending: 2,
          manualPaymentsPendingAmount: 1000,
          failedProviderPayments: 1,
          failedProviderPaymentsAmount: 500,
          unreconciledItems: 3,
        },
      };

      reconciliationSummaryRepo.findOne.mockResolvedValue(null);
      reconciliationSummaryRepo.create.mockReturnValue({ id: 'new-summary' });
      reconciliationSummaryRepo.save.mockResolvedValue({ id: 'new-summary' });

      dataSource.query.mockImplementation((query: string) => {
        if (query.includes('SELECT COALESCE(SUM')) {
          return Promise.resolve([{ total: '0' }]);
        }
        if (query.includes('SELECT COUNT(*)')) {
          return Promise.resolve([{ count: '0' }]);
        }
        return Promise.resolve([]);
      });

      await service.saveDailySummary(date);

      expect(reconciliationSummaryRepo.findOne).toHaveBeenCalledWith({
        where: { summaryDate: date },
      });
      expect(reconciliationSummaryRepo.create).toHaveBeenCalled();
      expect(reconciliationSummaryRepo.save).toHaveBeenCalled();
    });

    it('should update existing summary when one exists for date', async () => {
      const date = '2024-01-15';
      const existingSummary = {
        id: 'existing-summary',
        summaryDate: date,
        integratedProviderPayments: 500,
      };

      reconciliationSummaryRepo.findOne.mockResolvedValue(existingSummary);
      reconciliationSummaryRepo.save.mockResolvedValue(existingSummary);

      dataSource.query.mockImplementation((query: string) => {
        if (query.includes('SELECT COALESCE(SUM')) {
          return Promise.resolve([{ total: '0' }]);
        }
        if (query.includes('SELECT COUNT(*)')) {
          return Promise.resolve([{ count: '0' }]);
        }
        return Promise.resolve([]);
      });

      await service.saveDailySummary(date);

      expect(reconciliationSummaryRepo.findOne).toHaveBeenCalledWith({
        where: { summaryDate: date },
      });
      expect(reconciliationSummaryRepo.create).not.toHaveBeenCalled();
      expect(reconciliationSummaryRepo.save).toHaveBeenCalledWith(existingSummary);
    });
  });

  describe('platform share calculations', () => {
    it('should use CASH_SETTLEMENT_DEDUCTION for platformShareCashJobs', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      dataSource.query.mockResolvedValue([{ total: '500' }]);

      await (service as any).getPlatformShareCashJobs(fromDate, toDate);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('CASH_SETTLEMENT_DEDUCTION'),
        expect.any(Array),
      );
    });

    it('should use CASH_SUBSCRIPTION_PLATFORM_SHARE for platformShareCashFirstPickup', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      dataSource.query.mockResolvedValue([{ total: '300' }]);

      await (service as any).getPlatformShareCashFirstPickup(fromDate, toDate);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('CASH_SUBSCRIPTION_PLATFORM_SHARE'),
        expect.any(Array),
      );
    });
  });

  describe('unreconciled items', () => {
    it('should return cash jobs without float deduction', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      const mockCashJobs = [
        {
          id: 'job-1',
          cash_to_collect_amount: '1000',
          completed_at: new Date('2024-01-15'),
        },
      ];

      dataSource.query.mockImplementation((query: string) => {
        if (query.includes('jobs') && query.includes('cash_to_collect_amount')) {
          return Promise.resolve(mockCashJobs);
        }
        return Promise.resolve([]);
      });

      const unreconciled = await service.getUnreconciledItems(fromDate, toDate);

      expect(unreconciled).toHaveLength(1);
      expect(unreconciled[0].type).toBe('CASH_JOB_NO_FLOAT_DEDUCTION');
      expect(unreconciled[0].entityId).toBe('job-1');
      expect(unreconciled[0].amount).toBe(1000);
    });

    it('should return payments verified without wallet ledger entry', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      const mockPaymentsNoLedger = [
        {
          id: 'payment-1',
          user_id: 'user-1',
          amount: '1000',
          created_at: new Date('2024-01-15'),
        },
      ];

      dataSource.query.mockImplementation((query: string) => {
        if (query.includes('payment_transactions') && query.includes('wallet_ledger')) {
          return Promise.resolve(mockPaymentsNoLedger);
        }
        return Promise.resolve([]);
      });

      const unreconciled = await service.getUnreconciledItems(fromDate, toDate);

      expect(unreconciled).toHaveLength(1);
      expect(unreconciled[0].type).toBe('PAYMENT_VERIFIED_NO_LEDGER');
      expect(unreconciled[0].entityId).toBe('payment-1');
      expect(unreconciled[0].amount).toBe(1000);
    });

    it('should return possible duplicate wallet credits', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      const mockDuplicateCredits = [
        {
          payment_transaction_id: 'txn-1',
          user_id: 'user-1',
          amount: '1000',
          created_at: new Date('2024-01-15'),
          count: '2',
        },
      ];

      dataSource.query.mockImplementation((query: string) => {
        if (query.includes('wallet_ledger') && query.includes('GROUP BY')) {
          return Promise.resolve(mockDuplicateCredits);
        }
        return Promise.resolve([]);
      });

      const unreconciled = await service.getUnreconciledItems(fromDate, toDate);

      expect(unreconciled).toHaveLength(1);
      expect(unreconciled[0].type).toBe('POSSIBLE_DUPLICATE_WALLET_CREDITS');
      expect(unreconciled[0].entityId).toBe('txn-1');
      expect(unreconciled[0].amount).toBe(1000);
    });

    it('should not use MIN() on UUID columns in duplicate credits query', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      dataSource.query.mockResolvedValue([]);

      await service.getUnreconciledItems(fromDate, toDate);

      // Find the duplicate credits query call
      const duplicateCreditsQuery = dataSource.query.mock.calls.find((call: any) => 
        call[0].includes('wallet_ledger') && 
        call[0].includes('GROUP BY') &&
        call[0].includes('payment_transaction_id')
      );

      expect(duplicateCreditsQuery).toBeDefined();
      const query = duplicateCreditsQuery[0];

      // Ensure MIN() is not used on user_id (UUID column)
      expect(query).not.toMatch(/MIN\s*\(\s*wl\.user_id\s*\)/i);
      
      // Ensure user_id is in GROUP BY clause
      expect(query).toMatch(/GROUP BY.*wl\.user_id/i);
    });

    it('should return empty array when no unreconciled items', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      dataSource.query.mockResolvedValue([]);

      const unreconciled = await service.getUnreconciledItems(fromDate, toDate);

      expect(unreconciled).toHaveLength(0);
    });
  });

  describe('walletDebits', () => {
    it('should query wallet_ledger table for debit transactions', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      dataSource.query.mockResolvedValue([{ total: '1500' }]);

      const result = await (service as any).getWalletDebits(fromDate, toDate);

      expect(result).toBe(1500);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('wallet_ledger'),
        expect.arrayContaining([fromDate, toDate]),
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("direction = 'DEBIT'"),
        expect.any(Array),
      );
    });

    it('should return 0 when no debit transactions exist', async () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-01-31');

      dataSource.query.mockResolvedValue([{ total: '0' }]);

      const result = await (service as any).getWalletDebits(fromDate, toDate);

      expect(result).toBe(0);
    });
  });

  describe('exportToCsv', () => {
    it('should generate CSV with headers and data', async () => {
      const fromDate = '2024-01-01';
      const toDate = '2024-01-31';

      const mockSummaries = [
        {
          summaryDate: '2024-01-15',
          integratedProviderPayments: 1000,
          manualProviderPayments: 500,
          walletTopups: 2000,
          cashCollected: 3000,
          collectorEarnings: 1500,
          marketerCommissions: 200,
          approvedPayouts: 1000,
          walletBalanceLiabilities: 5000,
          walletDebits: 0,
          collectorFloatDeductions: 2000,
          platformShareCashJobs: 500,
          platformShareCashFirstPickup: 300,
          manualPaymentsPending: 2,
          manualPaymentsPendingAmount: 1000,
          failedProviderPayments: 1,
          failedProviderPaymentsAmount: 500,
          unreconciledItems: 3,
        },
      ];

      reconciliationSummaryRepo.find.mockResolvedValue(mockSummaries);

      const csvBuffer = await service.exportToCsv(fromDate, toDate);

      expect(csvBuffer).toBeInstanceOf(Buffer);
      const csvString = csvBuffer.toString('utf-8');
      expect(csvString).toContain('Date');
      expect(csvString).toContain('Integrated Provider Payments');
      expect(csvString).toContain('2024-01-15');
    });
  });
});
