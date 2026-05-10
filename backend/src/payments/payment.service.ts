import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { PaymentTransaction, TransactionStatus, TransactionType } from './entities/payment-transaction.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentCallbackDto } from './dto/payment-callback.dto';
import {
  PaymentProvider,
  GatewayInitiateResponse,
  GatewayStatusResponse,
  GatewayProvidersResponse,
} from './types/gateway.types';
import { SystemConfigService } from '../config/system-config.service';
import { FeatureFlagService, FEATURE_FLAGS } from '../config/feature-flags';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private providersCache: Map<string, { providers: PaymentProvider[]; timestamp: number }> = new Map();
  private readonly PROVIDER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepo: Repository<PaymentTransaction>,
    private readonly httpService: HttpService,
    private readonly systemConfigService: SystemConfigService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── GET gateway base URL ────────────────────────────────────────
  private async getGatewayBaseUrl(): Promise<string> {
    return this.systemConfigService.getString('payment.gateway_url', 'http://127.0.0.1:8081');
  }

  private async getCallbackBaseUrl(): Promise<string> {
    return this.systemConfigService.getString('payment.callback_base_url', 'http://localhost:3000');
  }

  private async getCountryCode(): Promise<string> {
    return this.systemConfigService.getString('payment.country_code', 'cmr');
  }

  // ── FETCH providers from gateway ─────────────────────────────────
  async getProviders(countryCode?: string): Promise<PaymentProvider[]> {
    const code = countryCode || (await this.getCountryCode());
    const cacheKey = code;
    const cached = this.providersCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.PROVIDER_CACHE_TTL_MS) {
      return cached.providers;
    }

    const baseUrl = await this.getGatewayBaseUrl();
    const url = `${baseUrl}/payment-api/payment/providers/${code}`;

    try {
      const response: AxiosResponse<GatewayProvidersResponse> = await firstValueFrom(
        this.httpService.get<GatewayProvidersResponse>(url),
      );
      const data = response.data;

      if (!data.success) {
        throw new InternalServerErrorException(`Gateway error: ${data.message}`);
      }

      // Cache only active providers that support MOBILE_WALLET
      const providers = data.data.filter(
        (p: PaymentProvider) => p.bactive && p.supportedMethods.includes('MOBILE_WALLET'),
      );

      this.providersCache.set(cacheKey, { providers, timestamp: Date.now() });
      return providers;
    } catch (error) {
      this.logger.error(`Failed to fetch providers: ${error.message}`);
      // Return cached if available, even if stale
      if (cached) {
        return cached.providers;
      }
      throw new InternalServerErrorException('Failed to fetch payment providers');
    }
  }

  // ── INITIATE payment ─────────────────────────────────────────────
  async initiatePayment(userId: string, dto: InitiatePaymentDto): Promise<PaymentTransaction> {
    // Validate provider exists
    const providers = await this.getProviders();
    const provider = providers.find((p) => p.strPaymentCode === dto.paymentCode);
    if (!provider) {
      throw new BadRequestException(`Invalid payment code: ${dto.paymentCode}`);
    }

    // Validate limits
    const minAmount = dto.type === TransactionType.CASHIN
      ? provider.dbMinDepositAmount
      : provider.dbMinWithdrawalAmount;
    const maxAmount = dto.type === TransactionType.CASHIN
      ? provider.dbMaxDepositAmount
      : provider.dbMaxWithdrawalAmount;

    if (dto.amount < minAmount || dto.amount > maxAmount) {
      throw new BadRequestException(
        `Amount must be between ${minAmount} and ${maxAmount} ${provider.currency}`,
      );
    }

    // Create transaction record
    const internalRef = this.generateInternalRef();
    const transaction = this.transactionRepo.create({
      userId,
      type: dto.type,
      amount: dto.amount,
      currency: provider.currency,
      paymentCode: dto.paymentCode,
      providerName: provider.strProviderName,
      phone: dto.phone,
      internalRef,
      gatewayTransactionId: null,
      status: TransactionStatus.PENDING,
      jobId: dto.jobId || null,
      payoutRequestId: dto.payoutRequestId || null,
    });

    const saved = await this.transactionRepo.save(transaction);

    // Call gateway to initiate
    const baseUrl = await this.getGatewayBaseUrl();
    const callbackUrl = `${await this.getCallbackBaseUrl()}/api/v1/payments/callback`;

    try {
      const response: AxiosResponse<GatewayInitiateResponse> = await firstValueFrom(
        this.httpService.post<GatewayInitiateResponse>(
          `${baseUrl}/payment-api/payment/mobile-wallet`,
          {
            amt: dto.amount,
            ref: internalRef,
            desc: this.buildDescription(dto),
            method: 'MOBILE_WALLET',
            code: dto.paymentCode,
            callbackUrl,
            phn: dto.phone,
          },
          {
            headers: {
              accept: '*/*',
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      const data = response.data;

      if (!data.success) {
        saved.status = TransactionStatus.FAILED;
        saved.failureReason = data.message;
        await this.transactionRepo.save(saved);
        throw new BadRequestException(`Payment initiation failed: ${data.message}`);
      }

      // Store gateway transaction ID
      saved.gatewayTransactionId = data.data.transactionId;
      await this.transactionRepo.save(saved);

      this.logger.log(
        `Payment initiated: ${saved.id} (gateway: ${data.data.transactionId}) for user ${userId}`,
      );

      return saved;
    } catch (error) {
      this.logger.error(`Payment initiation error: ${error.message}`);
      saved.status = TransactionStatus.FAILED;
      saved.failureReason = error.message;
      await this.transactionRepo.save(saved);
      throw new InternalServerErrorException('Failed to initiate payment');
    }
  }

  // ── HANDLE callback from gateway ─────────────────────────────────
  async handleCallback(payload: PaymentCallbackDto): Promise<void> {
    this.logger.log(`Received callback for transaction: ${payload.transactionId}`);

    // Find transaction by gateway transaction ID
    const transaction = await this.transactionRepo.findOne({
      where: { gatewayTransactionId: payload.transactionId },
    });

    if (!transaction) {
      this.logger.warn(`Callback received for unknown transaction: ${payload.transactionId}`);
      return; // Don't throw - we want to return 200 to stop retries
    }

    // Idempotency: only process if still pending
    if (transaction.status !== TransactionStatus.PENDING) {
      this.logger.log(`Transaction ${transaction.id} already processed (status: ${transaction.status})`);
      return;
    }

    transaction.callbackReceivedAt = new Date();

    if (payload.status === TransactionStatus.SUCCESS) {
      transaction.status = TransactionStatus.SUCCESS;
      this.logger.log(`Payment SUCCESS: ${transaction.id}`);

      // Emit event for downstream processing
      this.eventEmitter.emit('payment.success', {
        transactionId: transaction.id,
        userId: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        jobId: transaction.jobId,
        payoutRequestId: transaction.payoutRequestId,
      });
    } else if (payload.status === TransactionStatus.FAILED) {
      transaction.status = TransactionStatus.FAILED;
      transaction.failureReason = 'Gateway reported failure';
      this.logger.log(`Payment FAILED: ${transaction.id}`);

      this.eventEmitter.emit('payment.failed', {
        transactionId: transaction.id,
        userId: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        jobId: transaction.jobId,
        payoutRequestId: transaction.payoutRequestId,
        reason: transaction.failureReason,
      });
    } else {
      // PENDING - no change needed
      this.logger.log(`Callback status PENDING for transaction: ${transaction.id}`);
      await this.transactionRepo.save(transaction);
      return;
    }

    await this.transactionRepo.save(transaction);
  }

  // ── CHECK transaction status ─────────────────────────────────────
  async checkTransactionStatus(transactionId: string): Promise<PaymentTransaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // If already terminal state, return as-is
    if (transaction.status !== TransactionStatus.PENDING) {
      return transaction;
    }

    // Poll gateway for status
    if (transaction.gatewayTransactionId) {
      const baseUrl = await this.getGatewayBaseUrl();
      try {
        const response: AxiosResponse<GatewayStatusResponse> = await firstValueFrom(
          this.httpService.get<GatewayStatusResponse>(
            `${baseUrl}/payment-api/payment/status`,
            {
              params: { transactionId: transaction.gatewayTransactionId },
            },
          ),
        );
        const data = response.data;

        if (data.success && data.data !== transaction.status) {
          // Process status change same as callback
          await this.handleCallback({
            transactionId: transaction.gatewayTransactionId,
            status: data.data as TransactionStatus,
            data: null,
          });
          // Reload to get updated status
          return await this.transactionRepo.findOne({ where: { id: transactionId } }) as PaymentTransaction;
        }
      } catch (error) {
        this.logger.error(`Failed to poll status: ${error.message}`);
      }
    }

    return transaction;
  }

  // ── POLL pending transactions (cron job) ───────────────────────────
  async pollPendingTransactions(): Promise<void> {
    const timeoutMinutes = await this.systemConfigService.getNumber('payment.pending_timeout_minutes', 15);
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const pending = await this.transactionRepo.find({
      where: {
        status: TransactionStatus.PENDING,
        createdAt: LessThan(cutoff),
      },
    });

    this.logger.log(`Polling ${pending.length} stale pending transactions`);

    for (const tx of pending) {
      try {
        await this.checkTransactionStatus(tx.id);
      } catch (error) {
        this.logger.error(`Failed to poll transaction ${tx.id}: ${error.message}`);
      }
    }
  }

  // ── TIMEOUT stale pending transactions ────────────────────────────
  async timeoutStalePendingTransactions(): Promise<void> {
    const timeoutMinutes = await this.systemConfigService.getNumber('payment.pending_timeout_minutes', 15);
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const stale = await this.transactionRepo.find({
      where: {
        status: TransactionStatus.PENDING,
        createdAt: LessThan(cutoff),
      },
    });

    for (const tx of stale) {
      tx.status = TransactionStatus.FAILED;
      tx.failureReason = 'Transaction timed out';
      await this.transactionRepo.save(tx);

      this.logger.log(`Transaction ${tx.id} auto-failed due to timeout`);

      this.eventEmitter.emit('payment.failed', {
        transactionId: tx.id,
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        jobId: tx.jobId,
        payoutRequestId: tx.payoutRequestId,
        reason: 'Timeout',
      });
    }
  }

  // ── GET transaction by ID ───────────────────────────────────────
  async getTransaction(id: string): Promise<PaymentTransaction> {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  // ── GET user transactions ────────────────────────────────────────
  async getUserTransactions(userId: string, limit: number = 20): Promise<PaymentTransaction[]> {
    return this.transactionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────
  private generateInternalRef(): string {
    return `WST-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  private buildDescription(dto: InitiatePaymentDto): string {
    if (dto.jobId) {
      return `Waste pickup payment - Job ${dto.jobId}`;
    }
    if (dto.payoutRequestId) {
      return `Collector payout - Request ${dto.payoutRequestId}`;
    }
    if (dto.type === TransactionType.CASHIN) {
      return 'Wallet top-up';
    }
    return 'Payment transaction';
  }

  // ── Feature flag check ──────────────────────────────────────────
  async isPaymentIntegrationEnabled(): Promise<boolean> {
    return this.featureFlagService.isEnabled(FEATURE_FLAGS.PAYMENT_INTEGRATION, false);
  }
}
