import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { User } from '../users/entities/user.entity';
import { PayoutRequest, PayoutRequestStatus } from './entities/payout-request.entity';
import { SystemConfigService } from '../config/system-config.service';
import { FeatureFlagService, FEATURE_FLAGS } from '../config/feature-flags';
import { EarningsEvents, EarningsConfirmedPayload } from '../events/events.types';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    private readonly systemConfigService: SystemConfigService,
    private readonly featureFlagService: FeatureFlagService,
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

  // ── GET wallet balance ────────────────────────────────────────
  async getBalance(collectorId: string): Promise<{ balance: number }> {
    const user = await this.userRepo.findOne({ where: { id: collectorId } });
    if (!user) throw new NotFoundException('User not found');
    return { balance: Number(user.walletBalance) };
  }

  // ── GET app config (payment integration + support) ───────────
  async getAppConfig() {
    const [paymentEnabled, manualInstructions, whatsapp] = await Promise.all([
      this.systemConfigService.getBoolean('feature.payment_integration', false),
      this.systemConfigService.getString(
        'payment.manual_instructions',
        'Send your payment to the admin via Mobile Money. Use your phone number as reference.',
      ),
      this.systemConfigService.getString('support.whatsapp_number', ''),
    ]);
    return {
      paymentIntegrationEnabled: paymentEnabled,
      manualPaymentInstructions: manualInstructions,
      supportWhatsapp: whatsapp,
    };
  }

  // ── GET payout config ─────────────────────────────────────────
  async getPayoutConfig() {
    const [minStr, maxStr, methodsStr, mmLabel, bankLabel] = await Promise.all([
      this.systemConfigService.getString('payout.min_withdrawal', '1000'),
      this.systemConfigService.getString('payout.max_withdrawal', '500000'),
      this.systemConfigService.getString('payout.methods_enabled', 'MOBILE_MONEY,BANK_TRANSFER'),
      this.systemConfigService.getString('payout.mobile_money_label', 'MTN Mobile Money / Orange Money'),
      this.systemConfigService.getString('payout.bank_transfer_label', 'Bank Transfer'),
    ]);

    const methods = methodsStr
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean)
      .map((key) => ({
        key,
        label: key === 'MOBILE_MONEY' ? mmLabel : key === 'BANK_TRANSFER' ? bankLabel : key,
      }));

    return {
      minWithdrawal: Number(minStr),
      maxWithdrawal: Number(maxStr),
      methods,
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

      const payoutIntegrationEnabled = await this.featureFlagService.isEnabled(
        FEATURE_FLAGS.PAYMENT_INTEGRATION,
        false,
      );

      const request = em.getRepository(PayoutRequest).create({
        collectorId,
        amount: dto.amount,
        method: dto.method,
        accountNumber: dto.accountNumber ?? null,
        accountName: dto.accountName ?? null,
        status: payoutIntegrationEnabled
          ? PayoutRequestStatus.APPROVED
          : PayoutRequestStatus.PENDING,
      });

      const saved = await em.getRepository(PayoutRequest).save(request);

      if (payoutIntegrationEnabled) {
        this.logger.log(
          `Payment integration active — auto-approved payout ${saved.id} for ${dto.amount} XAF`,
        );
      }

      return saved;
    });

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
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
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
