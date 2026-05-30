import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { User } from '../users/entities/user.entity';
import { PayoutRequest, PayoutRequestStatus } from './entities/payout-request.entity';
import { CollectorFloatLedger, FloatLedgerType } from './entities/collector-float-ledger.entity';
import {
  WalletLedger,
  WalletLedgerDirection,
  WalletLedgerType,
} from './entities/wallet-ledger.entity';
import {
  UserPaymentMethod,
  UserPaymentMethodUsageType,
} from './entities/user-payment-method.entity';
import { SystemConfigService } from '../config/system-config.service';
import { EarningsEvents, EarningsConfirmedPayload } from '../events/events.types';
import { SubscriptionEvents } from '../events/events.types';
import { PaymentProviderEntity } from '../payments/entities/payment-provider.entity';
import {
  PaymentTransaction,
  TransactionType,
  TransactionStatus,
  PaymentSource,
} from '../payments/entities/payment-transaction.entity';
import { PaymentMode } from '../common/enums/payment-mode.enum';
import { PaymentService } from '../payments/payment.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(PaymentProviderEntity)
    private readonly paymentProviderRepo: Repository<PaymentProviderEntity>,
    @InjectRepository(CollectorFloatLedger)
    private readonly floatLedgerRepo: Repository<CollectorFloatLedger>,
    @InjectRepository(WalletLedger)
    private readonly walletLedgerRepo: Repository<WalletLedger>,
    @InjectRepository(UserPaymentMethod)
    private readonly userPaymentMethodRepo: Repository<UserPaymentMethod>,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepo: Repository<PaymentTransaction>,
    private readonly systemConfigService: SystemConfigService,
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── EVENT: earnings confirmed → credit wallet ─────────────────
  @OnEvent(EarningsEvents.CONFIRMED)
  async onEarningsConfirmed(payload: EarningsConfirmedPayload): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      // Get current balance before update
      const user = await em.getRepository(User).findOne({ where: { id: payload.collectorId } });
      if (!user) {
        this.logger.error(`User not found for earnings credit: ${payload.collectorId}`);
        return;
      }

      const balanceBefore = Number(user.walletBalance);
      const balanceAfter = balanceBefore + payload.amount;

      // Update wallet balance
      await em
        .createQueryBuilder()
        .update(User)
        .set({ walletBalance: () => `wallet_balance + ${payload.amount}` })
        .where('id = :id', { id: payload.collectorId })
        .execute();

      // Write wallet ledger entry
      const ledger = em.getRepository(WalletLedger).create({
        userId: payload.collectorId,
        direction: WalletLedgerDirection.CREDIT,
        type: WalletLedgerType.COLLECTOR_EARNING,
        amount: payload.amount,
        balanceBefore,
        balanceAfter,
        earningId: payload.earningsId,
        reference: `Earning ${payload.earningsId}`,
        metadata: { jobId: payload.jobId },
      });
      await em.getRepository(WalletLedger).save(ledger);
    });
    this.logger.log(`Wallet credited ${payload.amount} XAF → collector ${payload.collectorId}`);
  }

  // ── GET wallet balance (any user role) ───────────────────────
  async getBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { balance: Number(user.walletBalance) };
  }

  // ── GET app config (payment integration + support + providers) ───────────
  async getAppConfig(countryCode: string) {
    countryCode = countryCode.toUpperCase();
    const [
      paymentEnabled,
      manualInstructions,
      whatsapp,
      minAdvanceHours,
      cashEnabledStr,
      maxAdvanceDays,
      topupEnabled,
      topupMinAmount,
      topupMaxAmount,
      topupQuickAmountsStr,
      acceptTimeoutMinutes,
    ] = await Promise.all([
      this.systemConfigService.getBoolean('feature.payment_integration', false),
      this.systemConfigService.getString(
        'payment.manual_instructions',
        'Send your payment to the admin via Mobile Money. Use your phone number as reference.',
      ),
      this.systemConfigService.getString('support.whatsapp_number', ''),
      this.systemConfigService.getNumber('booking.min_advance_hours', 24),
      this.systemConfigService.getString('payments.cash_enabled', 'false'),
      this.systemConfigService.getNumber('booking.max_advance_days', 30),
      this.systemConfigService.getBoolean('wallet.topup_enabled', true),
      this.systemConfigService.getNumber('wallet.topup_min_amount', 500),
      this.systemConfigService.getNumber('wallet.topup_max_amount', 500000),
      this.systemConfigService.getString('wallet.topup_quick_amounts', '1000,3500,5000,10000'),
      this.systemConfigService.getNumber('assignment.accept_timeout_minutes', 25),
    ]);

    // Get enabled payment providers for manual payment
    const providers = await this.getEnabledPaymentProviders(countryCode);

    // Get cashin providers (supportsCashin=true)
    const cashinProviders = await this.paymentProviderRepo.find({
      where: {
        countryCode,
        isEnabled: true,
        supportsCashin: true,
      },
      order: { providerName: 'ASC' },
    });

    // Parse quick amounts
    const topupQuickAmounts = topupQuickAmountsStr
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    return {
      paymentIntegrationEnabled: paymentEnabled,
      cashEnabled: cashEnabledStr === 'true',
      manualPaymentInstructions: manualInstructions,
      supportWhatsapp: whatsapp,
      paymentProviders: providers,
      cashinProviders: cashinProviders.map((p) => ({
        paymentCode: p.paymentCode,
        providerName: p.providerName,
        manualPaymentPhone: p.manualPaymentPhone,
        manualPaymentAccountName: p.manualPaymentAccountName,
        manualInstructions: p.manualInstructions,
        integrationEnabled: p.integrationEnabled,
        manualInstructionsEnabled: p.manualInstructionsEnabled,
        manualProofRequired: p.manualProofRequired,
        supportsCashin: p.supportsCashin,
        supportsCashout: p.supportsCashout,
        imageUrl: p.imageUrl,
      })),
      minAdvanceHours,
      maxAdvanceDays,
      topupEnabled,
      topupMinAmount,
      topupMaxAmount,
      acceptTimeoutMinutes,
      topupQuickAmounts,
    };
  }

  // ── GET enabled payment providers for manual payment ───────────
  private async getEnabledPaymentProviders(countryCode: string): Promise<
    // countryCode is already normalised to uppercase by caller
    Array<{
      paymentCode: string;
      providerName: string;
      manualPaymentPhone: string | null;
      manualPaymentAccountName: string | null;
      manualInstructions: string | null;
      integrationEnabled: boolean;
      manualInstructionsEnabled: boolean;
      manualProofRequired: boolean;
    }>
  > {
    const providers = await this.paymentProviderRepo.find({
      where: {
        countryCode,
        isEnabled: true,
      },
      order: { providerName: 'ASC' },
    });

    return providers.map((p) => ({
      paymentCode: p.paymentCode,
      providerName: p.providerName,
      manualPaymentPhone: p.manualPaymentPhone,
      manualPaymentAccountName: p.manualPaymentAccountName,
      manualInstructions: p.manualInstructions,
      integrationEnabled: p.integrationEnabled,
      manualInstructionsEnabled: p.manualInstructionsEnabled,
      manualProofRequired: p.manualProofRequired,
    }));
  }

  // ── WALLET TOP-UP ───────────────────────────────────────────────
  async topUp(
    userId: string,
    dto: { amount: number; paymentMethodId: string; paymentRef?: string; paymentProofUrl?: string },
  ): Promise<PaymentTransaction> {
    // Check if top-up is enabled
    const topupEnabled = await this.systemConfigService.getBoolean('wallet.topup_enabled', true);
    if (!topupEnabled) {
      throw new BadRequestException('Wallet top-up is currently disabled');
    }

    // Validate amount against limits
    const minAmount = await this.systemConfigService.getNumber('wallet.topup_min_amount', 500);
    const maxAmount = await this.systemConfigService.getNumber('wallet.topup_max_amount', 500000);

    if (dto.amount < minAmount) {
      throw new BadRequestException(`Minimum top-up amount is ${minAmount} XAF`);
    }
    if (dto.amount > maxAmount) {
      throw new BadRequestException(`Maximum top-up amount is ${maxAmount} XAF`);
    }

    // Get user's payment method
    const userPaymentMethod = await this.userPaymentMethodRepo.findOne({
      where: { id: dto.paymentMethodId, userId },
    });

    if (!userPaymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    if (
      userPaymentMethod.usageType !== UserPaymentMethodUsageType.CASHIN &&
      userPaymentMethod.usageType !== UserPaymentMethodUsageType.BOTH
    ) {
      throw new BadRequestException('This payment method does not support top-up');
    }

    // Get provider config
    const provider = await this.paymentProviderRepo.findOne({
      where: { paymentCode: userPaymentMethod.paymentCode, isEnabled: true },
    });

    if (!provider) {
      throw new BadRequestException('Payment provider not found or disabled');
    }

    // Check if provider has integration enabled
    const integrationEnabled =
      provider.integrationEnabled && (await this.paymentService.isPaymentIntegrationEnabled());

    if (integrationEnabled) {
      // Integrated provider flow - call PaymentService
      return this.paymentService.initiatePayment(userId, {
        type: TransactionType.WALLET_TOPUP,
        amount: dto.amount,
        paymentCode: provider.paymentCode,
        phone: userPaymentMethod.accountNumber,
        paymentSource: PaymentSource.WALLET_TOPUP,
      });
    } else {
      // Manual provider flow - create pending transaction
      if (!dto.paymentRef) {
        throw new BadRequestException('Payment reference is required for manual top-up');
      }

      // Check if proof is required
      if (provider.manualProofRequired && !dto.paymentProofUrl) {
        throw new BadRequestException('Payment proof is required for this provider');
      }

      // Create transaction with AWAITING_ADMIN_VERIFICATION status
      const transaction = this.transactionRepo.create({
        userId,
        type: TransactionType.WALLET_TOPUP,
        amount: dto.amount,
        currency: 'XAF',
        paymentCode: provider.paymentCode,
        providerName: provider.providerName,
        phone: userPaymentMethod.accountNumber,
        internalRef: `WLT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        gatewayTransactionId: null,
        status: TransactionStatus.PENDING,
        paymentSource: PaymentSource.WALLET_TOPUP,
        jobId: null,
        payoutRequestId: null,
        paymentRef: dto.paymentRef,
        paymentProofUrl: dto.paymentProofUrl,
        failureReason: null,
      });

      const saved = await this.transactionRepo.save(transaction);

      this.logger.log(
        `Manual wallet top-up created: ${saved.id} for user ${userId}, amount ${dto.amount} XAF`,
      );

      return saved;
    }
  }

  // ── PAY JOB WITH WALLET ─────────────────────────────────────────
  async payJobWithWallet(
    userId: string,
    jobId: string,
  ): Promise<{ success: boolean; transactionId: string }> {
    return this.dataSource.transaction(async (em) => {
      // Get user with lock
      const user = await em
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :id', { id: userId })
        .setLock('pessimistic_write')
        .getOne();

      if (!user) throw new NotFoundException('User not found');

      // Get job to determine amount (with lock to prevent race conditions)
      const { Job } = await import('../jobs/entities/job.entity');
      const job = await em
        .getRepository(Job)
        .createQueryBuilder('j')
        .where('j.id = :id', { id: jobId })
        .setLock('pessimistic_write')
        .getOne();

      if (!job) throw new NotFoundException('Job not found');

      // Verify job ownership
      if (job.householdId !== userId) {
        throw new ForbiddenException('You cannot pay for this job');
      }

      const amount = job.quotedPrice;
      if (!amount) throw new BadRequestException('Job has no quoted price');

      // Check if job is already paid
      const { PaymentStatus } = await import('../common/enums/payment-status.enum');
      if (job.paymentStatus === PaymentStatus.VERIFIED) {
        throw new BadRequestException('Job is already paid');
      }

      // Check wallet balance
      const balance = Number(user.walletBalance);
      if (balance < amount) {
        throw new BadRequestException('INSUFFICIENT_WALLET_BALANCE');
      }

      const balanceBefore = balance;
      const balanceAfter = balance - amount;

      // Debit wallet
      await em
        .createQueryBuilder()
        .update(User)
        .set({ walletBalance: () => `wallet_balance - ${amount}` })
        .where('id = :id', { id: userId })
        .execute();

      // Create verified payment transaction
      const transaction = em.getRepository(PaymentTransaction).create({
        userId,
        type: TransactionType.JOB_PAYMENT,
        amount,
        currency: 'XAF',
        paymentCode: 'WALLET',
        providerName: 'Wallet Balance',
        phone: null,
        internalRef: `JOB-${jobId}-${Date.now()}`,
        gatewayTransactionId: null,
        status: TransactionStatus.VERIFIED,
        paymentSource: PaymentSource.JOB_PAYMENT,
        jobId,
        payoutRequestId: null,
        failureReason: null,
      });

      const saved = await em.getRepository(PaymentTransaction).save(transaction);

      // Write wallet ledger entry
      const ledger = em.getRepository(WalletLedger).create({
        userId,
        direction: WalletLedgerDirection.DEBIT,
        type: WalletLedgerType.JOB_PAYMENT,
        amount,
        balanceBefore,
        balanceAfter,
        paymentTransactionId: saved.id,
        jobId,
        reference: `Job ${jobId}`,
      });
      await em.getRepository(WalletLedger).save(ledger);

      // Update job payment fields
      job.paymentStatus = PaymentStatus.VERIFIED;
      job.paymentMethod = 'WALLET';
      job.paymentMode = PaymentMode.WALLET;

      // Update job status if needed
      const { JobStatus } = await import('../common/enums/job-status.enum');
      if (job.status === JobStatus.PAYMENT_PENDING) {
        job.status = JobStatus.REQUESTED;
      }

      await em.getRepository(Job).save(job);

      this.logger.log(
        `Job paid with wallet: job ${jobId}, amount ${amount} XAF, transaction ${saved.id}`,
      );

      return { success: true, transactionId: saved.id };
    });
  }

  // ── PAY SUBSCRIPTION WITH WALLET ─────────────────────────────────
  async paySubscriptionWithWallet(
    userId: string,
    planId: string,
  ): Promise<{ success: boolean; transactionId: string }> {
    return this.dataSource.transaction(async (em) => {
      // Get user with lock
      const user = await em
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :id', { id: userId })
        .setLock('pessimistic_write')
        .getOne();

      if (!user) throw new NotFoundException('User not found');

      // Get plan to determine amount
      const { SubscriptionPlan } =
        await import('../subscriptions/entities/subscription-plan.entity');
      const plan = await em.getRepository(SubscriptionPlan).findOne({ where: { id: planId } });

      if (!plan) throw new NotFoundException('Subscription plan not found');

      const amount = plan.price;
      if (!amount) throw new BadRequestException('Plan has no price');

      // Check wallet balance
      const balance = Number(user.walletBalance);
      if (balance < amount) {
        throw new BadRequestException('INSUFFICIENT_WALLET_BALANCE');
      }

      const balanceBefore = balance;
      const balanceAfter = balance - amount;

      // Debit wallet
      await em
        .createQueryBuilder()
        .update(User)
        .set({ walletBalance: () => `wallet_balance - ${amount}` })
        .where('id = :id', { id: userId })
        .execute();

      // Create verified payment transaction
      const transaction = em.getRepository(PaymentTransaction).create({
        userId,
        type: TransactionType.SUBSCRIPTION_PAYMENT,
        amount,
        currency: 'XAF',
        paymentCode: 'WALLET',
        providerName: 'Wallet Balance',
        phone: null,
        internalRef: `SUB-${planId}-${Date.now()}`,
        gatewayTransactionId: null,
        status: TransactionStatus.VERIFIED,
        paymentSource: PaymentSource.SUBSCRIPTION_PAYMENT,
        jobId: null,
        payoutRequestId: null,
        failureReason: null,
      });

      const saved = await em.getRepository(PaymentTransaction).save(transaction);

      // Activate subscription using shared activation logic and get subscription ID
      const { UserSubscription } =
        await import('../subscriptions/entities/user-subscription.entity');
      const { SubscriptionStatus } = await import('../common/enums/subscription-status.enum');
      const { PaymentStatus } = await import('../common/enums/payment-status.enum');
      const existingSubscription = await em.getRepository(UserSubscription).findOne({
        where: { userId },
        relations: ['plan'],
      });

      const now = new Date();
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const startDateStr = now.toISOString().split('T')[0];
      const endDateStr = thirtyDaysLater.toISOString().split('T')[0];

      let savedSubscription: any;

      if (existingSubscription) {
        existingSubscription.planId = planId;
        existingSubscription.status = SubscriptionStatus.ACTIVE;
        existingSubscription.paymentStatus = PaymentStatus.VERIFIED;
        existingSubscription.startDate = startDateStr;
        existingSubscription.endDate = endDateStr;
        existingSubscription.remainingPickupsThisWeek = plan.pickupsPerWeek;
        savedSubscription = await em.getRepository(UserSubscription).save(existingSubscription);
      } else {
        const newSubscription = em.getRepository(UserSubscription).create({
          userId,
          planId,
          status: SubscriptionStatus.ACTIVE,
          paymentStatus: PaymentStatus.VERIFIED,
          startDate: startDateStr,
          endDate: endDateStr,
          remainingPickupsThisWeek: plan.pickupsPerWeek,
        });
        savedSubscription = await em.getRepository(UserSubscription).save(newSubscription);
      }

      // Write wallet ledger entry with subscriptionId
      const ledger = em.getRepository(WalletLedger).create({
        userId,
        direction: WalletLedgerDirection.DEBIT,
        type: WalletLedgerType.SUBSCRIPTION_PAYMENT,
        amount,
        balanceBefore,
        balanceAfter,
        paymentTransactionId: saved.id,
        subscriptionId: savedSubscription.id,
        reference: `Subscription ${savedSubscription.id}`,
      });
      await em.getRepository(WalletLedger).save(ledger);

      // Emit subscription paid event for commission and notifications
      this.eventEmitter.emit(SubscriptionEvents.PAID, {
        subscriptionId: savedSubscription.id,
        userId,
        planId,
        planName: plan.name,
        amount,
        timestamp: new Date(),
      });

      this.logger.log(
        `Subscription paid with wallet: plan ${planId}, amount ${amount} XAF, transaction ${saved.id}`,
      );

      return { success: true, transactionId: saved.id };
    });
  }

  private getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ── GET payout config ─────────────────────────────────────────
  async getPayoutConfig() {
    const [minWithdrawal, maxWithdrawal, payoutMode] = await Promise.all([
      this.systemConfigService.getNumber('payout.min_withdrawal', 1000),
      this.systemConfigService.getNumber('payout.max_withdrawal', 500000),
      this.systemConfigService.getString('marketer.payout_mode', 'MANUAL_APPROVAL'),
    ]);

    // Get cashout providers (supportsCashout=true) — source of truth for enabled payout methods
    const cashoutProviders = await this.paymentProviderRepo.find({
      where: {
        isEnabled: true,
        supportsCashout: true,
      },
      order: { providerName: 'ASC' },
    });

    // Derive allowed methods from payment_providers table (provider overrides system defaults)
    const methods = cashoutProviders.map((p) => ({
      key: p.paymentCode,
      label: p.providerName,
    }));

    return {
      minWithdrawal,
      maxWithdrawal,
      methods,
      payoutMode: payoutMode as 'MANUAL_APPROVAL' | 'AUTO_PROVIDER_PAYOUT',
      cashoutProviders: cashoutProviders.map((p) => ({
        paymentCode: p.paymentCode,
        providerName: p.providerName,
        manualPaymentPhone: p.manualPaymentPhone,
        manualPaymentAccountName: p.manualPaymentAccountName,
        manualInstructions: p.manualInstructions,
        integrationEnabled: p.integrationEnabled,
        manualInstructionsEnabled: p.manualInstructionsEnabled,
        manualProofRequired: p.manualProofRequired,
        supportsCashin: p.supportsCashin,
        supportsCashout: p.supportsCashout,
        minWithdrawal: p.minWithdrawal !== null ? Number(p.minWithdrawal) : null,
        maxWithdrawal: p.maxWithdrawal !== null ? Number(p.maxWithdrawal) : null,
        imageUrl: p.imageUrl,
      })),
    };
  }

  // ── REQUEST WITHDRAWAL ────────────────────────────────────────
  async requestWithdrawal(
    collectorId: string,
    dto: { amount: number; method: string; accountNumber?: string; accountName?: string },
  ): Promise<PayoutRequest> {
    const config = await this.getPayoutConfig();

    const normalizedMethod = dto.method.toUpperCase();
    const validMethods = config.methods.map((m) => m.key.toUpperCase());
    if (!validMethods.includes(normalizedMethod)) {
      throw new BadRequestException(
        `Unsupported payment method. Enabled: ${validMethods.join(', ')}`,
      );
    }

    // Provider-level min/max override system config fallback
    const provider = config.cashoutProviders.find(
      (p) => p.paymentCode.toUpperCase() === normalizedMethod,
    );
    const effectiveMin = provider?.minWithdrawal ?? config.minWithdrawal;
    const effectiveMax = provider?.maxWithdrawal ?? config.maxWithdrawal;

    if (dto.amount < effectiveMin) {
      throw new BadRequestException(`Minimum withdrawal for this method is ${effectiveMin} XAF`);
    }
    if (dto.amount > effectiveMax) {
      throw new BadRequestException(`Maximum withdrawal for this method is ${effectiveMax} XAF`);
    }

    // Debit wallet atomically, ensuring sufficient balance
    const result = await this.dataSource.transaction(async (em) => {
      const user = await em
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :id', { id: collectorId })
        .setLock('pessimistic_write')
        .getOne();

      if (!user) throw new NotFoundException('User not found');

      const balance = Number(user.walletBalance);
      if (balance < dto.amount) {
        throw new BadRequestException(`Insufficient balance. Available: ${balance} XAF`);
      }

      await em
        .createQueryBuilder()
        .update(User)
        .set({ walletBalance: () => `wallet_balance - ${dto.amount}` })
        .where('id = :id', { id: collectorId })
        .execute();

      const request = em.getRepository(PayoutRequest).create({
        collectorId,
        amount: dto.amount,
        method: dto.method,
        accountNumber: dto.accountNumber ?? null,
        accountName: dto.accountName ?? null,
        status: PayoutRequestStatus.PENDING, // Admin will review and process manually
      });

      const saved = await em.getRepository(PayoutRequest).save(request);

      this.logger.log(
        `Payout request ${saved.id} created for ${dto.amount} XAF — pending admin review`,
      );

      return saved;
    });

    // Note: Real cashout (sending money to collector's phone) is not yet implemented.
    // For now, admin manually processes payouts via the admin dashboard.
    // When a cashout API becomes available, this is where we'd initiate it.

    return result;
  }

  // ── COLLECTOR: list my payout requests ───────────────────────
  async getMyPayoutRequests(collectorId: string): Promise<PayoutRequest[]> {
    return this.payoutRepo.find({
      where: { collectorId },
      order: { createdAt: 'DESC' },
    });
  }

  // ── ADMIN: list all payout requests ──────────────────────────
  async adminListPayoutRequests(filters: {
    status?: PayoutRequestStatus;
    collectorId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const qb = this.payoutRepo
      .createQueryBuilder('pr')
      .leftJoin('pr.collector', 'collector')
      .addSelect(['collector.id', 'collector.name', 'collector.phone'])
      .orderBy('pr.createdAt', 'DESC');

    if (filters.status) {
      qb.andWhere('pr.status = :status', { status: filters.status });
    }
    if (filters.collectorId) {
      qb.andWhere('pr.collector_id = :collectorId', { collectorId: filters.collectorId });
    }

    const total = await qb.getCount();
    const requests = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: requests.map((r) => this.toAdminDto(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── ADMIN: confirm / reject payout ───────────────────────────
  async adminReviewPayout(
    payoutId: string,
    adminId: string,
    action: 'approve' | 'reject' | 'mark_paid',
    adminNote?: string,
  ) {
    const request = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!request) throw new NotFoundException('Payout request not found');

    if (action === 'approve') {
      if (request.status !== PayoutRequestStatus.PENDING) {
        throw new BadRequestException(`Cannot approve a ${request.status} request`);
      }
      request.status = PayoutRequestStatus.APPROVED;
    } else if (action === 'reject') {
      if (request.status === PayoutRequestStatus.PAID) {
        throw new BadRequestException('Cannot reject a PAID request');
      }
      if (request.status === PayoutRequestStatus.REJECTED) {
        throw new BadRequestException('Already rejected');
      }
      // Refund the wallet (amount was debited when request was created)
      await this.dataSource
        .createQueryBuilder()
        .update(User)
        .set({ walletBalance: () => `wallet_balance + ${request.amount}` })
        .where('id = :id', { id: request.collectorId })
        .execute();
      request.status = PayoutRequestStatus.REJECTED;
    } else if (action === 'mark_paid') {
      if (request.status !== PayoutRequestStatus.APPROVED) {
        throw new BadRequestException(
          `Only APPROVED requests can be marked as paid (current: ${request.status})`,
        );
      }
      request.status = PayoutRequestStatus.PAID;
      request.paidAt = new Date();
    }

    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    if (adminNote) request.adminNote = adminNote;

    const saved = await this.payoutRepo.save(request);
    this.logger.log(`Payout ${payoutId} → ${saved.status} by admin ${adminId}`);
    return this.toAdminDto(saved);
  }

  // ── ADMIN: top-up collector float balance ──────────────────────
  async adminFloatTopUp(
    collectorId: string,
    amount: number,
    adminId: string,
    note?: string,
  ): Promise<{ collectorId: string; newFloatBalance: number }> {
    if (amount <= 0) throw new BadRequestException('Top-up amount must be positive');

    return this.dataSource.transaction(async (em) => {
      const collector = await em
        .getRepository(User)
        .createQueryBuilder('u')
        .where('u.id = :id', { id: collectorId })
        .setLock('pessimistic_write')
        .getOne();

      if (!collector) throw new NotFoundException('Collector not found');

      const before = Number(collector.collectorFloatBalance);
      const after = before + amount;

      await em
        .createQueryBuilder()
        .update(User)
        .set({ collectorFloatBalance: () => `collector_float_balance + ${amount}` })
        .where('id = :id', { id: collectorId })
        .execute();

      const ledger = em.getRepository(CollectorFloatLedger).create({
        collectorId,
        jobId: null,
        type: FloatLedgerType.TOP_UP,
        amount,
        balanceBefore: before,
        balanceAfter: after,
        createdBy: adminId,
      });
      await em.getRepository(CollectorFloatLedger).save(ledger);

      this.logger.log(
        `Admin ${adminId} topped up float for collector ${collectorId}: +${amount} XAF (${before} → ${after})${
          note ? ` [${note}]` : ''
        }`,
      );

      return { collectorId, newFloatBalance: after };
    });
  }

  // ── USER PAYMENT METHODS ────────────────────────────────────────

  async listPaymentMethods(userId: string, usage?: 'CASHIN' | 'CASHOUT') {
    const qb = this.userPaymentMethodRepo
      .createQueryBuilder('upm')
      .leftJoinAndSelect('upm.user', 'user')
      .where('upm.userId = :userId', { userId })
      .andWhere('upm.deletedAt IS NULL')
      .orderBy('upm.isDefault', 'DESC')
      .addOrderBy('upm.createdAt', 'DESC');

    if (usage === 'CASHIN') {
      qb.andWhere('upm.usageType IN (:...types)', {
        types: [UserPaymentMethodUsageType.CASHIN, UserPaymentMethodUsageType.BOTH],
      });
    } else if (usage === 'CASHOUT') {
      qb.andWhere('upm.usageType IN (:...types)', {
        types: [UserPaymentMethodUsageType.CASHOUT, UserPaymentMethodUsageType.BOTH],
      });
    }

    const methods = await qb.getMany();

    // Fetch provider details for each method
    const paymentCodes = [...new Set(methods.map((m) => m.paymentCode.toUpperCase()))];
    const providers = await this.paymentProviderRepo.find({
      where: { paymentCode: In(paymentCodes) },
    });

    const providerMap = new Map(providers.map((p) => [p.paymentCode.toUpperCase(), p]));

    return methods.map((m) => {
      const provider = providerMap.get(m.paymentCode.toUpperCase());
      return {
        id: m.id,
        paymentCode: m.paymentCode,
        providerName: provider?.providerName ?? m.paymentCode,
        accountNumber: m.accountNumber,
        maskedAccountNumber: this.maskAccountNumber(m.accountNumber),
        accountName: m.accountName,
        usageType: m.usageType,
        isDefault: m.isDefault,
        supportsCashin: provider?.supportsCashin ?? false,
        supportsCashout: provider?.supportsCashout ?? false,
      };
    });
  }

  async addPaymentMethod(
    userId: string,
    dto: {
      paymentCode: string;
      accountNumber: string;
      accountName?: string;
      usageType?: UserPaymentMethodUsageType;
      isDefault?: boolean;
    },
  ) {
    // Validate paymentCode exists and is enabled
    const normalizedCode = dto.paymentCode.toUpperCase();
    const provider = await this.paymentProviderRepo.findOne({
      where: { paymentCode: normalizedCode, isEnabled: true },
    });
    if (!provider) {
      throw new BadRequestException(`Payment provider ${dto.paymentCode} not found or disabled`);
    }

    // Validate usageType matches provider capabilities
    const usageType = dto.usageType ?? UserPaymentMethodUsageType.BOTH;
    if (usageType === UserPaymentMethodUsageType.CASHIN && !provider.supportsCashin) {
      throw new BadRequestException(`Provider ${normalizedCode} does not support cash-in`);
    }
    if (usageType === UserPaymentMethodUsageType.CASHOUT && !provider.supportsCashout) {
      throw new BadRequestException(`Provider ${normalizedCode} does not support cash-out`);
    }

    // Check for duplicate active method
    const existing = await this.userPaymentMethodRepo.findOne({
      where: {
        userId,
        paymentCode: normalizedCode,
        accountNumber: dto.accountNumber,
        deletedAt: IsNull(),
      },
    });
    if (existing) {
      throw new BadRequestException('You already have this payment method saved');
    }

    const isFirst =
      (await this.userPaymentMethodRepo.count({
        where: { userId, deletedAt: IsNull() },
      })) === 0;

    const method = this.userPaymentMethodRepo.create({
      userId,
      paymentCode: normalizedCode,
      accountNumber: dto.accountNumber,
      accountName: dto.accountName ?? null,
      usageType,
      isDefault: dto.isDefault ?? isFirst,
    });

    const saved = await this.userPaymentMethodRepo.save(method);

    // If set as default, unset other defaults for this direction
    if (saved.isDefault) {
      await this.clearOtherDefaults(userId, saved.id, usageType);
    }

    return this.toPaymentMethodDto(saved, provider);
  }

  async updatePaymentMethod(
    userId: string,
    id: string,
    dto: { accountNumber?: string; accountName?: string },
  ) {
    const method = await this.userPaymentMethodRepo.findOne({
      where: { id, userId, deletedAt: IsNull() },
    });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    if (dto.accountNumber) {
      method.accountNumber = dto.accountNumber;
    }
    if (dto.accountName !== undefined) {
      method.accountName = dto.accountName;
    }

    const saved = await this.userPaymentMethodRepo.save(method);
    const provider = await this.paymentProviderRepo.findOne({
      where: { paymentCode: saved.paymentCode },
    });

    return this.toPaymentMethodDto(saved, provider);
  }

  async deletePaymentMethod(userId: string, id: string) {
    const method = await this.userPaymentMethodRepo.findOne({
      where: { id, userId, deletedAt: IsNull() },
    });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    // Soft delete
    method.deletedAt = new Date();
    method.isActive = false;
    await this.userPaymentMethodRepo.save(method);
  }

  async setDefaultPaymentMethod(userId: string, id: string, usage: 'CASHIN' | 'CASHOUT') {
    const method = await this.userPaymentMethodRepo.findOne({
      where: { id, userId, deletedAt: IsNull() },
    });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    // Validate method supports the requested direction
    if (usage === 'CASHIN' && method.usageType === UserPaymentMethodUsageType.CASHOUT) {
      throw new BadRequestException('This method cannot be used for cash-in');
    }
    if (usage === 'CASHOUT' && method.usageType === UserPaymentMethodUsageType.CASHIN) {
      throw new BadRequestException('This method cannot be used for cash-out');
    }

    // Set as default and clear others for this direction
    method.isDefault = true;
    await this.userPaymentMethodRepo.save(method);
    await this.clearOtherDefaults(userId, id, method.usageType);

    const provider = await this.paymentProviderRepo.findOne({
      where: { paymentCode: method.paymentCode },
    });

    return this.toPaymentMethodDto(method, provider);
  }

  private async clearOtherDefaults(
    userId: string,
    excludeId: string,
    usageType: UserPaymentMethodUsageType,
  ) {
    const relevantTypes =
      usageType === UserPaymentMethodUsageType.BOTH
        ? [
            UserPaymentMethodUsageType.CASHIN,
            UserPaymentMethodUsageType.CASHOUT,
            UserPaymentMethodUsageType.BOTH,
          ]
        : usageType === UserPaymentMethodUsageType.CASHIN
          ? [UserPaymentMethodUsageType.CASHIN, UserPaymentMethodUsageType.BOTH]
          : [UserPaymentMethodUsageType.CASHOUT, UserPaymentMethodUsageType.BOTH];

    await this.userPaymentMethodRepo
      .createQueryBuilder()
      .update(UserPaymentMethod)
      .set({ isDefault: false })
      .where('userId = :userId', { userId })
      .andWhere('id != :id', { id: excludeId })
      .andWhere('usageType IN (:...types)', { types: relevantTypes })
      .andWhere('deletedAt IS NULL')
      .execute();
  }

  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 6) return accountNumber;
    const start = accountNumber.substring(0, accountNumber.length - 4);
    const end = accountNumber.substring(accountNumber.length - 4);
    return `${start.substring(0, start.length - 3)} *** ${end}`;
  }

  private toPaymentMethodDto(method: UserPaymentMethod, provider: PaymentProviderEntity | null) {
    return {
      id: method.id,
      paymentCode: method.paymentCode,
      providerName: provider?.providerName ?? method.paymentCode,
      accountNumber: method.accountNumber,
      maskedAccountNumber: this.maskAccountNumber(method.accountNumber),
      accountName: method.accountName,
      usageType: method.usageType,
      isDefault: method.isDefault,
      supportsCashin: provider?.supportsCashin ?? false,
      supportsCashout: provider?.supportsCashout ?? false,
    };
  }

  private toAdminDto(r: PayoutRequest) {
    return {
      id: r.id,
      collectorId: r.collectorId,
      collectorName: (r as any).collector?.name ?? null,
      collectorPhone: (r as any).collector?.phone ?? null,
      amount: Number(r.amount),
      method: r.method,
      accountNumber: r.accountNumber,
      accountName: r.accountName,
      status: r.status,
      adminNote: r.adminNote,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      paidAt: r.paidAt,
      createdAt: r.createdAt,
    };
  }
}
