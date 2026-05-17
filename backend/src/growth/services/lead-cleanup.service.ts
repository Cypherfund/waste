import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Lead, LeadStatus, MarketerProfile, SMSSStatus } from '../entities';

@Injectable()
export class LeadCleanupService {
  private readonly logger = new Logger(LeadCleanupService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(MarketerProfile)
    private readonly profileRepo: Repository<MarketerProfile>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireStaleLeads(): Promise<void> {
    this.logger.log('Running stale lead expiration job...');

    const now = new Date();
    
    // Find leads that have expired
    const expiredLeads = await this.leadRepo.find({
      where: {
        status: In([LeadStatus.INVITED, LeadStatus.REGISTERED]),
        expiresAt: LessThan(now),
      },
    });

    let expiredCount = 0;
    for (const lead of expiredLeads) {
      lead.status = LeadStatus.EXPIRED;
      await this.leadRepo.save(lead);

      // Update marketer stats
      const profile = await this.profileRepo.findOne({
        where: { userId: lead.marketerId },
      });
      
      if (profile) {
        profile.totalExpired++;
        await this.profileRepo.save(profile);
      }

      expiredCount++;
    }

    this.logger.log(`Expired ${expiredCount} stale leads`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyLeadLimits(): Promise<void> {
    this.logger.log('Resetting daily lead limits...');

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    await this.profileRepo.update(
      {},
      { 
        dailyLeadsCreated: 0, 
        dailyLeadsResetAt: startOfDay,
      },
    );

    this.logger.log('Daily lead limits reset');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async retryFailedSMS(): Promise<void> {
    this.logger.log('Retrying failed SMS sends...');

    const failedLeads = await this.leadRepo.find({
      where: {
        smsStatus: SMSSStatus.FAILED,
        smsRetryCount: LessThan(3),
        smsOptOut: false,
      },
    });

    // Note: Actual retry logic would require SMS service injection
    // For now, just log for monitoring
    if (failedLeads.length > 0) {
      this.logger.log(`Found ${failedLeads.length} leads with failed SMS for retry`);
    }
  }
}
