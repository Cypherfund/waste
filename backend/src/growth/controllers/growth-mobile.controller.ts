import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import {
  LeadService,
  MarketerService,
  CommissionService,
  MarketerPayoutService,
  MarketerNotificationService,
  CampaignService,
  CommissionEngineService,
} from '../services';
import { CreateLeadDto, CreatePayoutRequestDto } from '../dto';
import { LeadStatus } from '../entities';

@ApiTags('Growth Mobile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MARKETER)
@Controller('marketer')
export class GrowthMobileController {
  constructor(
    private readonly leadService: LeadService,
    private readonly marketerService: MarketerService,
    private readonly commissionService: CommissionService,
    private readonly payoutService: MarketerPayoutService,
    private readonly notificationService: MarketerNotificationService,
    private readonly campaignService: CampaignService,
    private readonly commissionEngineService: CommissionEngineService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get marketer dashboard stats' })
  async getDashboard(@Request() req: any) {
    const profile = await this.marketerService.findByUserId(req.user.sub);
    const leads = await this.leadService.getMarketerLeads(req.user.sub);
    const commissions = await this.commissionService.getMarketerCommissions(profile.id);

    // Calculate today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLeads = leads.filter((l) => new Date(l.createdAt) >= today).length;
    const todayQualified = leads.filter(
      (l) => l.qualifiedAt && new Date(l.qualifiedAt) >= today,
    ).length;

    return {
      profile: {
        id: profile.id,
        referralCode: profile.referralCode,
        territory: profile.territory,
        status: profile.status,
      },
      todayStats: {
        leadsCreated: todayLeads,
        leadsQualified: todayQualified,
      },
      totals: {
        totalLeads: profile.totalLeads,
        totalRegistered: profile.totalRegistered,
        totalQualified: profile.totalQualified,
        totalExpired: profile.totalExpired,
        conversionRate: profile.conversionRate,
        qualificationRate: profile.qualificationRate,
      },
      commissions: {
        pending: parseFloat(profile.pendingAmount as any),
        approved: parseFloat(profile.approvedAmount as any),
        paid: parseFloat(profile.totalPaid as any),
        totalEarned: parseFloat(profile.totalEarned as any),
      },
      recentLeads: leads.slice(0, 5),
    };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get marketer profile' })
  async getProfile(@Request() req: any) {
    const profile = await this.marketerService.findByUserId(req.user.sub);
    return this.marketerService.findById(profile.id);
  }

  @Get('campaigns/active')
  @ApiOperation({ summary: 'Get active campaigns for marketer' })
  async getActiveCampaigns(@Request() req: any) {
    const profile = await this.marketerService.findByUserId(req.user.sub);
    return this.campaignService.getActiveCampaignsForMarketer(profile.id);
  }

  // Leads
  @Post('leads')
  @ApiOperation({ summary: 'Create new lead' })
  async createLead(@Body() dto: CreateLeadDto, @Request() req: any) {
    return this.leadService.createLead(req.user.sub, dto);
  }

  @Get('leads')
  @ApiOperation({ summary: 'List my leads' })
  async listLeads(@Request() req: any, @Query('status') status?: LeadStatus) {
    return this.leadService.getMarketerLeads(req.user.sub, status);
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Get lead details' })
  async getLead(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.leadService.getLeadById(id, req.user.sub);
  }

  @Post('leads/:id/resend')
  @ApiOperation({ summary: 'Resend invite SMS' })
  async resendInvite(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.leadService.resendInvite(id, req.user.sub);
  }

  // Commissions
  @Get('commissions')
  @ApiOperation({ summary: 'Get my commissions' })
  async getCommissions(@Request() req: any) {
    const profile = await this.marketerService.findByUserId(req.user.sub);
    return this.commissionService.getMarketerCommissions(profile.id);
  }

  // Payouts
  @Post('payout-requests')
  @ApiOperation({ summary: 'Request payout' })
  async requestPayout(@Body() dto: CreatePayoutRequestDto, @Request() req: any) {
    const profile = await this.marketerService.findByUserId(req.user.sub);
    return this.payoutService.createPayoutRequest(profile.id, dto);
  }

  @Get('payout-requests')
  @ApiOperation({ summary: 'Get my payout requests' })
  async getPayouts(@Request() req: any) {
    const profile = await this.marketerService.findByUserId(req.user.sub);
    return this.payoutService.getMarketerPayouts(profile.id);
  }

  // Notifications
  @Get('notifications')
  @ApiOperation({ summary: 'Get my notifications' })
  async getNotifications(@Request() req: any, @Query('unreadOnly') unreadOnly?: boolean) {
    const profile = await this.marketerService.findByUserId(req.user.sub);
    return this.notificationService.getNotifications(profile.id, unreadOnly);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllNotificationsRead(@Request() req: any) {
    const profile = await this.marketerService.findByUserId(req.user.sub);
    return this.notificationService.markAllAsRead(profile.id);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Request() req: any) {
    const profile = await this.marketerService.findByUserId(req.user.sub);
    const count = await this.notificationService.getUnreadCount(profile.id);
    return { count };
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markNotificationRead(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const profile = await this.marketerService.findByUserId(req.user.sub);
    return this.notificationService.markAsRead(id, profile.id);
  }
}
