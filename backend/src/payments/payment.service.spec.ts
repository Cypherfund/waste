import { of } from 'rxjs';
import { PaymentService } from './payment.service';
import {
  PaymentSource,
  PaymentTransaction,
  ProcessingStatus,
  TransactionStatus,
  TransactionType,
} from './entities/payment-transaction.entity';

describe('PaymentService', () => {
  let service: PaymentService;
  let transactionRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let httpService: {
    get: jest.Mock;
  };
  let systemConfigService: {
    getString: jest.Mock;
  };
  let eventEmitter: {
    emitAsync: jest.Mock;
  };

  const pendingTransaction = {
    id: 'tx-1',
    userId: 'user-1',
    type: TransactionType.CASHIN,
    paymentSource: PaymentSource.WALLET_TOPUP,
    amount: 1000,
    currency: 'XAF',
    paymentCode: 'MTN_CMR',
    providerName: 'MTN Mobile Money',
    phone: '237600000000',
    internalRef: 'WST-ORIGINAL-REF',
    gatewayTransactionId: 'gateway-trans-id-123',
    status: TransactionStatus.PENDING,
    processingStatus: ProcessingStatus.PENDING,
    processingAttempts: 0,
    jobId: null,
    payoutRequestId: null,
  } as PaymentTransaction;

  beforeEach(() => {
    transactionRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (transaction) => transaction),
    };
    httpService = {
      get: jest.fn(),
    };
    systemConfigService = {
      getString: jest.fn().mockResolvedValue('https://gateway.example'),
    };
    eventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    };

    service = new PaymentService(
      transactionRepo as any,
      {} as any,
      httpService as any,
      systemConfigService as any,
      {} as any,
      eventEmitter as any,
      {
        addBreadcrumb: jest.fn(),
        captureException: jest.fn(),
        setContext: jest.fn(),
      } as any,
      {
        logFailure: jest.fn(),
        logWarning: jest.fn(),
      } as any,
      {} as any,
    );
  });

  describe('checkTransactionStatus', () => {
    it('polls gateway status with the original transaction ref instead of the gateway transaction id', async () => {
      transactionRepo.findOne.mockResolvedValue(pendingTransaction);
      httpService.get.mockReturnValue(
        of({
          data: {
            success: true,
            message: 'OK',
            data: TransactionStatus.PENDING,
          },
        }),
      );

      await service.checkTransactionStatus('tx-1');

      expect(httpService.get).toHaveBeenCalledWith(
        'https://gateway.example/payment-api/payment/status',
        {
          params: { transactionId: pendingTransaction.internalRef },
        },
      );
      expect(httpService.get.mock.calls[0][1].params.transactionId).not.toBe(
        pendingTransaction.gatewayTransactionId,
      );
    });

    it('processes polled status changes using the original transaction ref', async () => {
      transactionRepo.findOne.mockResolvedValue(pendingTransaction);
      httpService.get.mockReturnValue(
        of({
          data: {
            success: true,
            message: 'OK',
            data: TransactionStatus.SUCCESS,
          },
        }),
      );
      jest.spyOn(service, 'handleCallback').mockResolvedValue(undefined);

      await service.checkTransactionStatus('tx-1');

      expect(service.handleCallback).toHaveBeenCalledWith({
        transactionId: pendingTransaction.internalRef,
        status: TransactionStatus.SUCCESS,
        data: null,
      });
    });
  });

  describe('handleCallback', () => {
    it('looks up provider callbacks by the original transaction ref first', async () => {
      transactionRepo.findOne.mockResolvedValueOnce({ ...pendingTransaction });

      await service.handleCallback({
        transactionId: pendingTransaction.internalRef,
        status: TransactionStatus.SUCCESS,
      });

      expect(transactionRepo.findOne).toHaveBeenCalledWith({
        where: { internalRef: pendingTransaction.internalRef },
      });
      expect(transactionRepo.findOne).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        'payment.success',
        expect.objectContaining({ transactionId: pendingTransaction.id }),
      );
    });

    it('falls back to the gateway transaction id for legacy callbacks', async () => {
      transactionRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...pendingTransaction });

      await service.handleCallback({
        transactionId: pendingTransaction.gatewayTransactionId as string,
        status: TransactionStatus.SUCCESS,
      });

      expect(transactionRepo.findOne).toHaveBeenNthCalledWith(1, {
        where: { internalRef: pendingTransaction.gatewayTransactionId },
      });
      expect(transactionRepo.findOne).toHaveBeenNthCalledWith(2, {
        where: { gatewayTransactionId: pendingTransaction.gatewayTransactionId },
      });
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        'payment.success',
        expect.objectContaining({ transactionId: pendingTransaction.id }),
      );
    });
  });
});
