import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus, CommissionTransaction, CommissionStatus, TriggerType, MarketerProfile } from '../entities';
import { CommissionService } from './commission.service';
import { Job } from '../../jobs/entities/job.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { UserSubscription } from '../../subscriptions/entities/user-subscription.entity';

@Injectable()
export class CommissionReconciliationService {
  private readonly logger = new Logger(CommissionReconciliationService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(CommissionTransaction)
    private readonly transactionRepo: Repository<CommissionTransaction>,
    @InjectRepository(MarketerProfile)
    private readonly profileRepo: Repository<MarketerProfile>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(UserSubscription)
    private readonly subRepo: Repository<UserSubscription>,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * Reconcile household job validations that didn't get commissions
   * Finds validated jobs for registered household leads and creates missing commissions
   */
  async reconcileHouseholdJobCommissions(): Promise<{ processed: number; created: number; errors: number }> {
    this.logger.log('Starting household job commission reconciliation');
    let processed = 0;
    let created = 0;
    let errors = 0;

    try {
      // Find all registered household leads with campaigns
      const leads = await this.leadRepo.find({
        where: {
          type: 'HOUSEHOLD' as any,
          status: LeadStatus.REGISTERED,
        },
        relations: ['marketer'],
      });

      for (const lead of leads) {
        if (!lead.campaignId || !lead.registeredUserId) {
          continue;
        }

        processed++;

        try {
          // Get marketer profile
          const profile = await this.profileRepo.findOne({
            where: { userId: lead.marketerId },
          });

          if (!profile) {
            this.logger.warn(`Marketer profile not found for user ${lead.marketerId}`);
            continue;
          }

          // Get eligible schemes
          const schemes = await this.commissionService.getEligibleSchemes(
            profile.id,
            'HOUSEHOLD_ONBOARDING',
          );

          if (schemes.length === 0) {
            this.logger.log(`No eligible schemes for marketer ${profile.id}`);
            continue;
          }

          const scheme = schemes[0];

          // Find validated jobs for this household that don't have commissions
          const jobs = await this.jobRepo
            .createQueryBuilder('job')
            .where('job.householdId = :householdId', { householdId: lead.registeredUserId })
            .andWhere('job.status = :status', { status: 'COMPLETED' })
            .andWhere('job.paymentStatus IN (:...statuses)', { 
              statuses: [PaymentStatus.VERIFIED, PaymentStatus.NOT_REQUIRED] 
            })
            .getMany();

          for (const job of jobs) {
            // Check if commission already exists
            const existing = await this.transactionRepo.findOne({
              where: {
                leadId: lead.id,
                triggerType: TriggerType.FIRST_SUCCESSFUL_BOOKING,
                referenceId: job.id,
              },
            });

            if (existing) {
              continue;
            }

            // Calculate amount
            let amount = 0;
            if (scheme.commissionType === 'FIXED') {
              amount = parseFloat(scheme.amount.toString());
            } else {
              amount = (parseFloat(scheme.amount.toString()) / 100) * 1000;
            }

            // Create commission
            const transaction = this.transactionRepo.create({
              marketerProfileId: profile.id,
              schemeId: scheme.id,
              leadId: lead.id,
              triggerType: TriggerType.FIRST_SUCCESSFUL_BOOKING,
              referenceId: job.id,
              referenceType: 'job',
              amount,
              status: CommissionStatus.PENDING,
              campaignId: lead.campaignId,
              description: `Reconciled commission for household job #${job.id}`,
            });

            await this.transactionRepo.save(transaction);

            // Update marketer pending amount
            profile.pendingAmount += amount;
            await this.profileRepo.save(profile);

            created++;
            this.logger.log(`Created reconciled commission for job ${job.id}: ${amount} XAF`);
          }
        } catch (err) {
          errors++;
          this.logger.error(`Error processing lead ${lead.id}: ${err.message}`);
        }
      }
    } catch (err) {
      this.logger.error(`Reconciliation failed: ${err.message}`);
      throw err;
    }

    this.logger.log(`Reconciliation complete: processed=${processed}, created=${created}, errors=${errors}`);
    return { processed, created, errors };
  }

  /**
   * Reconcile subscription payments that didn't get commissions
   * Finds active subscriptions for registered household leads and creates missing commissions
   */
  async reconcileSubscriptionCommissions(): Promise<{ processed: number; created: number; errors: number }> {
    this.logger.log('Starting subscription commission reconciliation');
    let processed = 0;
    let created = 0;
    let errors = 0;

    try {
      // Find all registered household leads with campaigns
      const leads = await this.leadRepo.find({
        where: {
          type: 'HOUSEHOLD' as any,
          status: LeadStatus.REGISTERED,
        },
        relations: ['marketer'],
      });

      for (const lead of leads) {
        if (!lead.campaignId || !lead.registeredUserId) {
          continue;
        }

        processed++;

        try {
          // Get marketer profile
          const profile = await this.profileRepo.findOne({
            where: { userId: lead.marketerId },
          });

          if (!profile) {
            this.logger.warn(`Marketer profile not found for user ${lead.marketerId}`);
            continue;
          }

          // Get eligible schemes
          const schemes = await this.commissionService.getEligibleSchemes(
            profile.id,
            'SUBSCRIPTION_PAYMENT',
          );

          if (schemes.length === 0) {
            this.logger.log(`No eligible schemes for marketer ${profile.id}`);
            continue;
          }

          const scheme = schemes[0];

          // Find subscriptions for this household that don't have commissions
          const subscriptions = await this.subRepo.find({
            where: { userId: lead.registeredUserId },
            relations: ['plan'],
          });

          for (const sub of subscriptions) {
            // Check if commission already exists
            const existing = await this.transactionRepo.findOne({
              where: {
                leadId: lead.id,
                triggerType: TriggerType.SUBSCRIPTION_PAID,
                referenceId: sub.id,
              },
            });

            if (existing) {
              continue;
            }

            // Calculate amount
            let amount = 0;
            if (scheme.commissionType === 'FIXED') {
              amount = parseFloat(scheme.amount.toString());
            } else {
              amount = (parseFloat(scheme.amount.toString()) / 100) * sub.plan.price;
            }

            // Create commission
            const transaction = this.transactionRepo.create({
              marketerProfileId: profile.id,
              schemeId: scheme.id,
              leadId: lead.id,
              triggerType: TriggerType.SUBSCRIPTION_PAID,
              referenceId: sub.id,
              referenceType: 'subscription',
              amount,
              status: CommissionStatus.PENDING,
              campaignId: lead.campaignId,
              description: `Reconciled commission for subscription #${sub.id}`,
            });

            await this.transactionRepo.save(transaction);

            // Update marketer pending amount
            profile.pendingAmount += amount;
            await this.profileRepo.save(profile);

            created++;
            this.logger.log(`Created reconciled commission for subscription ${sub.id}: ${amount} XAF`);
          }
        } catch (err) {
          errors++;
          this.logger.error(`Error processing lead ${lead.id}: ${err.message}`);
        }
      }
    } catch (err) {
      this.logger.error(`Reconciliation failed: ${err.message}`);
      throw err;
    }

    this.logger.log(`Reconciliation complete: processed=${processed}, created=${created}, errors=${errors}`);
    return { processed, created, errors };
  }

  /**
   * Run all reconciliation routines
   */
  async reconcileAll(): Promise<{
    householdJobs: { processed: number; created: number; errors: number };
    subscriptions: { processed: number; created: number; errors: number };
  }> {
    this.logger.log('Running full commission reconciliation');

    const householdJobs = await this.reconcileHouseholdJobCommissions();
    const subscriptions = await this.reconcileSubscriptionCommissions();

    return { householdJobs, subscriptions };
  }
}
