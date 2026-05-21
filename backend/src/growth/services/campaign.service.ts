import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  MarketingCampaign,
  CampaignMarketerAssignment,
  CampaignCommissionScheme,
  CampaignStatus,
  BudgetPeriodStatus,
} from '../entities';
import { CreateCampaignDto, UpdateCampaignDto, AssignMarketersDto, AssignSchemesDto } from '../dto';

@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(MarketingCampaign)
    private readonly campaignRepo: Repository<MarketingCampaign>,
    @InjectRepository(CampaignMarketerAssignment)
    private readonly assignmentRepo: Repository<CampaignMarketerAssignment>,
    @InjectRepository(CampaignCommissionScheme)
    private readonly schemeAssignmentRepo: Repository<CampaignCommissionScheme>,
  ) {}

  async createCampaign(dto: CreateCampaignDto, createdBy: string): Promise<MarketingCampaign> {
    // Validate campaign dates fall within budget period dates
    const budgetPeriodId = dto.budgetPeriodId;
    // Note: We'll validate dates in the controller after fetching the budget period

    const campaign = this.campaignRepo.create({
      ...dto,
      createdBy,
      committedAmount: 0,
      spentAmount: 0,
    });
    return this.campaignRepo.save(campaign);
  }

  async findAllCampaigns(filters?: {
    status?: CampaignStatus;
    territory?: string;
    budgetPeriodId?: string;
  }): Promise<MarketingCampaign[]> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.territory) where.territory = filters.territory;
    if (filters?.budgetPeriodId) where.budgetPeriodId = filters.budgetPeriodId;

    return this.campaignRepo.find({
      where,
      relations: ['budgetPeriod'],
      order: { createdAt: 'DESC' },
    });
  }

  async findCampaignById(id: string): Promise<MarketingCampaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id },
      relations: ['budgetPeriod', 'marketerAssignments', 'marketerAssignments.marketerProfile'],
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto): Promise<MarketingCampaign> {
    const campaign = await this.findCampaignById(id);

    // If budget period is being changed, validate dates
    if (dto.budgetPeriodId && dto.budgetPeriodId !== campaign.budgetPeriodId) {
      // Note: We'll validate dates in the controller after fetching the budget period
    }

    Object.assign(campaign, dto);
    return this.campaignRepo.save(campaign);
  }

  async activateCampaign(id: string): Promise<MarketingCampaign> {
    const campaign = await this.findCampaignById(id);
    
    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is already active');
    }

    if (campaign.budgetPeriod.status !== BudgetPeriodStatus.ACTIVE) {
      throw new BadRequestException('Cannot activate campaign with inactive budget period');
    }

    campaign.status = CampaignStatus.ACTIVE;
    return this.campaignRepo.save(campaign);
  }

  async pauseCampaign(id: string): Promise<MarketingCampaign> {
    const campaign = await this.findCampaignById(id);
    
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Only active campaigns can be paused');
    }

    campaign.status = CampaignStatus.PAUSED;
    return this.campaignRepo.save(campaign);
  }

  async endCampaign(id: string): Promise<MarketingCampaign> {
    const campaign = await this.findCampaignById(id);
    
    if (campaign.status === CampaignStatus.ENDED || campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Campaign is already ended or cancelled');
    }

    campaign.status = CampaignStatus.ENDED;
    return this.campaignRepo.save(campaign);
  }

  async cancelCampaign(id: string): Promise<MarketingCampaign> {
    const campaign = await this.findCampaignById(id);
    
    if (campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Campaign is already cancelled');
    }

    campaign.status = CampaignStatus.CANCELLED;
    return this.campaignRepo.save(campaign);
  }

  async assignMarketers(campaignId: string, dto: AssignMarketersDto, assignedBy: string): Promise<void> {
    const campaign = await this.findCampaignById(campaignId);

    for (const marketerProfileId of dto.marketerProfileIds) {
      const existing = await this.assignmentRepo.findOne({
        where: { campaignId, marketerProfileId },
      });

      if (existing) {
        existing.isActive = true;
        existing.assignedBy = assignedBy;
        existing.assignedAt = new Date();
        await this.assignmentRepo.save(existing);
      } else {
        const assignment = this.assignmentRepo.create({
          campaignId,
          marketerProfileId,
          assignedBy,
          isActive: true,
        });
        await this.assignmentRepo.save(assignment);
      }
    }
  }

  async removeMarketerAssignment(campaignId: string, marketerProfileId: string): Promise<void> {
    const assignment = await this.assignmentRepo.findOne({
      where: { campaignId, marketerProfileId },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    assignment.isActive = false;
    await this.assignmentRepo.save(assignment);
  }

  async assignSchemes(campaignId: string, dto: AssignSchemesDto): Promise<void> {
    const campaign = await this.findCampaignById(campaignId);

    for (const schemeId of dto.schemeIds) {
      const existing = await this.schemeAssignmentRepo.findOne({
        where: { campaignId, schemeId },
      });

      if (!existing) {
        const assignment = this.schemeAssignmentRepo.create({
          campaignId,
          schemeId,
          isActive: true,
        });
        await this.schemeAssignmentRepo.save(assignment);
      }
    }
  }

  async removeSchemeAssignment(campaignId: string, schemeId: string): Promise<void> {
    await this.schemeAssignmentRepo.delete({ campaignId, schemeId });
  }

  async getActiveCampaignsForMarketer(marketerProfileId: string): Promise<MarketingCampaign[]> {
    const assignments = await this.assignmentRepo.find({
      where: { marketerProfileId, isActive: true },
      relations: ['campaign'],
    });

    const activeCampaigns = assignments
      .map(a => a.campaign)
      .filter(c => c.status === CampaignStatus.ACTIVE);

    return activeCampaigns;
  }

  async getCampaignPerformance(campaignId: string): Promise<any> {
    const campaign = await this.findCampaignById(campaignId);
    
    // Note: This will be expanded to include lead, commission, and conversion stats
    return {
      campaign,
      budgetUsage: {
        total: campaign.budgetAmount,
        committed: campaign.committedAmount,
        spent: campaign.spentAmount,
        remaining: campaign.budgetAmount - campaign.committedAmount - campaign.spentAmount,
        usagePct: ((campaign.committedAmount + campaign.spentAmount) / campaign.budgetAmount) * 100,
      },
    };
  }
}
