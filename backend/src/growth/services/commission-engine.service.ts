import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus, CommissionTransaction, CommissionStatus, TriggerType, MarketerProfile } from '../entities';
import { CommissionService } from './commission.service';
import { LeadService } from './lead.service';
import { MarketerNotificationService } from './marketer-notification.service';
import { Job } from '../../jobs/entities/job.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { JobEventPayload, JobEvents } from '../../events/events.types';

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
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly commissionService: CommissionService,
    private readonly leadService: LeadService,
    private readonly notificationService: MarketerNotificationService,
  ) {}

  @OnEvent(JobEvents.VALIDATED)
  async handleJobValidated(payload: JobEventPayload): Promise<void> {
    this.logger.log(`Processing commission for validated job ${payload.jobId}`);

    // Find lead for this household (first successful pickup)
    const lead = await this.leadRepo.findOne({
      where: {
        registeredUserId: payload.householdId,
        type: 'HOUSEHOLD' as any,
        status: LeadStatus.REGISTERED,
      },
      relations: ['marketer'],
    });

    if (!lead) {
      this.logger.log(`No active lead found for household ${payload.householdId}`);
      return;
    }

    // Skip commission if lead has no campaign (cannot be approved)
    if (!lead.campaignId) {
      this.logger.log(`Lead ${lead.id} has no campaignId - skipping commission creation`);
      return;
    }

    // Check if job has payment - only commission if payment is verified/confirmed
    // Note: For household jobs, payment should be VERIFIED before commission is awarded
    const job = await this.jobRepo.findOne({
      where: { id: payload.jobId },
    });
    if (!job) {
      this.logger.error(`Job ${payload.jobId} not found`);
      return;
    }
    if (job.paymentStatus !== PaymentStatus.VERIFIED && job.paymentStatus !== PaymentStatus.NOT_REQUIRED) {
      this.logger.log(`Skipping commission - payment not verified for job ${payload.jobId}, status: ${job.paymentStatus}`);
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

    // Get eligible schemes for first successful pickup
    const schemes = await this.commissionService.getEligibleSchemes(
      profile.id,
      'HOUSEHOLD_ONBOARDING',
    );

    if (schemes.length === 0) {
      this.logger.log(`No eligible schemes for marketer ${profile.id}`);
      return;
    }

    // Use first eligible scheme
    const scheme = schemes[0];

    // Calculate amount
    let amount = 0;
    if (scheme.commissionType === 'FIXED') {
      amount = parseFloat(scheme.amount.toString());
    } else {
      // Percentage - use default 1000 XAF as base for pickup
      amount = (parseFloat(scheme.amount.toString()) / 100) * 1000;
    }

    // Idempotency check
    const existing = await this.transactionRepo.findOne({
      where: { leadId: lead.id, triggerType: TriggerType.FIRST_SUCCESSFUL_BOOKING, referenceId: payload.jobId },
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
      triggerType: TriggerType.FIRST_SUCCESSFUL_BOOKING,
      referenceId: payload.jobId,
      referenceType: 'job',
      amount,
      status: CommissionStatus.PENDING,
      campaignId: lead.campaignId,
      description: `Commission for household first successful pickup #${payload.jobId}`,
    });

    const saved = await this.transactionRepo.save(transaction);

    // Update marketer pending amount
    profile.pendingAmount += amount;
    await this.profileRepo.save(profile);

    this.logger.log(`Created commission ${saved.id} for ${amount} XAF`);
  }

  @OnEvent(JobEvents.COMPLETED)
  async handleJobCompleted(payload: JobEventPayload): Promise<void> {
    this.logger.log(`Processing commission for job ${payload.jobId}`);

    if (!payload.collectorId) {
      this.logger.log(`No collectorId in payload for job ${payload.jobId}`);
      return;
    }

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

    // Check if job has payment - only commission if payment is verified/confirmed
    // Note: For collector jobs, payment should be VERIFIED before commission is awarded
    const job = await this.jobRepo.findOne({
      where: { id: payload.jobId },
    });
    if (!job) {
      this.logger.error(`Job ${payload.jobId} not found`);
      return;
    }
    if (job.paymentStatus !== PaymentStatus.VERIFIED && job.paymentStatus !== PaymentStatus.NOT_REQUIRED) {
      this.logger.log(`Skipping commission - payment not verified for job ${payload.jobId}, status: ${job.paymentStatus}`);
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
}
