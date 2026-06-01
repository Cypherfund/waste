import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Res,
  Req,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SystemCleanupService } from './services/system-cleanup.service';
import { OtpService } from '../auth/otp.service';
import { AdminAuditService } from './services/admin-audit.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { AdminUserFilterDto } from './dto/admin-user-filter.dto';
import { AdminJobFilterDto } from './dto/admin-job-filter.dto';
import { ManualAssignDto } from './dto/manual-assign.dto';
import { ResolveDisputeDto } from '../disputes/dto/resolve-dispute.dto';
import { ReviewFraudFlagDto } from '../fraud/dto/review-fraud-flag.dto';
import { DisputeStatus } from '../common/enums/dispute-status.enum';
import { FraudFlagStatus } from '../common/enums/fraud-type.enum';
import { FraudSeverity } from '../common/enums/fraud-severity.enum';
import { EarningStatus } from '../common/enums/earning-status.enum';
import { WalletService } from '../wallet/wallet.service';
import { PayoutRequestStatus } from '../wallet/entities/payout-request.entity';
import { CountriesService } from '../countries/countries.service';
import { PaymentService } from '../payments/payment.service';
import { AdminAuditAction } from './entities/admin-audit-log.entity';
import { AdminAuditEntityType } from './entities/admin-audit-log.entity';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly walletService: WalletService,
    private readonly countriesService: CountriesService,
    private readonly paymentService: PaymentService,
    private readonly systemCleanupService: SystemCleanupService,
    private readonly otpService: OtpService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  // ─── USERS ────────────────────────────────────────────────────

  @Get('users')
  listUsers(@Query() filters: AdminUserFilterDto) {
    return this.adminService.listUsers(filters);
  }

  @Get('users/:id')
  getUserDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id')
  updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() body: { isActive?: boolean },
  ) {
    if (body.isActive === false) {
      return this.adminService.deactivateUser(adminId, id);
    }
    if (body.isActive === true) {
      return this.adminService.activateUser(adminId, id);
    }
  }

  // ─── JOBS ─────────────────────────────────────────────────────

  @Get('jobs')
  listJobs(@Query() filters: AdminJobFilterDto) {
    return this.adminService.listJobs(filters);
  }

  @Get('jobs/pending-payment')
  listPendingPaymentJobs() {
    return this.adminService.listPendingPaymentJobs();
  }

  @Get('jobs/:id')
  getJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getJob(id);
  }

  // ─── MANUAL ASSIGNMENT ────────────────────────────────────────

  @Post('jobs/:id/assign')
  manualAssign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ManualAssignDto) {
    return this.adminService.manualAssign(id, dto.collectorId);
  }

  @Post('jobs/:id/reassign')
  manualReassign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ManualAssignDto) {
    return this.adminService.manualReassign(id, dto.collectorId);
  }

  // ─── PAYMENT VERIFICATION ──────────────────────────────────────

  @Patch('jobs/:id/verify-payment')
  verifyPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminService.verifyPayment(id, adminId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Patch('jobs/:id/reject-payment')
  rejectPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() body: { reason?: string },
    @Req() req: Request,
  ) {
    return this.adminService.rejectPayment(id, adminId, body.reason, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  // ─── DISPUTES ─────────────────────────────────────────────────

  @Get('disputes')
  listDisputes(@Query('status') status?: DisputeStatus) {
    return this.adminService.listDisputes(status ? { status } : undefined);
  }

  @Patch('disputes/:id')
  resolveDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.adminService.resolveDispute(id, adminId, dto);
  }

  // ─── FRAUD ────────────────────────────────────────────────────

  @Get('fraud-flags')
  listFraudFlags(
    @Query('status') status?: FraudFlagStatus,
    @Query('severity') severity?: FraudSeverity,
    @Query('collectorId') collectorId?: string,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (severity) filters.severity = severity;
    if (collectorId) filters.collectorId = collectorId;
    return this.adminService.listFraudFlags(Object.keys(filters).length ? filters : undefined);
  }

  @Patch('fraud-flags/:id')
  reviewFraudFlag(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() dto: ReviewFraudFlagDto,
  ) {
    return this.adminService.reviewFraudFlag(id, adminId, dto);
  }

  // ─── CONFIG ───────────────────────────────────────────────────

  @Get('config')
  listConfig(@Query('category') category?: string) {
    return this.adminService.listConfig(category);
  }

  @Put('config/:key')
  updateConfig(
    @Param('key') key: string,
    @CurrentUser('sub') adminId: string,
    @Body() body: { value: string },
    @Req() req: Request,
  ) {
    return this.adminService.updateConfig(key, body.value, adminId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  // ─── EARNINGS / PAYOUTS ────────────────────────────────────────

  @Get('earnings')
  listEarnings(
    @Query('status') status?: EarningStatus,
    @Query('collectorId') collectorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.adminService.listEarnings({ status, collectorId, from, to, page, limit });
  }

  @Get('earnings/export')
  async exportEarnings(
    @Query('status') status?: EarningStatus,
    @Query('collectorId') collectorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.adminService.exportEarningsCsv({ status, collectorId, from, to });
    res!.setHeader('Content-Type', 'text/csv');
    res!.setHeader('Content-Disposition', 'attachment; filename="earnings.csv"');
    res!.send(csv);
  }

  // ─── PAYOUT REQUESTS ────────────────────────────────────────────

  @Get('payouts')
  listPayouts(
    @Query('status') status?: PayoutRequestStatus,
    @Query('collectorId') collectorId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.walletService.adminListPayoutRequests({ status, collectorId, page, limit });
  }

  @Patch('payouts/:id')
  reviewPayout(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() body: { action: 'approve' | 'reject' | 'mark_paid'; adminNote?: string },
  ) {
    return this.walletService.adminReviewPayout(id, adminId, body.action, body.adminNote);
  }

  // ─── COUNTRIES ────────────────────────────────────────────────

  @Get('countries')
  listCountries() {
    return this.countriesService.listAll();
  }

  @Post('countries')
  createCountry(
    @Body()
    body: {
      countryCode: string;
      countryName: string;
      phonePrefix: string;
      flagEmoji?: string;
      currency: string;
      isActive?: boolean;
    },
  ) {
    return this.countriesService.create(body);
  }

  @Patch('countries/:code')
  toggleCountry(@Param('code') code: string, @Body() body: { isActive: boolean }) {
    return this.countriesService.setActive(code, body.isActive);
  }

  // ─── PAYMENT PROVIDERS ────────────────────────────────────────

  @Get('payments/providers')
  listProviders(@Query('countryCode') countryCode?: string) {
    return this.paymentService.listAllProviders(countryCode);
  }

  @Post('payments/providers/sync')
  syncProviders(@Query('countryCode') countryCode: string) {
    return this.paymentService.syncProviders(countryCode);
  }

  @Post('payments/providers')
  createProvider(
    @Body() body: Record<string, unknown>,
    @CurrentUser('sub') adminId: string,
    @Req() req: Request,
  ) {
    return this.paymentService.createProvider(body as any, adminId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Patch('payments/providers/:id')
  updateProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
    @CurrentUser('sub') adminId: string,
    @Req() req: Request,
  ) {
    return this.paymentService.updateProvider(id, body as any, adminId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Delete('payments/providers/:id')
  deleteProvider(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('sub') adminId: string,
    @Req() req: Request,
  ) {
    return this.paymentService.deleteProvider(id, adminId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  // ─── COLLECTOR FLOAT TOP-UP ──────────────────────────────────

  @Post('users/:id/float-topup')
  floatTopUp(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() body: { amount: number; note?: string },
    @Req() req: Request,
  ) {
    return this.walletService.adminFloatTopUp(id, body.amount, adminId, body.note, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  // ─── WALLET TOP-UP APPROVAL ───────────────────────────────────

  @Post('wallet-top-up/:id/approve')
  approveWalletTopUp(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Req() req: Request,
  ) {
    return this.adminService.approveWalletTopUp(id, adminId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Post('wallet-top-up/:id/reject')
  rejectWalletTopUp(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') adminId: string,
    @Body() body: { reason?: string },
    @Req() req: Request,
  ) {
    return this.adminService.rejectWalletTopUp(id, adminId, body.reason, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  // ─── STATS & PERFORMANCE ──────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('collectors/performance')
  getCollectorPerformance(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number) {
    return this.adminService.getCollectorPerformance(limit);
  }

  // ─── SYSTEM CLEANUP (Developer Tool) ───────────────────────────

  @Post('system-cleanup/analyze')
  analyzeCleanup(
    @Body() body: any,
    @CurrentUser('sub') adminId: string,
    @Req() req: Request,
  ) {
    return this.systemCleanupService.analyzeCleanup(body, adminId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Post('system-cleanup/execute')
  executeCleanup(
    @Body() body: any,
    @CurrentUser('sub') adminId: string,
    @Req() req: Request,
  ) {
    return this.systemCleanupService.executeCleanup(body, adminId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  @Get('system-cleanup/logs')
  getCleanupLogs() {
    return this.systemCleanupService.getLogs();
  }

  @Get('system-cleanup/logs/:id')
  getCleanupLog(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemCleanupService.getLog(id);
  }

  // ─── OTP LOOKUP (Support Tool) ─────────────────────────────────

  @Get('support/otp')
  async lookupOtp(
    @Query('phone') phone: string,
    @CurrentUser('sub') adminId: string,
    @Req() req: Request,
  ) {
    const result = await this.otpService.getRecentOtp(phone);

    // Log OTP lookup for security audit
    await this.adminAuditService.log({
      adminId,
      action: AdminAuditAction.OTP_LOOKUP,
      entityType: AdminAuditEntityType.OTP_LOOKUP,
      entityId: undefined,
      oldValue: undefined,
      newValue: { phone, expiresInSeconds: result.ttl },
      metadata: { expiresInMinutes: Math.ceil(result.ttl / 60) },
      context: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      },
    });

    return {
      phone: result.phone,
      otp: result.otp,
      expiresInSeconds: result.ttl,
      expiresInMinutes: Math.ceil(result.ttl / 60),
    };
  }
}
