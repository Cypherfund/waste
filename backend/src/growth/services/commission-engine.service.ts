import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus, CommissionTransaction, CommissionStatus, TriggerType, MarketerProfile } from '../entities';
import { CommissionService } from './commission.service';
import { LeadService } from './lead.service';
import { MarketerNotificationService } from './marketer-notification.service';

interface BookingCompletedEvent {
  bookingId: string;
  userId: string;
  amount: number;
  collectorId: string;
  paymentStatus: string;
}

interface JobCompletedEvent {
  jobId: string;
  collectorId: string;
  householdId: string;
  completedAt: Date;
}

interface SubscriptionPaidEvent {
  subscriptionId: string;
  userId: string;
  amount: number;
  planType: string;
}

@Injectable()
export class CommissionEngineService {
  private readonly logger = new Logger(CommissionEngineService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(CommissionTransaction)
    private readonly transactionRepo: Repository<CommissionTransaction>,
    @InjectRepository(MarketerProfile)
    private readonly profileRepo: Repository<MarketerProfile>,
    private readonly commissionService: CommissionService,
    private readonly leadService: LeadService,
    private readonly notificationService: MarketerNotificationService,
  ) {}

  @OnEvent('booking.completed')
  async handleBookingCompleted(payload: BookingCompletedEvent): Promise<void> {
    this.logger.log(`Processing commission for booking ${payload.bookingId}`);

    // Only commission if payment confirmed and collector assigned
    if (payload.paymentStatus !== 'PAID') {
      this.logger.log(`Skipping commission - payment not confirmed for booking ${payload.bookingId}`);
      return;
    }

    // Find lead for this user
    const lead = await this.leadRepo.findOne({
      where: { 
        registeredUserId: payload.userId,
        type: 'HOUSEHOLD' as any,
        status: LeadStatus.REGISTERED,
      },
      relations: ['marketer'],
    });

    if (!lead) {
      this.logger.log(`No active lead found for user ${payload.userId}`);
      return;
    }

    // Skip commission if lead has no campaign (cannot be approved)
    if (!lead.campaignId) {
      this.logger.log(`Lead ${lead.id} has no campaignId - skipping commission creation`);
      return;
    }

    // Get marketer profile
    const profile = await this.profileRepo.findOne({
      where: { userId: lead.marketerId },
    });

    if (!profile) {
      this.logger.error(`Marketer profile not found for user ${lead.marketerId}`);
      return;
    }

    // Get eligible schemes
    const schemes = await this.commissionService.getEligibleSchemes(
      profile.id,
      'HOUSEHOLD_ONBOARDING',
    );

    if (schemes.length === 0) {
      this.logger.log(`No eligible schemes for marketer ${profile.id}`);
      return;
    }

    // Use first eligible scheme (could be enhanced to select best scheme)
    const scheme = schemes[0];

    // Calculate amount
    let amount = 0;
    if (scheme.commissionType === 'FIXED') {
      amount = parseFloat(scheme.amount.toString());
    } else {
      // Percentage of booking amount
      amount = (parseFloat(scheme.amount.toString()) / 100) * payload.amount;
    }

    // Idempotency: check if commission already exists for this lead + trigger + reference
    const existing = await this.transactionRepo.findOne({
      where: { leadId: lead.id, triggerType: TriggerType.FIRST_SUCCESSFUL_BOOKING, referenceId: payload.bookingId },
    });
    if (existing) {
      this.logger.log(`Commission already exists for booking ${payload.bookingId}, skipping`);
      return;
    }

    // Mark lead as qualified first
    await this.leadService.markLeadQualified(lead.id);

    // Create commission transaction
    const transaction = this.transactionRepo.create({
      marketerProfileId: profile.id,
      schemeId: scheme.id,
      leadId: lead.id,
      triggerType: TriggerType.FIRST_SUCCESSFUL_BOOKING,
      referenceId: payload.bookingId,
      referenceType: 'booking',
      amount,
      status: CommissionStatus.PENDING,
      campaignId: lead.campaignId, // Copy campaignId from lead
      description: `Commission for household booking #${payload.bookingId}`,
    });

    const saved = await this.transactionRepo.save(transaction);

    // Update marketer pending amount
    profile.pendingAmount += amount;
    await this.profileRepo.save(profile);

    this.logger.log(`Created commission ${saved.id} for ${amount} XAF`);
  }

