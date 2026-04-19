import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
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

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  @Get('jobs/:id')
  getJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getJob(id);
  }

  // ─── MANUAL ASSIGNMENT ────────────────────────────────────────

  @Post('jobs/:id/assign')
  manualAssign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualAssignDto,
  ) {
    return this.adminService.manualAssign(id, dto.collectorId);
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
    return this.adminService.listFraudFlags(
      Object.keys(filters).length ? filters : undefined,
    );
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
  ) {
    return this.adminService.updateConfig(key, body.value, adminId);
  }

  // ─── STATS & PERFORMANCE ──────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('collectors/performance')
  getCollectorPerformance(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getCollectorPerformance(limit);
  }
}
