import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MarketerPayoutRequest, PayoutStatus, MarketerProfile, CommissionTransaction, CommissionStatus, NotificationType } from '../entities';
import { CreatePayoutRequestDto } from '../dto';
import { MarketerNotificationService } from './marketer-notification.service';

@Injectable()
export class MarketerPayoutService {
  constructor(
    @InjectRepository(MarketerPayoutRequest)
    private readonly payoutRepo: Repository<MarketerPayoutRequest>,
    @InjectRepository(MarketerProfile)
    private readonly profileRepo: Repository<MarketerProfile>,
    @InjectRepository(CommissionTransaction)
    private readonly transactionRepo: Repository<CommissionTransaction>,
    private readonly notificationService: MarketerNotificationService,
    private readonly dataSource: DataSource,
  ) {}

  async createPayoutRequest(
    marketerProfileId: string,
    dto: CreatePayoutRequestDto,
  ): Promise<MarketerPayoutRequest> {
    const profile = await this.profileRepo.findOne({
      where: { id: marketerProfileId },
    });

    if (!profile) {
      throw new NotFoundException('Marketer profile not found');
    }

    // Check available balance
    if (dto.amount > profile.approvedAmount) {
      throw new BadRequestException(
        `Insufficient approved balance. Available: ${profile.approvedAmount} XAF, Requested: ${dto.amount} XAF`
      );
    }

    // Check for existing pending request
    const existingPending = await this.payoutRepo.findOne({
      where: {
        marketerProfileId,
        status: PayoutStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new BadRequestException('You already have a pending payout request');
    }

    // Create request and deduct balance atomically
    const saved = await this.dataSource.transaction(async (manager) => {
      const request = manager.create(MarketerPayoutRequest, {
        marketerProfileId,
        amount: dto.amount,
        method: dto.method,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName || null,
        status: PayoutStatus.PENDING,
      });

      const savedRequest = await manager.save(request);

      // Update approved amount
      profile.approvedAmount -= dto.amount;
      await manager.save(profile);

      return savedRequest;
    });

    return saved;
  }

  async getMarketerPayouts(marketerProfileId: string): Promise<MarketerPayoutRequest[]> {
    return this.payoutRepo.find({
      where: { marketerProfileId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(filters?: {
    status?: PayoutStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: MarketerPayoutRequest[]; total: number }> {
    const { status, page = 1, limit = 20 } = filters || {};
    const where: any = {};
    
    if (status) where.status = status;

    const [data, total] = await this.payoutRepo.findAndCount({
      where,
      relations: ['marketerProfile', 'marketerProfile.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async approvePayout(
    payoutId: string,
    adminId: string,
  ): Promise<MarketerPayoutRequest> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId },
      relations: ['marketerProfile'],
    });

    if (!payout) {
      throw new NotFoundException('Payout request not found');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('Payout request is not pending');
    }

    payout.status = PayoutStatus.APPROVED;
    payout.reviewedBy = adminId;
    payout.reviewedAt = new Date();

    return this.payoutRepo.save(payout);
  }

  async rejectPayout(
    payoutId: string,
    adminId: string,
    reason: string,
  ): Promise<MarketerPayoutRequest> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId },
      relations: ['marketerProfile'],
    });

    if (!payout) {
      throw new NotFoundException('Payout request not found');
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('Payout request is not pending');
    }

    payout.status = PayoutStatus.REJECTED;
    payout.reviewedBy = adminId;
    payout.reviewedAt = new Date();
    payout.adminNote = reason;

    const saved = await this.payoutRepo.save(payout);

    // Return amount to approved balance
    const profile = payout.marketerProfile;
    profile.approvedAmount += parseFloat(payout.amount.toString());
    await this.profileRepo.save(profile);

    // Notify marketer
    await this.notificationService.sendNotification(
      profile.id,
      NotificationType.PAYOUT_PROCESSED,
      'Payout Request Rejected',
      `Your payout request for ${payout.amount} XAF was rejected. Reason: ${reason}`,
      { payoutId: payout.id },
    );

    return saved;
  }

  async markAsPaid(
    payoutId: string,
    adminId: string,
    paidReference?: string,
  ): Promise<MarketerPayoutRequest> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId },
      relations: ['marketerProfile'],
    });

    if (!payout) {
      throw new NotFoundException('Payout request not found');
    }

    if (payout.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException('Payout request must be approved before marking as paid');
    }

    payout.status = PayoutStatus.PAID;
    payout.paidAt = new Date();
    payout.paidReference = paidReference || null;

    const saved = await this.payoutRepo.save(payout);

    // Update marketer stats
    const profile = payout.marketerProfile;
    profile.totalPaid += parseFloat(payout.amount.toString());
    await this.profileRepo.save(profile);

    // Notify marketer
    await this.notificationService.sendNotification(
      profile.id,
      NotificationType.PAYOUT_PROCESSED,
      'Payout Processed! 💸',
      `Your payout of ${payout.amount} XAF has been sent to your ${payout.method} account.`,
      { payoutId: payout.id, reference: paidReference },
    );

    return saved;
  }
}
