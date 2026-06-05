import { Test, TestingModule } from '@nestjs/testing';
import { PaymentEventsService } from './payment-events.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from '../jobs/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import {
  PaymentTransaction,
  TransactionStatus,
  TransactionType,
} from './entities/payment-transaction.entity';
import { WalletLedger } from '../wallet/entities/wallet-ledger.entity';
import { SentryService } from '../sentry/sentry.service';
import { BusinessLoggerService } from '../common/services/business-logger.service';

describe('PaymentEventsService', () => {
  let service: PaymentEventsService;
  let jobRepo: jest.Mocked<Repository<Job>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let dataSource: jest.Mocked<DataSource>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEntityManager = {
    getRepository: jest.fn(),
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  };

  const mockTransaction = {
    id: 'txn-1',
    userId: 'user-1',
    type: TransactionType.WALLET_TOPUP,
    amount: 5000,
    status: TransactionStatus.PENDING,
  };

  const mockUser = {
    id: 'user-1',
    walletBalance: 10000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentEventsService,
        {
          provide: getRepositoryToken(Job),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WalletLedger),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserSubscription),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            emitAsync: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
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
      ],
    }).compile();

    service = module.get<PaymentEventsService>(PaymentEventsService);
    jobRepo = module.get(getRepositoryToken(Job));
    userRepo = module.get(getRepositoryToken(User));
    dataSource = module.get(DataSource);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('integrated wallet top-up callback idempotency', () => {
    const mockLockedQuery = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    const mockUpdateQuery = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      (dataSource.transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback(mockEntityManager as any);
      });
      mockEntityManager.getRepository.mockImplementation((entity: any) => {
        if (entity === PaymentTransaction) {
          return { createQueryBuilder: jest.fn(() => mockLockedQuery) } as any;
        }
        if (entity === User) {
          return { createQueryBuilder: jest.fn(() => mockLockedQuery) } as any;
        }
        if (entity === WalletLedger) {
          return { create: jest.fn(), save: jest.fn(), findOne: jest.fn().mockResolvedValue(null) } as any;
        }
        return {} as any;
      });
      mockEntityManager.createQueryBuilder.mockReturnValue(mockUpdateQuery);
    });

    it('credits wallet on first successful callback', async () => {
      mockLockedQuery.getOne
        .mockResolvedValueOnce(mockTransaction) // Transaction lookup
        .mockResolvedValueOnce(mockUser); // User lookup

      await service.onPaymentSuccess({
        transactionId: 'txn-1',
        userId: 'user-1',
        type: TransactionType.WALLET_TOPUP,
        amount: 5000,
      });

      expect(dataSource.transaction).toHaveBeenCalled();
      expect(mockUpdateQuery.set).toHaveBeenCalledWith(
        expect.objectContaining({
          walletBalance: expect.any(Function),
        }),
      );
      expect(mockUpdateQuery.where).toHaveBeenCalledWith('id = :id', { id: 'user-1' });
      expect(mockUpdateQuery.execute).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.VERIFIED }),
      );
    });

    it('is idempotent - second callback does not credit wallet again', async () => {
      // Mock wallet ledger to return no existing entry on first call
      const mockWalletLedgerRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockResolvedValue({}),
      };

      // First call - transaction is PENDING, no existing ledger
      mockLockedQuery.getOne.mockResolvedValueOnce(mockTransaction).mockResolvedValueOnce(mockUser);
      mockEntityManager.getRepository.mockImplementation((entity: any) => {
        if (entity === PaymentTransaction) {
          return { createQueryBuilder: jest.fn(() => mockLockedQuery) } as any;
        }
        if (entity === User) {
          return { createQueryBuilder: jest.fn(() => mockLockedQuery) } as any;
        }
        if (entity === WalletLedger) {
          return mockWalletLedgerRepo;
        }
        return {} as any;
      });

      await service.onPaymentSuccess({
        transactionId: 'txn-1',
        userId: 'user-1',
        type: TransactionType.WALLET_TOPUP,
        amount: 5000,
      });

      const executeCallCount = mockUpdateQuery.execute.mock.calls.length;

      // Second call - simulate ledger already exists (idempotency check)
      mockLockedQuery.getOne.mockReset();
      mockLockedQuery.getOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.VERIFIED,
      });
      mockWalletLedgerRepo.findOne.mockResolvedValueOnce({ id: 'ledger-1' }); // Existing ledger

      await service.onPaymentSuccess({
        transactionId: 'txn-1',
        userId: 'user-1',
        type: TransactionType.WALLET_TOPUP,
        amount: 5000,
      });

      // Execute should not be called again (idempotency via ledger check)
      expect(mockUpdateQuery.execute.mock.calls.length).toBe(executeCallCount);
    });

    it('locks PaymentTransaction with pessimistic_write', async () => {
      mockLockedQuery.getOne.mockResolvedValue(mockTransaction).mockResolvedValue(mockUser);

      await service.onPaymentSuccess({
        transactionId: 'txn-1',
        userId: 'user-1',
        type: TransactionType.WALLET_TOPUP,
        amount: 5000,
      });

      expect(mockLockedQuery.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('locks User with pessimistic_write', async () => {
      mockLockedQuery.getOne.mockResolvedValue(mockTransaction).mockResolvedValue(mockUser);

      await service.onPaymentSuccess({
        transactionId: 'txn-1',
        userId: 'user-1',
        type: TransactionType.WALLET_TOPUP,
        amount: 5000,
      });

      expect(mockLockedQuery.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('returns early if transaction not found', async () => {
      mockLockedQuery.getOne.mockResolvedValue(null);

      await service.onPaymentSuccess({
        transactionId: 'txn-1',
        userId: 'user-1',
        type: TransactionType.WALLET_TOPUP,
        amount: 5000,
      });

      expect(mockUpdateQuery.execute).not.toHaveBeenCalled();
      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });

    it('returns early if user not found', async () => {
      mockLockedQuery.getOne.mockResolvedValue(mockTransaction).mockResolvedValue(null);

      await service.onPaymentSuccess({
        transactionId: 'txn-1',
        userId: 'user-1',
        type: TransactionType.WALLET_TOPUP,
        amount: 5000,
      });

      expect(mockUpdateQuery.execute).not.toHaveBeenCalled();
      expect(mockEntityManager.save).not.toHaveBeenCalled();
    });
  });
});
