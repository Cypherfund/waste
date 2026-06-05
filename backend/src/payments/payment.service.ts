import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  PaymentTransaction,
  TransactionStatus,
  TransactionType,
  PaymentSource,
  ProcessingStatus,
} from './entities/payment-transaction.entity';
import { PaymentProviderEntity } from './entities/payment-provider.entity';
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
import { AdminAuditService, AdminAuditAction, AdminAuditEntityType, AuditRequestContext } from '../admin/services/admin-audit.service';
import { SentryService } from '../sentry/sentry.service';
import { BusinessLoggerService, BusinessEventType } from '../common/services/business-logger.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(PaymentProviderEntity)
    private readonly providerRepo: Repository<PaymentProviderEntity>,
    private readonly httpService: HttpService,
    private readonly systemConfigService: SystemConfigService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sentryService: SentryService,
    private readonly businessLogger: BusinessLoggerService,
    @Optional()
    private readonly adminAuditService?: AdminAuditService,
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

  // ── GET providers from local DB (admin-synced) ────────────────────
  async getProviders(countryCode?: string): Promise<PaymentProviderEntity[]> {
    const code = countryCode || (await this.getCountryCode());
    return this.providerRepo
      .createQueryBuilder('p')
      .where('p.is_enabled = true')
      .andWhere('(p.country_code = :code OR p.is_global = true)', { code })
      .orderBy('p.provider_name', 'ASC')
      .getMany();
  }

  // ── SYNC providers from gateway into local DB ─────────────────────
  async syncProviders(countryCode: string): Promise<{ synced: number; updated: number }> {
    const baseUrl = await this.getGatewayBaseUrl();
    const url = `${baseUrl}/payment-api/payment/providers/${countryCode}`;

    const response: AxiosResponse<GatewayProvidersResponse> = await firstValueFrom(
      this.httpService.get<GatewayProvidersResponse>(url),
    );
    const data = response.data;

    if (!data.success) {
      throw new InternalServerErrorException(`Gateway error: ${data.message}`);
    }

    const gatewayProviders = data.data.filter(
      (p: PaymentProvider) => p.bactive && p.supportedMethods.includes('MOBILE_WALLET'),
    );

    let synced = 0;
    let updated = 0;

    for (const gp of gatewayProviders) {
      const existing = await this.providerRepo.findOne({
        where: { paymentCode: gp.strPaymentCode, countryCode },
      });

      if (existing) {
        existing.providerName = gp.strProviderName;
        existing.currency = gp.currency;
        existing.minDeposit = gp.dbMinDepositAmount;
        existing.maxDeposit = gp.dbMaxDepositAmount;
        existing.minWithdrawal = gp.dbMinWithdrawalAmount;
        existing.maxWithdrawal = gp.dbMaxWithdrawalAmount;
        existing.supportsCashin = gp.bcashin;
        existing.supportsCashout = gp.bcashout;
        existing.imageUrl = gp.strImageUrl ?? null;
        existing.syncedAt = new Date();
        await this.providerRepo.save(existing);
        updated++;
      } else {
        const provider = this.providerRepo.create({
          paymentCode: gp.strPaymentCode,
          countryCode,
          providerName: gp.strProviderName,
          currency: gp.currency,
          minDeposit: gp.dbMinDepositAmount,
          maxDeposit: gp.dbMaxDepositAmount,
          minWithdrawal: gp.dbMinWithdrawalAmount,
          maxWithdrawal: gp.dbMaxWithdrawalAmount,
          supportsCashin: gp.bcashin,
          supportsCashout: gp.bcashout,
          imageUrl: gp.strImageUrl ?? null,
          isEnabled: true,
          isGlobal: false,
          syncedAt: new Date(),
        });
        await this.providerRepo.save(provider);
        synced++;
      }
    }

    this.logger.log(`Provider sync [${countryCode}]: ${synced} new, ${updated} updated`);
    return { synced, updated };
  }

  // ── TOGGLE provider enabled/disabled ─────────────────────────────
  async toggleProvider(id: number, isEnabled: boolean): Promise<PaymentProviderEntity> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Payment provider ${id} not found`);
    }
    provider.isEnabled = isEnabled;
    return this.providerRepo.save(provider);
  }

  // ── LIST all providers (admin, includes disabled) ─────────────────
  async listAllProviders(countryCode?: string): Promise<PaymentProviderEntity[]> {
    const qb = this.providerRepo
      .createQueryBuilder('p')
      .orderBy('p.country_code', 'ASC')
      .addOrderBy('p.provider_name', 'ASC');

    if (countryCode) {
      qb.where('p.country_code = :countryCode', { countryCode });
    }
    return qb.getMany();
  }

  // ── CREATE provider (admin) ─────────────────────────────────────
  async createProvider(data: Partial<PaymentProviderEntity>, adminId: string, context?: AuditRequestContext): Promise<PaymentProviderEntity> {
    const provider = this.providerRepo.create(data);
    const saved = await this.providerRepo.save(provider);

    // Log audit
    if (this.adminAuditService) {
      await this.adminAuditService.log({
        adminId,
        action: AdminAuditAction.PAYMENT_PROVIDER_CREATED,
        entityType: AdminAuditEntityType.PAYMENT_PROVIDER,
        entityId: String(saved.id),
        oldValue: null,
        newValue: { paymentCode: saved.paymentCode, providerName: saved.providerName, countryCode: saved.countryCode },
        metadata: { paymentCode: saved.paymentCode },
        context,
      });
    }

    return saved;
  }

  // ── UPDATE provider (admin) ─────────────────────────────────────
  async updateProvider(
    id: number,
    data: Partial<PaymentProviderEntity>,
    adminId: string,
    context?: AuditRequestContext,
  ): Promise<PaymentProviderEntity> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Payment provider ${id} not found`);
    }

    const oldValue = { paymentCode: provider.paymentCode, providerName: provider.providerName, countryCode: provider.countryCode };
    Object.assign(provider, data);
    const saved = await this.providerRepo.save(provider);

    // Log audit
    if (this.adminAuditService) {
      await this.adminAuditService.log({
        adminId,
        action: AdminAuditAction.PAYMENT_PROVIDER_UPDATED,
        entityType: AdminAuditEntityType.PAYMENT_PROVIDER,
        entityId: String(id),
        oldValue,
        newValue: { paymentCode: saved.paymentCode, providerName: saved.providerName, countryCode: saved.countryCode },
        metadata: { paymentCode: saved.paymentCode },
        context,
      });
    }

    return saved;
  }

  // ── DELETE provider (admin) ─────────────────────────────────────
  async deleteProvider(id: number, adminId: string, context?: AuditRequestContext): Promise<void> {
    const provider = await this.providerRepo.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`Payment provider ${id} not found`);
    }

    const oldValue = { paymentCode: provider.paymentCode, providerName: provider.providerName, countryCode: provider.countryCode };
    await this.providerRepo.remove(provider);

    // Log audit
    if (this.adminAuditService) {
      await this.adminAuditService.log({
        adminId,
        action: AdminAuditAction.PAYMENT_PROVIDER_DELETED,
        entityType: AdminAuditEntityType.PAYMENT_PROVIDER,
        entityId: String(id),
        oldValue,
        newValue: null,
        metadata: { paymentCode: provider.paymentCode },
        context,
      });
    }
  }

  // ── INITIATE payment ─────────────────────────────────────────────
  async initiatePayment(userId: string, dto: InitiatePaymentDto): Promise<PaymentTransaction> {
    // Validate provider exists (no country filter — code is globally unique enough)
    const provider = await this.getProviderByCode(dto.paymentCode);
    if (!provider) {
      throw new BadRequestException(`Invalid payment code: ${dto.paymentCode}`);
    }

    // Validate limits
    const minAmount =
      dto.type === TransactionType.CASHIN ? provider.minDeposit : provider.minWithdrawal;
    const maxAmount =
      dto.type === TransactionType.CASHIN ? provider.maxDeposit : provider.maxWithdrawal;

    if (
      (minAmount !== null && dto.amount < minAmount) ||
      (maxAmount !== null && dto.amount > maxAmount)
    ) {
      throw new BadRequestException(
        `Amount must be between ${minAmount ?? 0} and ${maxAmount ?? '∞'} ${provider.currency}`,
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
      providerName: provider.providerName,
      phone: dto.phone,
      internalRef,
      gatewayTransactionId: null,
      status: TransactionStatus.PENDING,
      paymentSource: dto.paymentSource || PaymentSource.JOB_PAYMENT,
      jobId: dto.jobId || null,
      payoutRequestId: dto.payoutRequestId || null,
    });

    const saved = await this.transactionRepo.save(transaction);

    // Call gateway to initiate
    const baseUrl = await this.getGatewayBaseUrl();
    const callbackUrl = `${await this.getCallbackBaseUrl()}/api/v1/payments/callback`;

    try {
      this.sentryService.setContext('payment', {
        transactionId: saved.id,
        internalRef,
        userId,
        amount: dto.amount,
        paymentCode: dto.paymentCode,
        type: dto.type,
      });

      this.sentryService.addBreadcrumb({
        category: 'payment',
        message: 'Initiating payment with gateway',
        level: 'info',
        data: {
          transactionId: saved.id,
          paymentCode: dto.paymentCode,
          amount: dto.amount,
        },
      });

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

        this.businessLogger.logFailure(BusinessEventType.PAYMENT_INITIATION_FAILED, {
          userId,
          transactionId: saved.id,
          amount: dto.amount,
          provider: dto.paymentCode,
          errorMessage: data.message,
        });

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

      this.businessLogger.logFailure(BusinessEventType.PAYMENT_INITIATION_FAILED, {
        userId,
        transactionId: saved.id,
        amount: dto.amount,
        provider: dto.paymentCode,
        errorMessage: error.message,
      });

      this.sentryService.captureException(error, {
        transactionId: saved.id,
        internalRef,
        userId,
        amount: dto.amount,
        paymentCode: dto.paymentCode,
      });

      throw new InternalServerErrorException('Failed to initiate payment');
    }
  }

  // ── HANDLE callback from gateway ─────────────────────────────────
  async handleCallback(payload: PaymentCallbackDto): Promise<void> {
    this.logger.log(`Received callback for transaction: ${payload.transactionId}`);

    this.sentryService.addBreadcrumb({
      category: 'payment',
      message: 'Received payment callback',
      level: 'info',
      data: {
        gatewayTransactionId: payload.transactionId,
        status: payload.status,
      },
    });

    // Find transaction by gateway transaction ID
    const transaction = await this.transactionRepo.findOne({
      where: { gatewayTransactionId: payload.transactionId },
    });

    if (!transaction) {
      this.logger.warn(`Callback received for unknown transaction: ${payload.transactionId}`);
      this.businessLogger.logWarning(BusinessEventType.PAYMENT_CALLBACK_FAILED, {
        gatewayTransactionId: payload.transactionId,
        errorMessage: 'Unknown transaction',
      });
      return; // Don't throw - we want to return 200 to stop retries
    }

    // Idempotency: skip if already processed and downstream complete
    // Allow retry if status is SUCCESS but processing is not COMPLETED
    const needsProcessing =
      transaction.status === TransactionStatus.PENDING ||
      (transaction.status === TransactionStatus.SUCCESS &&
        transaction.processingStatus !== ProcessingStatus.COMPLETED);

    if (!needsProcessing) {
      this.logger.log(
        `Transaction ${transaction.id} already fully processed (status: ${transaction.status}, processing: ${transaction.processingStatus})`,
      );
      return;
    }

    this.sentryService.setContext('payment_callback', {
      transactionId: transaction.id,
      gatewayTransactionId: payload.transactionId,
      userId: transaction.userId,
      amount: transaction.amount,
      status: payload.status,
    });

    transaction.callbackReceivedAt = new Date();

    if (payload.status === TransactionStatus.SUCCESS) {
      // If retrying a SUCCESS transaction with incomplete processing, skip status update
      const isRetry = transaction.status === TransactionStatus.SUCCESS;

      if (!isRetry) {
        transaction.status = TransactionStatus.SUCCESS;
        transaction.processingStatus = ProcessingStatus.PENDING;
        this.logger.log(`Payment SUCCESS: ${transaction.id}`);

        // Save transaction state first to ensure accurate record
        await this.transactionRepo.save(transaction);
      } else {
        this.logger.log(`Retrying downstream processing for transaction: ${transaction.id}`);
        transaction.processingAttempts += 1;
      }

      // Emit event for downstream processing (await to ensure state is updated before mobile polls)
      try {
        await this.eventEmitter.emitAsync('payment.success', {
          transactionId: transaction.id,
          userId: transaction.userId,
          type: transaction.type,
          paymentSource: transaction.paymentSource,
          amount: transaction.amount,
          jobId: transaction.jobId,
          payoutRequestId: transaction.payoutRequestId,
        });

        // Mark processing as completed
        transaction.processingStatus = ProcessingStatus.COMPLETED;
        transaction.processedAt = new Date();
        transaction.processingFailureReason = null;
        await this.transactionRepo.save(transaction);
      } catch (error) {
        this.logger.error(`Downstream processing failed for payment success: ${error.message}`);

        // Log to Sentry for monitoring
        this.sentryService.captureException(error, {
          transactionId: transaction.id,
          userId: transaction.userId,
          paymentSource: transaction.paymentSource,
          amount: transaction.amount,
          context: 'payment.success downstream processing',
        });

        // Log to business logger for audit trail
        this.businessLogger.logFailure(BusinessEventType.DOWNSTREAM_PROCESSING_FAILED, {
          userId: transaction.userId,
          transactionId: transaction.id,
          amount: transaction.amount,
          errorMessage: `Payment success downstream processing failed: ${error.message}`,
        });

        // Mark processing as failed but keep transaction as SUCCESS
        transaction.processingStatus = ProcessingStatus.FAILED;
        transaction.processingFailureReason = error.message;
        await this.transactionRepo.save(transaction);

        // Re-throw to trigger gateway retry
        throw error;
      }
      return;
    }

    if (payload.status === TransactionStatus.FAILED) {
      transaction.status = TransactionStatus.FAILED;
      transaction.failureReason = 'Gateway reported failure';
      this.logger.log(`Payment FAILED: ${transaction.id}`);

      this.businessLogger.logFailure(BusinessEventType.PAYMENT_CALLBACK_FAILED, {
        userId: transaction.userId,
        transactionId: transaction.id,
        amount: transaction.amount,
        provider: transaction.paymentCode,
        errorMessage: transaction.failureReason,
      });

      // Save transaction state first
      await this.transactionRepo.save(transaction);

      // Emit event for downstream processing
      try {
        await this.eventEmitter.emitAsync('payment.failed', {
          transactionId: transaction.id,
          userId: transaction.userId,
          type: transaction.type,
          paymentSource: transaction.paymentSource,
          amount: transaction.amount,
          jobId: transaction.jobId,
          payoutRequestId: transaction.payoutRequestId,
          reason: transaction.failureReason,
        });
      } catch (error) {
        this.logger.error(`Downstream processing failed for payment failure: ${error.message}`);

        this.sentryService.captureException(error, {
          transactionId: transaction.id,
          userId: transaction.userId,
          context: 'payment.failed downstream processing',
        });

        // Log but don't throw - payment already failed, just cleanup that failed
      }
      return;
    }

    // PENDING - no change needed, just save callback timestamp
    this.logger.log(`Callback status PENDING for transaction: ${transaction.id}`);
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
          this.httpService.get<GatewayStatusResponse>(`${baseUrl}/payment-api/payment/status`, {
            params: { transactionId: transaction.gatewayTransactionId },
          }),
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
          return (await this.transactionRepo.findOne({
            where: { id: transactionId },
          })) as PaymentTransaction;
        }
      } catch (error) {
        this.logger.error(`Failed to poll status: ${error.message}`);
      }
    }

    return transaction;
  }

  // ── POLL pending transactions (cron job) ───────────────────────────
  async pollPendingTransactions(): Promise<void> {
    const timeoutMinutes = await this.systemConfigService.getNumber(
      'payment.pending_timeout_minutes',
      15,
    );
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
    const timeoutMinutes = await this.systemConfigService.getNumber(
      'payment.pending_timeout_minutes',
      15,
    );
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

      try {
        await this.eventEmitter.emitAsync('payment.failed', {
          transactionId: tx.id,
          userId: tx.userId,
          type: tx.type,
          paymentSource: tx.paymentSource,
          amount: tx.amount,
          jobId: tx.jobId,
          payoutRequestId: tx.payoutRequestId,
          reason: 'Timeout',
        });
      } catch (error) {
        this.logger.error(`Downstream processing failed for timeout: ${error.message}`);

        this.sentryService.captureException(error, {
          transactionId: tx.id,
          userId: tx.userId,
          context: 'payment.timeout downstream processing',
        });

        // Log but don't throw - this is a background job
      }
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
    if (dto.paymentSource === PaymentSource.WALLET_TOPUP) {
      return 'Wallet top-up';
    }
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

  // ── Look up a provider by payment code ───────────────────────────
  async getProviderByCode(paymentCode: string): Promise<PaymentProviderEntity | null> {
    return this.providerRepo.findOne({ where: { paymentCode, isEnabled: true } });
  }
}
