import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WalletService } from './wallet.service';
import { AdminAuditService } from '../admin/services/admin-audit.service';
import { User } from '../users/entities/user.entity';
import { PayoutRequest } from './entities/payout-request.entity';
import { CollectorFloatLedger } from './entities/collector-float-ledger.entity';
import {
  WalletLedger,
  WalletLedgerDirection,
  WalletLedgerType,
} from './entities/wallet-ledger.entity';
import { UserPaymentMethod } from './entities/user-payment-method.entity';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { PaymentProviderEntity } from '../payments/entities/payment-provider.entity';
import { SystemConfigService } from '../config/system-config.service';
import { PaymentService } from '../payments/payment.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EarningsConfirmedPayload } from '../events/events.types';
import { SentryService } from '../sentry/sentry.service';
import { BusinessLoggerService } from '../common/services/business-logger.service';

describe('WalletService', () => {
  let service: WalletService;
  let userRepo: jest.Mocked<Repository<User>>;
  let walletLedgerRepo: jest.Mocked<Repository<WalletLedger>>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PayoutRequest),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PaymentProviderEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CollectorFloatLedger),
          useValue: {},
        },
        {
          provide: getRepositoryToken(WalletLedger),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserPaymentMethod),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: SystemConfigService,
          useValue: {},
        },
        {
          provide: AdminAuditService,
          useValue: { log: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: PaymentService,
          useValue: {},
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
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

    service = module.get<WalletService>(WalletService);
    userRepo = module.get(getRepositoryToken(User));
    walletLedgerRepo = module.get(getRepositoryToken(WalletLedger));
    dataSource = module.get(DataSource);
  });

  describe('onEarningsConfirmed', () => {
    it('should create wallet ledger entry on earnings confirmed', async () => {
      const mockUser = { id: 'user-1', walletBalance: 1000 };
      const mockLedger = { id: 'ledger-1' };

      userRepo.findOne.mockResolvedValue(mockUser as any);

      const mockWalletLedgerRepo = {
        create: jest.fn().mockReturnValue(mockLedger),
        save: jest.fn().mockResolvedValue(mockLedger),
      };

      const mockEntityManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === User) {
            return {
              findOne: jest.fn().mockResolvedValue(mockUser),
            };
          }
          if (entity === WalletLedger) {
            return mockWalletLedgerRepo;
          }
          return {};
        }),
        createQueryBuilder: jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                execute: jest.fn().mockResolvedValue(undefined),
              }),
            }),
          }),
        }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        await callback(mockEntityManager as any);
      });

      const payload: EarningsConfirmedPayload = {
        collectorId: 'user-1',
        earningsId: 'earning-1',
        jobId: 'job-1',
        amount: 500,
        timestamp: new Date(),
      };

      await service.onEarningsConfirmed(payload);

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(User);
      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(WalletLedger);
      expect(mockWalletLedgerRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        direction: WalletLedgerDirection.CREDIT,
        type: WalletLedgerType.COLLECTOR_EARNING,
        amount: 500,
        balanceBefore: 1000,
        balanceAfter: 1500,
        earningId: 'earning-1',
        reference: 'Earning earning-1',
        metadata: { jobId: 'job-1' },
      });
    });

    it('should handle user not found gracefully', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const mockEntityManager = {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(null),
        }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
        await callback(mockEntityManager as any);
      });

      const payload: EarningsConfirmedPayload = {
        collectorId: 'user-1',
        earningsId: 'earning-1',
        jobId: 'job-1',
        amount: 500,
        timestamp: new Date(),
      };

      await service.onEarningsConfirmed(payload);

      expect(walletLedgerRepo.create).not.toHaveBeenCalled();
    });
  });
});