  @OnEvent('job.completed')
  async handleJobCompleted(payload: JobCompletedEvent): Promise<void> {
    this.logger.log(`Processing commission for job ${payload.jobId}`);

    // Find lead for this collector
    const lead = await this.leadRepo.findOne({
      where: { 
        registeredUserId: payload.collectorId,
        type: 'COLLECTOR' as any,
        status: LeadStatus.REGISTERED,
      },
      relations: ['marketer'],
    });

    if (!lead) {
      this.logger.log(`No active lead found for collector ${payload.collectorId}`);
      return;
    }

    // Skip commission if lead has no campaign (cannot be approved)
    if (!lead.campaignId) {
      this.logger.log(`Lead ${lead.id} has no campaignId - skipping commission creation`);
      return;
    }

    // Get marketer profile
    const profile = await this.profileRepo.findOne({
      where: { userId: lead.marketerId },
    });

    if (!profile) {
      this.logger.error(`Marketer profile not found for user ${lead.marketerId}`);
      return;
    }

    // Get eligible schemes
    const schemes = await this.commissionService.getEligibleSchemes(
      profile.id,
      'COLLECTOR_ONBOARDING',
    );

    if (schemes.length === 0) {
      this.logger.log(`No eligible schemes for marketer ${profile.id}`);
      return;
    }

    // Use first eligible scheme
    const scheme = schemes[0];

    // Calculate amount
    const amount = parseFloat(scheme.amount.toString());

    // Idempotency check
    const existing = await this.transactionRepo.findOne({
      where: { leadId: lead.id, triggerType: TriggerType.FIRST_PICKUP_COMPLETED, referenceId: payload.jobId },
    });
    if (existing) {
      this.logger.log(`Commission already exists for job ${payload.jobId}, skipping`);
      return;
    }

    // Mark lead as qualified
    await this.leadService.markLeadQualified(lead.id);

    // Create commission transaction
    const transaction = this.transactionRepo.create({
      marketerProfileId: profile.id,
      schemeId: scheme.id,
      leadId: lead.id,
      triggerType: TriggerType.FIRST_PICKUP_COMPLETED,
      referenceId: payload.jobId,
      referenceType: 'job',
      amount,
      status: CommissionStatus.PENDING,
      campaignId: lead.campaignId, // Copy campaignId from lead
      description: `Commission for collector first pickup #${payload.jobId}`,
    });

    const saved = await this.transactionRepo.save(transaction);

    // Update marketer pending amount
    profile.pendingAmount += amount;
    await this.profileRepo.save(profile);

    this.logger.log(`Created commission ${saved.id} for ${amount} XAF`);
  }

  @OnEvent('subscription.paid')
  async handleSubscriptionPaid(payload: SubscriptionPaidEvent): Promise<void> {
    this.logger.log(`Processing commission for subscription ${payload.subscriptionId}`);

    // Find lead for this user
    const lead = await this.leadRepo.findOne({
      where: { 
        registeredUserId: payload.userId,
        type: 'HOUSEHOLD' as any,
        status: LeadStatus.QUALIFIED, // Must be qualified first
      },
      relations: ['marketer'],
    });

    if (!lead) {
      this.logger.log(`No qualified lead found for user ${payload.userId}`);
      return;
    }

    // Skip commission if lead has no campaign (cannot be approved)
    if (!lead.campaignId) {
      this.logger.log(`Lead ${lead.id} has no campaignId - skipping commission creation`);
      return;
    }

    // Get marketer profile
    const profile = await this.profileRepo.findOne({
      where: { userId: lead.marketerId },
    });

    if (!profile) {
      this.logger.error(`Marketer profile not found for user ${lead.marketerId}`);
      return;
    }

    // Get eligible schemes
    const schemes = await this.commissionService.getEligibleSchemes(
      profile.id,
      'SUBSCRIPTION_PAYMENT',
    );

    if (schemes.length === 0) {
      this.logger.log(`No eligible schemes for marketer ${profile.id}`);
      return;
    }

    // Use first eligible scheme
    const scheme = schemes[0];

    // Calculate amount (always percentage for subscriptions)
    const percentage = parseFloat(scheme.amount.toString());
    const amount = (percentage / 100) * payload.amount;

    // Idempotency check
    const existing = await this.transactionRepo.findOne({
      where: { leadId: lead.id, triggerType: TriggerType.SUBSCRIPTION_PAID, referenceId: payload.subscriptionId },
    });
    if (existing) {
      this.logger.log(`Commission already exists for subscription ${payload.subscriptionId}, skipping`);
      return;
    }

    // Create commission transaction
    const transaction = this.transactionRepo.create({
      marketerProfileId: profile.id,
      schemeId: scheme.id,
      leadId: lead.id,
      triggerType: TriggerType.SUBSCRIPTION_PAID,
      referenceId: payload.subscriptionId,
      referenceType: 'subscription',
      amount,
      status: CommissionStatus.PENDING,
      campaignId: lead.campaignId, // Copy campaignId from lead
      description: `Commission for subscription #${payload.subscriptionId} (${percentage}% of ${payload.amount} XAF)`,
    });

    const saved = await this.transactionRepo.save(transaction);

    // Update marketer pending amount
    profile.pendingAmount += amount;
    await this.profileRepo.save(profile);

    this.logger.log(`Created commission ${saved.id} for ${amount} XAF`);
  }
}
