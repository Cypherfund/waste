import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { CompleteJobDto } from './dto/complete-job.dto';
import { CancelJobDto } from './dto/cancel-job.dto';
import { RejectJobDto } from './dto/reject-job.dto';
import { JobResponseDto } from './dto/job-response.dto';
import { JobFilterDto } from './dto/job-filter.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/role.enum';
import { PaginatedResponse } from '../common/dto/pagination.dto';
import { RatingsService } from '../ratings/ratings.service';
import { CreateRatingDto, RatingResponseDto } from '../ratings/dto/create-rating.dto';
import { EarningsService } from '../earnings/earnings.service';
import { EarningsSummaryDto, EarningsQuickSummaryDto } from '../earnings/dto/earnings-summary.dto';
import { DisputesService } from '../disputes/disputes.service';
import { CreateDisputeDto } from '../disputes/dto/create-dispute.dto';
import { DisputeResponseDto } from '../disputes/dto/dispute-response.dto';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly ratingsService: RatingsService,
    private readonly earningsService: EarningsService,
    private readonly disputesService: DisputesService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new collection job (HOUSEHOLD only)' })
  @ApiResponse({ status: 201, description: 'Job created', type: JobResponseDto })
  @ApiResponse({ status: 403, description: 'Only households can create jobs' })
  @ApiResponse({ status: 409, description: 'Duplicate active job on same date' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateJobDto,
  ): Promise<JobResponseDto> {
    if (user.role !== UserRole.HOUSEHOLD) {
      throw new ForbiddenException('Only households can create jobs');
    }
    return this.jobsService.create(user.sub, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my jobs (HOUSEHOLD only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of household jobs' })
  async findMine(
    @CurrentUser() user: JwtPayload,
    @Query() filters: JobFilterDto,
  ): Promise<PaginatedResponse<JobResponseDto>> {
    if (user.role !== UserRole.HOUSEHOLD) {
      throw new ForbiddenException('Only households can access this endpoint');
    }
    return this.jobsService.findMyJobs(user.sub, filters);
  }

  @Get('assigned')
  @ApiOperation({ summary: 'Get jobs assigned to me (COLLECTOR only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of assigned jobs' })
  async findAssigned(
    @CurrentUser() user: JwtPayload,
    @Query() filters: JobFilterDto,
  ): Promise<PaginatedResponse<JobResponseDto>> {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can access this endpoint');
    }
    return this.jobsService.findAssigned(user.sub, filters);
  }

  // ─── EARNINGS (must be before :id to avoid route conflict) ────

  @Get('earnings')
  @ApiOperation({ summary: 'Get my earnings (COLLECTOR only)' })
  @ApiResponse({ status: 200, description: 'Earnings summary', type: EarningsSummaryDto })
  async getEarnings(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<EarningsSummaryDto> {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can access earnings');
    }
    return this.earningsService.getCollectorEarnings(user.sub, from, to);
  }

  @Get('earnings/summary')
  @ApiOperation({ summary: 'Get earnings quick summary (COLLECTOR only)' })
  @ApiResponse({ status: 200, description: 'Quick summary', type: EarningsQuickSummaryDto })
  async getEarningsSummary(
    @CurrentUser() user: JwtPayload,
  ): Promise<EarningsQuickSummaryDto> {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can access earnings');
    }
    return this.earningsService.getEarningsSummary(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID (ownership check applied)' })
  @ApiResponse({ status: 200, description: 'Job details', type: JobResponseDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this job' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<JobResponseDto> {
    return this.jobsService.findOne(id, user.sub, user.role as UserRole);
  }

  // ─── LIFECYCLE ────────────────────────────────────────────────

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an assigned job (COLLECTOR only)' })
  @ApiResponse({ status: 200, description: 'Job accepted, status → IN_PROGRESS', type: JobResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 403, description: 'Not assigned to you' })
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<JobResponseDto> {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can accept jobs');
    }
    return this.jobsService.acceptJob(id, user.sub);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an assigned job (COLLECTOR only)' })
  @ApiResponse({ status: 200, description: 'Job rejected, returning to queue' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 403, description: 'Not assigned to you' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectJobDto,
  ): Promise<{ message: string }> {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can reject jobs');
    }
    return this.jobsService.rejectJob(id, user.sub, dto);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a job (COLLECTOR only)' })
  @ApiResponse({ status: 200, description: 'Job started, status → IN_PROGRESS', type: JobResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 403, description: 'Not assigned to you' })
  async start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<JobResponseDto> {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can start jobs');
    }
    return this.jobsService.startJob(id, user.sub);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a job with proof (COLLECTOR only)' })
  @ApiResponse({ status: 200, description: 'Job completed, proof stored', type: JobResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state transition or missing proof' })
  @ApiResponse({ status: 403, description: 'Not assigned to you' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CompleteJobDto,
  ): Promise<JobResponseDto> {
    if (user.role !== UserRole.COLLECTOR) {
      throw new ForbiddenException('Only collectors can complete jobs');
    }
    return this.jobsService.completeJob(id, user.sub, dto);
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a completed job (HOUSEHOLD only)' })
  @ApiResponse({ status: 200, description: 'Job validated', type: JobResponseDto })
  @ApiResponse({ status: 400, description: 'Job not in COMPLETED status' })
  @ApiResponse({ status: 403, description: 'Not the job owner' })
  async validate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<JobResponseDto> {
    if (user.role !== UserRole.HOUSEHOLD) {
      throw new ForbiddenException('Only households can validate jobs');
    }
    return this.jobsService.validateJob(id, user.sub);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a job (HOUSEHOLD or ADMIN)' })
  @ApiResponse({ status: 200, description: 'Job cancelled', type: JobResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid state for cancellation' })
  @ApiResponse({ status: 403, description: 'Not authorized to cancel' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CancelJobDto,
  ): Promise<JobResponseDto> {
    const role = user.role as UserRole;
    if (role !== UserRole.HOUSEHOLD && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only households and admins can cancel jobs');
    }
    return this.jobsService.cancelJob(id, user.sub, role, dto);
  }

  // ─── RATINGS ──────────────────────────────────────────────────

  @Post(':id/rate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Rate a validated job (HOUSEHOLD only)' })
  @ApiResponse({ status: 201, description: 'Rating created', type: RatingResponseDto })
  @ApiResponse({ status: 400, description: 'Job not in VALIDATED status' })
  @ApiResponse({ status: 403, description: 'Not the job owner' })
  @ApiResponse({ status: 409, description: 'Already rated' })
  async rate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRatingDto,
  ): Promise<RatingResponseDto> {
    if (user.role !== UserRole.HOUSEHOLD) {
      throw new ForbiddenException('Only households can rate jobs');
    }
    return this.ratingsService.rateJob(id, user.sub, dto);
  }

  // ─── DISPUTES ─────────────────────────────────────────────────

  @Post(':id/dispute')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Dispute a completed job (HOUSEHOLD only)' })
  @ApiResponse({ status: 201, description: 'Dispute created', type: DisputeResponseDto })
  @ApiResponse({ status: 400, description: 'Job not in COMPLETED status' })
  @ApiResponse({ status: 403, description: 'Not the job owner' })
  @ApiResponse({ status: 409, description: 'Already disputed' })
  async dispute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDisputeDto,
  ): Promise<DisputeResponseDto> {
    if (user.role !== UserRole.HOUSEHOLD) {
      throw new ForbiddenException('Only households can dispute jobs');
    }
    return this.disputesService.createDispute(id, user.sub, dto);
  }
}
