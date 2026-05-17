import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan, In } from 'typeorm';
import { randomBytes } from 'crypto';
import { Lead, LeadStatus, LeadType, SMSSStatus, MarketerProfile, NotificationType } from '../entities';
import { CreateLeadDto } from '../dto';
import { SMSService } from './sms.service';
import { MarketerNotificationService } from './marketer-notification.service';

const DAILY_LEAD_LIMIT = 20;

@Injectable()
export class LeadService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(MarketerProfile)
    private readonly profileRepo: Repository<MarketerProfile>,
    private readonly smsService: SMSService,
    private readonly notificationService: MarketerNotificationService,
    private readonly dataSource: DataSource,
  ) {}

  private generateReferralToken(): string {
    return randomBytes(16).toString('hex');
  }

  private generateReferralCode(name: string): string {
    const namePart = name.replace(/[^a-zA-Z]/g, '').substring(0, 5).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `MKR-${namePart}-${random}`;
  }

  private async canCreateLead(marketerId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const profile = await this.profileRepo.findOne({
      where: { userId: marketerId },
    });

    if (!profile) {
      throw new NotFoundException('Marketer profile not found');
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const resetAt = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Reset counter if new day
    if (!profile.dailyLeadsResetAt || profile.dailyLeadsResetAt < startOfDay) {
      profile.dailyLeadsCreated = 0;
      profile.dailyLeadsResetAt = startOfDay;
      await this.profileRepo.save(profile);
    }

    const remaining = DAILY_LEAD_LIMIT - profile.dailyLeadsCreated;
    return {
      allowed: remaining > 0,
      remaining,
      resetAt,
    };
  }

  private async checkDuplicateActiveLead(phone: string): Promise<boolean> {
    const existing = await this.leadRepo.findOne({
      where: {
        phone,
        status: In([LeadStatus.INVITED, LeadStatus.REGISTERED]),
        expiresAt: MoreThan(new Date()),
      },
    });
    return !!existing;
  }

  async createLead(marketerId: string, dto: CreateLeadDto): Promise<Lead> {
    // Check for duplicate active lead
    const isDuplicate = await this.checkDuplicateActiveLead(dto.phone);
    if (isDuplicate) {
      throw new BadRequestException('An active lead already exists for this phone number');
    }

    // Get marketer profile for referral code
    const profile = await this.profileRepo.findOne({
      where: { userId: marketerId },
    });
    if (!profile) {
      throw new NotFoundException('Marketer profile not found');
    }

    // Atomically increment daily counter + totalLeads, only if under limit
    const result = await this.dataSource
      .createQueryBuilder()
      .update(MarketerProfile)
      .set({
        dailyLeadsCreated: () => '"dailyLeadsCreated" + 1',
        totalLeads: () => '"totalLeads" + 1',
      })
      .where('id = :id AND "dailyLeadsCreated" < :limit', {
        id: profile.id,
        limit: DAILY_LEAD_LIMIT,
      })
      .execute();

    if (result.affected === 0) {
      throw new ForbiddenException({
        message: `Daily limit reached. You can create up to ${DAILY_LEAD_LIMIT} leads per day.`,
        limit: DAILY_LEAD_LIMIT,
        remaining: 0,
      });
    }

    // Create lead
    const lead = this.leadRepo.create({
      marketerId,
      name: dto.name,
      phone: dto.phone,
      type: dto.type,
      area: dto.area || null,
      notes: dto.notes || null,
      source: dto.source || 'FIELD' as any,
      referralToken: this.generateReferralToken(),
      referralCode: this.generateReferralCode(dto.name),
      status: LeadStatus.INVITED,
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      smsStatus: SMSSStatus.PENDING,
      smsRetryCount: 0,
    });

    const savedLead = await this.leadRepo.save(lead);

    // Send SMS invite
    try {
      await this.sendInviteSMS(savedLead, profile.referralCode);
    } catch (error) {
      // Log but don't fail - SMS can be retried
      console.error('Failed to send SMS invite:', error);
    }

    return savedLead;
  }

  private async sendInviteSMS(lead: Lead, marketerCode: string): Promise<void> {
    if (lead.smsOptOut) {
      throw new BadRequestException('User has opted out of SMS');
    }

    const referralLink = `https://kmertrash.com/ref/${lead.referralToken}`;
    
    // Get marketer name
    const profile = await this.profileRepo.findOne({
      where: { userId: lead.marketerId },
      relations: ['user'],
    });
    const marketerName = profile?.user?.name || 'Your friend';

    // Bilingual message (English/French for Cameroon)
    const message = `Hello ${lead.name}! ${marketerName} invited you to KmerTrash - smart waste collection. Complete signup: ${referralLink} (expires in 7 days). Questions? Reply STOP to opt out. / Bonjour ${lead.name}! ${marketerName} vous invite sur KmerTrash. Inscription: ${referralLink} (expire dans 7 jours).`;

    // Send with retry
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this.smsService.send(lead.phone, message);
        
        lead.smsStatus = SMSSStatus.SENT;
        lead.smsSentAt = new Date();
        lead.smsProviderMessageId = result.messageId;
        lead.smsRetryCount = attempt;
        await this.leadRepo.save(lead);
        return;
      } catch (error) {
        lead.smsRetryCount = attempt + 1;
        if (attempt >= maxAttempts - 1) {
          lead.smsStatus = SMSSStatus.FAILED;
          await this.leadRepo.save(lead);
          throw error;
        }
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  async resendInvite(leadId: string, marketerId: string): Promise<Lead> {
    const lead = await this.leadRepo.findOne({
      where: { id: leadId, marketerId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.status === LeadStatus.REGISTERED || lead.status === LeadStatus.QUALIFIED) {
      throw new BadRequestException(`Cannot resend invite to ${lead.status.toLowerCase()} lead`);
    }

    // Generate new token (invalidates old one)
    lead.referralToken = this.generateReferralToken();
    lead.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    lead.smsRetryCount = 0;
    lead.status = LeadStatus.INVITED;
    
    await this.leadRepo.save(lead);

    // Send new SMS
    try {
      const profile = await this.profileRepo.findOne({
        where: { userId: marketerId },
      });
      await this.sendInviteSMS(lead, profile?.referralCode || '');
    } catch (error) {
      console.error('Failed to resend SMS invite:', error);
      throw error;
    }

    return lead;
  }

  async convertLeadToUser(leadId: string, userId: string): Promise<void> {
    const lead = await this.leadRepo.findOne({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.status !== LeadStatus.INVITED) {
      throw new BadRequestException('Lead is not in invited status');
    }

    lead.status = LeadStatus.REGISTERED;
    lead.registeredAt = new Date();
    lead.registeredUserId = userId;
    await this.leadRepo.save(lead);

    // Update marketer stats
    const profile = await this.profileRepo.findOne({
      where: { userId: lead.marketerId },
    });
    if (profile) {
      profile.totalRegistered++;
      profile.conversionRate = (profile.totalRegistered / profile.totalLeads) * 100;
      await this.profileRepo.save(profile);

      // Send notification
      await this.notificationService.sendNotification(
        profile.id,
        NotificationType.LEAD_REGISTERED,
        'Lead Registered! 🎉',
        `${lead.name} has completed signup. Great work!`,
        { leadId: lead.id },
      );
    }
  }

  async markLeadQualified(leadId: string): Promise<void> {
    const lead = await this.leadRepo.findOne({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.status !== LeadStatus.REGISTERED) {
      throw new BadRequestException('Lead must be registered before qualifying');
    }

    lead.status = LeadStatus.QUALIFIED;
    lead.qualifiedAt = new Date();
    await this.leadRepo.save(lead);

    // Update marketer stats
    const profile = await this.profileRepo.findOne({
      where: { userId: lead.marketerId },
    });
    if (profile) {
      profile.totalQualified++;
      profile.qualificationRate = profile.totalRegistered > 0
        ? (profile.totalQualified / profile.totalRegistered) * 100
        : 0;
      await this.profileRepo.save(profile);

      // Send notification
      await this.notificationService.sendNotification(
        profile.id,
        NotificationType.LEAD_QUALIFIED,
        'Lead Qualified! 🎉',
        `${lead.name} has made their first booking. Commission pending approval!`,
        { leadId: lead.id },
      );
    }
  }

  async findAllLeads(filters?: {
    status?: string;
    marketerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Lead[]; total: number }> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.marketerId) where.marketerId = filters.marketerId;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const [data, total] = await this.leadRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async expireLead(leadId: string): Promise<Lead> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    if (lead.status === LeadStatus.QUALIFIED) {
      throw new BadRequestException('Cannot expire a qualified lead');
    }
    lead.status = LeadStatus.EXPIRED;
    lead.expiresAt = new Date();

    const saved = await this.leadRepo.save(lead);

    // Update marketer stats
    const profile = await this.profileRepo.findOne({ where: { userId: lead.marketerId } });
    if (profile) {
      profile.totalExpired++;
      await this.profileRepo.save(profile);
    }

    return saved;
  }

  async findByReferralToken(token: string): Promise<Lead | null> {
    return this.leadRepo.findOne({
      where: { referralToken: token },
      relations: ['marketer'],
    });
  }

  async getMarketerLeads(marketerId: string, status?: LeadStatus): Promise<Lead[]> {
    const where: any = { marketerId };
    if (status) {
      where.status = status;
    }
    return this.leadRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async getLeadById(leadId: string, marketerId: string): Promise<Lead> {
    const lead = await this.leadRepo.findOne({
      where: { id: leadId, marketerId },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }

  async handleSMSDeliveryUpdate(providerMessageId: string, status: SMSSStatus): Promise<void> {
    const lead = await this.leadRepo.findOne({
      where: { smsProviderMessageId: providerMessageId },
    });
    if (lead) {
      lead.smsStatus = status;
      if (status === SMSSStatus.DELIVERED) {
        lead.smsDeliveredAt = new Date();
      }
      await this.leadRepo.save(lead);
    }
  }

  async handleIncomingSMS(phone: string, message: string): Promise<void> {
    const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'arret', 'desabonner', 'opt out'];
    
    if (optOutKeywords.some(k => message.toLowerCase().includes(k))) {
      await this.leadRepo.update(
        { phone },
        { smsOptOut: true, smsStatus: SMSSStatus.FAILED },
      );
      
      // Send confirmation
      await this.smsService.send(phone, 'You have opted out of KmerTrash messages. Reply START to resubscribe. / Vous vous êtes désabonné des messages KmerTrash. Répondez START pour vous réabonner.');
    }
  }
}
