import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  MarketingCampaign,
  CampaignMarketerAssignment,
  CampaignCommissionScheme,
  CampaignStatus,
  BudgetPeriodStatus,
  MarketingBudgetPeriod,
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
    @InjectRepository(MarketingBudgetPeriod)
    private readonly budgetPeriodRepo: Repository<MarketingBudgetPeriod>,
  ) {}

  async createCampaign(dto: CreateCampaignDto, createdBy: string): Promise<MarketingCampaign> {
    // Validate campaign dates fall within budget period dates
    const budgetPeriod = await this.budgetPeriodRepo.findOne({
      where: { id: dto.budgetPeriodId },
    });

    if (!budgetPeriod) {
      throw new NotFoundException('Budget period not found');
    }

    const campaignStartDate = new Date(dto.startDate);
    const campaignEndDate = new Date(dto.endDate);
    const budgetStartDate = new Date(budgetPeriod.startDate);
    const budgetEndDate = new Date(budgetPeriod.endDate);

    if (campaignStartDate < budgetStartDate) {
      throw new BadRequestException('Campaign start date cannot be before budget period start date');
    }

    if (campaignEndDate > budgetEndDate) {
      throw new BadRequestException('Campaign end date cannot be after budget period end date');
    }

    // Validate campaign budget amount against remaining budget
    const remainingBudget = budgetPeriod.totalBudget - budgetPeriod.committedAmount - budgetPeriod.spentAmount;
    if (dto.budgetAmount > remainingBudget) {
      throw new BadRequestException(
        `Campaign budget amount (${dto.budgetAmount}) exceeds remaining budget period balance (${remainingBudget})`
      );
    }

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
    page?: number;
    limit?: number;
  }): Promise<{ data: MarketingCampaign[]; total: number; totalPages: number }> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.territory) where.territory = filters.territory;
    if (filters?.budgetPeriodId) where.budgetPeriodId = filters.budgetPeriodId;

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const [data, total] = await this.campaignRepo.findAndCount({
      where,
      relations: ['budgetPeriod'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, totalPages: Math.ceil(total / limit) };
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

    // If budget period is being changed, validate dates and budget
    if (dto.budgetPeriodId && dto.budgetPeriodId !== campaign.budgetPeriodId) {
      const newBudgetPeriod = await this.budgetPeriodRepo.findOne({
        where: { id: dto.budgetPeriodId },
      });

      if (!newBudgetPeriod) {
        throw new NotFoundException('Budget period not found');
      }

      const campaignStartDate = dto.startDate ? new Date(dto.startDate) : new Date(campaign.startDate);
      const campaignEndDate = dto.endDate ? new Date(dto.endDate) : new Date(campaign.endDate);
      const budgetStartDate = new Date(newBudgetPeriod.startDate);
      const budgetEndDate = new Date(newBudgetPeriod.endDate);

      if (campaignStartDate < budgetStartDate) {
        throw new BadRequestException('Campaign start date cannot be before budget period start date');
      }

      if (campaignEndDate > budgetEndDate) {
        throw new BadRequestException('Campaign end date cannot be after budget period end date');
      }

      // Validate campaign budget amount against remaining budget in new period
      const campaignBudget = dto.budgetAmount || campaign.budgetAmount;
      const remainingBudget = newBudgetPeriod.totalBudget - newBudgetPeriod.committedAmount - newBudgetPeriod.spentAmount;
      if (campaignBudget > remainingBudget) {
        throw new BadRequestException(
          `Campaign budget amount (${campaignBudget}) exceeds remaining budget period balance (${remainingBudget})`
        );
      }
    }

    // If dates are being changed, validate against current budget period
    if ((dto.startDate || dto.endDate) && !dto.budgetPeriodId) {
      const budgetPeriod = await this.budgetPeriodRepo.findOne({
        where: { id: campaign.budgetPeriodId },
      });

      if (budgetPeriod) {
        const campaignStartDate = dto.startDate ? new Date(dto.startDate) : new Date(campaign.startDate);
        const campaignEndDate = dto.endDate ? new Date(dto.endDate) : new Date(campaign.endDate);
        const budgetStartDate = new Date(budgetPeriod.startDate);
        const budgetEndDate = new Date(budgetPeriod.endDate);

        if (campaignStartDate < budgetStartDate) {
          throw new BadRequestException('Campaign start date cannot be before budget period start date');
        }

        if (campaignEndDate > budgetEndDate) {
          throw new BadRequestException('Campaign end date cannot be after budget period end date');
        }
      }
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
