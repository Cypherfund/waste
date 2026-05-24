import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { LeadService, MarketerService, CommissionService, MarketerPayoutService, MarketerNotificationService, CommissionReconciliationService } from '../services';
import { CreateMarketerDto, CreateSchemeDto, ApproveCommissionDto, RejectCommissionDto } from '../dto';
import { CommissionStatus, PayoutStatus } from '../entities';

@ApiTags('Growth Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/growth')
export class GrowthAdminController {
  constructor(
    private readonly marketerService: MarketerService,
    private readonly leadService: LeadService,
    private readonly commissionService: CommissionService,
    private readonly payoutService: MarketerPayoutService,
    private readonly notificationService: MarketerNotificationService,
    private readonly reconciliationService: CommissionReconciliationService,
  ) {}

  // Marketers
  @Post('marketers')
  @ApiOperation({ summary: 'Create new marketer' })
  async createMarketer(@Body() dto: CreateMarketerDto, @Request() req: any) {
    return this.marketerService.createMarketer(dto, req.user.sub);
  }

  @Get('marketers')
  @ApiOperation({ summary: 'List all marketers' })
  async listMarketers(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.marketerService.findAll({ status, page, limit });
  }

  @Get('marketers/:id')
  @ApiOperation({ summary: 'Get marketer details' })
  async getMarketer(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketerService.findById(id);
  }

  @Post('marketers/:id/suspend')
  @ApiOperation({ summary: 'Suspend marketer' })
  async suspendMarketer(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketerService.suspendMarketer(id);
  }

  @Post('marketers/:id/activate')
  @ApiOperation({ summary: 'Activate marketer' })
  async activateMarketer(@Param('id', ParseUUIDPipe) id: string) {
    return this.marketerService.activateMarketer(id);
  }

  // Leads
  @Get('leads')
  @ApiOperation({ summary: 'List all leads' })
  async listLeads(
    @Query('status') status?: string,
    @Query('marketerId') marketerId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.leadService.findAllLeads({ status, marketerId, page, limit });
  }

  @Post('leads/:id/expire')
  @ApiOperation({ summary: 'Expire a lead manually' })
  async expireLead(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadService.expireLead(id);
  }

  @Post('leads/:id/resend-whatsapp')
  @ApiOperation({ summary: 'Resend failed lead invite via WhatsApp' })
  async resendViaWhatsApp(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadService.adminResendViaWhatsApp(id);
  }

  // Commission Schemes
  @Post('commission-schemes')
  @ApiOperation({ summary: 'Create commission scheme' })
  async createScheme(@Body() dto: CreateSchemeDto) {
    return this.commissionService.createScheme(dto);
  }

  @Get('commission-schemes')
  @ApiOperation({ summary: 'List all schemes' })
  async listSchemes() {
    return this.commissionService.findAllSchemes();
  }

  @Patch('commission-schemes/:id')
  @ApiOperation({ summary: 'Update scheme' })
  async updateScheme(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateSchemeDto>,
  ) {
    return this.commissionService.updateScheme(id, dto);
  }

  @Delete('commission-schemes/:id')
  @ApiOperation({ summary: 'Deactivate scheme' })
  async deactivateScheme(@Param('id', ParseUUIDPipe) id: string) {
    return this.commissionService.deactivateScheme(id);
  }

  // Commission Transactions
  @Get('commission-transactions')
  @ApiOperation({ summary: 'List commission transactions' })
  async listTransactions(
    @Query('status') status?: CommissionStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.commissionService.findTransactions({ status, page, limit });
  }

  @Post('commission-transactions/:id/approve')
  @ApiOperation({ summary: 'Approve commission' })
  async approveCommission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveCommissionDto,
    @Request() req: any,
  ) {
    return this.commissionService.approveTransaction(id, req.user.sub, dto);
  }

  @Post('commission-transactions/:id/reject')
  @ApiOperation({ summary: 'Reject commission' })
  async rejectCommission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectCommissionDto,
    @Request() req: any,
  ) {
    return this.commissionService.rejectTransaction(id, req.user.sub, dto);
  }

  // Payouts
  @Get('marketer-payouts')
  @ApiOperation({ summary: 'List payout requests' })
  async listPayouts(
    @Query('status') status?: PayoutStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.payoutService.findAll({ status, page, limit });
  }

  @Post('marketer-payouts/:id/approve')
  @ApiOperation({ summary: 'Approve payout request' })
  async approvePayout(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    return this.payoutService.approvePayout(id, req.user.sub);
  }

  @Post('marketer-payouts/:id/mark-paid')
  @ApiOperation({ summary: 'Mark payout as paid' })
  async markPayoutPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('paidReference') paidReference: string,
    @Request() req: any,
  ) {
    return this.payoutService.markAsPaid(id, req.user.sub, paidReference);
  }

  @Post('marketer-payouts/:id/reject')
  @ApiOperation({ summary: 'Reject payout request' })
  async rejectPayout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.payoutService.rejectPayout(id, req.user.sub, reason);
  }

  // Commission Reconciliation
  @Post('commissions/reconcile/household-jobs')
  @ApiOperation({ summary: 'Reconcile missing household job commissions' })
  async reconcileHouseholdJobs() {
    return this.reconciliationService.reconcileHouseholdJobCommissions();
  }

  @Post('commissions/reconcile/subscriptions')
  @ApiOperation({ summary: 'Reconcile missing subscription commissions' })
  async reconcileSubscriptions() {
    return this.reconciliationService.reconcileSubscriptionCommissions();
  }

  @Post('commissions/reconcile/all')
  @ApiOperation({ summary: 'Reconcile all missing commissions' })
  async reconcileAll() {
    return this.reconciliationService.reconcileAll();
  }
}
