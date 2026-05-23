import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { User } from '../users/entities/user.entity';
import { PayoutRequest, PayoutRequestStatus } from './entities/payout-request.entity';
import { CollectorFloatLedger, FloatLedgerType } from './entities/collector-float-ledger.entity';
import { UserPaymentMethod, UserPaymentMethodUsageType } from './entities/user-payment-method.entity';
import { SystemConfigService } from '../config/system-config.service';
import { EarningsEvents, EarningsConfirmedPayload } from '../events/events.types';
import { PaymentProviderEntity } from '../payments/entities/payment-provider.entity';

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
    @InjectRepository(UserPaymentMethod)
    private readonly userPaymentMethodRepo: Repository<UserPaymentMethod>,
    private readonly systemConfigService: SystemConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ── EVENT: earnings confirmed → credit wallet ─────────────────
  @OnEvent(EarningsEvents.CONFIRMED)
  async onEarningsConfirmed(payload: EarningsConfirmedPayload): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .update(User)
        .set({ walletBalance: () => `wallet_balance + ${payload.amount}` })
        .where('id = :id', { id: payload.collectorId })
        .execute();
    });
    this.logger.log(
      `Wallet credited ${payload.amount} XAF → collector ${payload.collectorId}`,
    );
  }

  // ── GET wallet balance (any user role) ───────────────────────
  async getBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return { balance: Number(user.walletBalance) };
  }

  // ── GET app config (payment integration + support + providers) ───────────
  async getAppConfig(countryCode: string) {
    const [paymentEnabled, manualInstructions, whatsapp, minAdvanceHoursStr, cashEnabledStr, maxAdvanceDays] = await Promise.all([
      this.systemConfigService.getBoolean('feature.payment_integration', false),
      this.systemConfigService.getString(
        'payment.manual_instructions',
        'Send your payment to the admin via Mobile Money. Use your phone number as reference.',
      ),
      this.systemConfigService.getString('support.whatsapp_number', ''),
      this.systemConfigService.getString('booking.min_advance_hours', '24'),
      this.systemConfigService.getString('payments.cash_enabled', 'false'),
      this.systemConfigService.getNumber('booking.max_advance_days', 30),
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
      })),
      minAdvanceHours: parseInt(minAdvanceHoursStr, 10) || 24,
      maxAdvanceDays,
    };
  }

  // ── GET enabled payment providers for manual payment ───────────
  private async getEnabledPaymentProviders(countryCode: string): Promise<
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

  // ── GET payout config ─────────────────────────────────────────
  async getPayoutConfig() {
    const [minStr, maxStr, methodsStr, mmLabel, bankLabel, payoutMode] = await Promise.all([
      this.systemConfigService.getString('payout.min_withdrawal', '1000'),
      this.systemConfigService.getString('payout.max_withdrawal', '500000'),
      this.systemConfigService.getString('payout.methods_enabled', 'MOBILE_MONEY,BANK_TRANSFER'),
      this.systemConfigService.getString('payout.mobile_money_label', 'MTN Mobile Money / Orange Money'),
      this.systemConfigService.getString('payout.bank_transfer_label', 'Bank Transfer'),
      this.systemConfigService.getString('marketer.payout_mode', 'MANUAL_APPROVAL'),
    ]);

    const methods = methodsStr
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean)
      .map((key) => ({
        key,
        label: key === 'MOBILE_MONEY' ? mmLabel : key === 'BANK_TRANSFER' ? bankLabel : key,
      }));

    // Get cashout providers (supportsCashout=true)
    const cashoutProviders = await this.paymentProviderRepo.find({
      where: {
        isEnabled: true,
        supportsCashout: true,
      },
      order: { providerName: 'ASC' },
    });

    return {
      minWithdrawal: Number(minStr),
      maxWithdrawal: Number(maxStr),
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
      })),
    };
  }

  // ── REQUEST WITHDRAWAL ────────────────────────────────────────
  async requestWithdrawal(
    collectorId: string,
    dto: { amount: number; method: string; accountNumber?: string; accountName?: string },
  ): Promise<PayoutRequest> {
    const config = await this.getPayoutConfig();

    if (dto.amount < config.minWithdrawal) {
      throw new BadRequestException(
        `Minimum withdrawal is ${config.minWithdrawal} XAF`,
      );
    }
    if (dto.amount > config.maxWithdrawal) {
      throw new BadRequestException(
        `Maximum withdrawal is ${config.maxWithdrawal} XAF`,
      );
    }

    const validMethods = config.methods.map((m) => m.key);
    if (!validMethods.includes(dto.method)) {
      throw new BadRequestException(
        `Unsupported payment method. Enabled: ${validMethods.join(', ')}`,
      );
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
        throw new BadRequestException(
          `Insufficient balance. Available: ${balance} XAF`,
        );
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
        throw new BadRequestException(`Only APPROVED requests can be marked as paid (current: ${request.status})`);
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
      qb.andWhere('upm.usageType IN (:...types)', { types: [UserPaymentMethodUsageType.CASHIN, UserPaymentMethodUsageType.BOTH] });
    } else if (usage === 'CASHOUT') {
      qb.andWhere('upm.usageType IN (:...types)', { types: [UserPaymentMethodUsageType.CASHOUT, UserPaymentMethodUsageType.BOTH] });
    }

    const methods = await qb.getMany();

    // Fetch provider details for each method
    const paymentCodes = [...new Set(methods.map((m) => m.paymentCode))];
    const providers = await this.paymentProviderRepo.find({
      where: { paymentCode: In(paymentCodes) },
    });

    const providerMap = new Map(providers.map((p) => [p.paymentCode, p]));

    return methods.map((m) => {
      const provider = providerMap.get(m.paymentCode);
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
    const provider = await this.paymentProviderRepo.findOne({
      where: { paymentCode: dto.paymentCode, isEnabled: true },
    });
    if (!provider) {
      throw new BadRequestException(`Payment provider ${dto.paymentCode} not found or disabled`);
    }

    // Validate usageType matches provider capabilities
    const usageType = dto.usageType ?? UserPaymentMethodUsageType.BOTH;
    if (usageType === UserPaymentMethodUsageType.CASHIN && !provider.supportsCashin) {
      throw new BadRequestException(`Provider ${dto.paymentCode} does not support cash-in`);
    }
    if (usageType === UserPaymentMethodUsageType.CASHOUT && !provider.supportsCashout) {
      throw new BadRequestException(`Provider ${dto.paymentCode} does not support cash-out`);
    }

    // Check for duplicate active method
    const existing = await this.userPaymentMethodRepo.findOne({
      where: {
        userId,
        paymentCode: dto.paymentCode,
        accountNumber: dto.accountNumber,
        deletedAt: IsNull(),
      },
    });
    if (existing) {
      throw new BadRequestException('You already have this payment method saved');
    }

    const isFirst = await this.userPaymentMethodRepo.count({
      where: { userId, deletedAt: IsNull() },
    }) === 0;

    const method = this.userPaymentMethodRepo.create({
      userId,
      paymentCode: dto.paymentCode,
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

  private async clearOtherDefaults(userId: string, excludeId: string, usageType: UserPaymentMethodUsageType) {
    const relevantTypes =
      usageType === UserPaymentMethodUsageType.BOTH
        ? [UserPaymentMethodUsageType.CASHIN, UserPaymentMethodUsageType.CASHOUT, UserPaymentMethodUsageType.BOTH]
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
