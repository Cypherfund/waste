import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { UsersService } from '../users/users.service';
import { JobsService } from '../jobs/jobs.service';
import { AssignmentService } from '../assignment/assignment.service';
import { DisputesService } from '../disputes/disputes.service';
import { FraudService } from '../fraud/fraud.service';
import { SystemConfigService } from '../config/system-config.service';
import { FeatureFlagService, FEATURE_FLAGS } from '../config/feature-flags';
import { Job } from '../jobs/entities/job.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { Dispute } from '../disputes/entities/dispute.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { User } from '../users/entities/user.entity';
import { AdminJobFilterDto } from './dto/admin-job-filter.dto';
import { ResolveDisputeDto } from '../disputes/dto/resolve-dispute.dto';
import { ReviewFraudFlagDto } from '../fraud/dto/review-fraud-flag.dto';
import { JobStatus } from '../common/enums/job-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { UserRole } from '../common/enums/role.enum';
import { EarningStatus } from '../common/enums/earning-status.enum';
import { DisputeStatus } from '../common/enums/dispute-status.enum';
import { FraudFlagStatus } from '../common/enums/fraud-type.enum';
import { FraudSeverity } from '../common/enums/fraud-severity.enum';
import { PaginatedResponse, paginate } from '../common/dto/pagination.dto';
import { JobResponseDto } from '../jobs/dto/job-response.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jobsService: JobsService,
    private readonly assignmentService: AssignmentService,
    private readonly disputesService: DisputesService,
    private readonly fraudService: FraudService,
    private readonly systemConfigService: SystemConfigService,
    private readonly featureFlagService: FeatureFlagService,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    @InjectRepository(Earning)
    private readonly earningRepo: Repository<Earning>,
    @InjectRepository(Rating)
    private readonly ratingRepo: Repository<Rating>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserSubscription)
    private readonly subRepo: Repository<UserSubscription>,
  ) {}

  // ─── USERS ────────────────────────────────────────────────────

  async listUsers(filters?: { role?: string; isActive?: boolean; page?: number; limit?: number }) {
    const { page, limit, ...userFilters } = filters || {};
    const result = await this.usersService.listUsers({ ...userFilters, page, limit });
    const totalPages = Math.ceil(result.total / (limit || 20));
    return {
      data: result.data,
      meta: {
        total: result.total,
        totalPages,
        page: page || 1,
        limit: limit || 20,
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const [completedJobs, totalEarnings] = await Promise.all([
      this.jobRepo.count({ where: { collectorId: userId, status: JobStatus.COMPLETED } }),
      user.role === UserRole.COLLECTOR
        ? this.earningRepo
            .createQueryBuilder('e')
            .select('COALESCE(SUM(e.total_amount), 0)', 'total')
            .where('e.collector_id = :id', { id: userId })
            .getRawOne()
            .then((r) => Number(r?.total ?? 0))
        : Promise.resolve(0),
    ]);

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      avgRating: user.avgRating,
      totalCompleted: user.totalCompleted,
      completedJobs,
      totalEarnings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async deactivateUser(adminId: string, userId: string): Promise<void> {
    if (adminId === userId) {
      throw new ForbiddenException('Cannot deactivate yourself');
    }
    await this.usersService.deactivateUser(userId);
    this.logger.log(`Admin ${adminId} deactivated user ${userId}`);
  }

  async activateUser(adminId: string, userId: string): Promise<void> {
    await this.usersService.activateUser(userId);
    this.logger.log(`Admin ${adminId} activated user ${userId}`);
  }

  // ─── JOBS ─────────────────────────────────────────────────────

  async listPendingPaymentJobs(): Promise<{ data: any[]; meta: any }> {
    const [jobs, pendingSubs] = await Promise.all([
      this.jobRepo.find({
        where: {
          paymentStatus: In([PaymentStatus.PENDING, PaymentStatus.AWAITING_ADMIN_VERIFICATION]) as any,
        },
        relations: ['household', 'collector'],
        order: { createdAt: 'DESC' },
        take: 100,
      }),
      this.subRepo.find({
        where: { status: SubscriptionStatus.PENDING_PAYMENT },
        relations: ['plan', 'user'],
        order: { createdAt: 'ASC' },
      }),
    ]);

    const jobRows = await Promise.all(
      jobs.map(async (j) => {
        const dto = await this.jobsService.toResponseDto(j);
        return { ...dto, paymentSource: 'JOB_PAYMENT' };
      }),
    );

    const subRows = pendingSubs.map((s) => ({
      jobId: null,
      subscriptionId: s.id,
      paymentSource: 'SUBSCRIPTION_PAYMENT',
      householdId: s.userId,
      householdName: (s as any).user?.name ?? null,
      planName: (s as any).plan?.name ?? null,
      scheduledDate: s.startDate,
      paymentMode: s.paymentMode ?? 'MANUAL_PROVIDER',
      paymentMethod: s.paymentMode ?? null,
      paymentRef: s.paymentRef,
      paymentProofUrl: s.paymentProofUrl,
      paymentStatus: s.paymentStatus ?? 'AWAITING_ADMIN_VERIFICATION',
      quotedPrice: (s as any).plan?.price ?? null,
      createdAt: s.createdAt,
    }));

    const combined = [...jobRows, ...subRows].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return { data: combined, meta: { total: combined.length, page: 1, limit: 200 } };
  }

  async listJobs(filters: AdminJobFilterDto): Promise<PaginatedResponse<JobResponseDto>> {
    const where: FindOptionsWhere<Job> = {};

    if (filters.status) where.status = filters.status;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.collectorId) where.collectorId = filters.collectorId;
    if (filters.householdId) where.householdId = filters.householdId;

    if (filters.dateFrom && filters.dateTo) {
      where.scheduledDate = Between(filters.dateFrom, filters.dateTo) as any;
    } else if (filters.dateFrom) {
      where.scheduledDate = MoreThanOrEqual(filters.dateFrom) as any;
    } else if (filters.dateTo) {
      where.scheduledDate = LessThanOrEqual(filters.dateTo) as any;
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [jobs, total] = await this.jobRepo.findAndCount({
      where,
      relations: ['household', 'collector'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = await Promise.all(jobs.map((j) => this.jobsService.toResponseDto(j)));
    return paginate(data, total, page, limit);
  }

  async getJob(jobId: string): Promise<JobResponseDto> {
    const job = await this.jobsService.getJobEntity(jobId);
    return await this.jobsService.toResponseDto(job);
  }

  // ─── MANUAL ASSIGNMENT ────────────────────────────────────────

  async manualAssign(jobId: string, collectorId: string): Promise<void> {
    await this.assignmentService.manualAssign(jobId, collectorId);
    this.logger.log(`Admin manually assigned job ${jobId} to collector ${collectorId}`);
  }

  async manualReassign(jobId: string, collectorId: string): Promise<void> {
    await this.assignmentService.manualReassign(jobId, collectorId);
    this.logger.log(`Admin manually reassigned job ${jobId} to collector ${collectorId}`);
  }

  // ─── DISPUTES ─────────────────────────────────────────────────

  async listDisputes(filters?: { status?: DisputeStatus }) {
    const where: FindOptionsWhere<Dispute> = {};
    if (filters?.status) where.status = filters.status;

    return this.disputeRepo.find({
      where,
      relations: ['household'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async resolveDispute(disputeId: string, adminId: string, dto: ResolveDisputeDto) {
    return this.disputesService.resolveDispute(disputeId, adminId, dto);
  }

  // ─── FRAUD ────────────────────────────────────────────────────

  async listFraudFlags(filters?: {
    status?: FraudFlagStatus;
    collectorId?: string;
    severity?: FraudSeverity;
  }) {
    return this.fraudService.listFlags(filters);
  }

  async reviewFraudFlag(flagId: string, adminId: string, dto: ReviewFraudFlagDto) {
    return this.fraudService.reviewFlag(flagId, adminId, dto);
  }

  // ─── CONFIG ───────────────────────────────────────────────────

  async listConfig(category?: string) {
    const all = await this.systemConfigService.listAll();
    if (category) {
      return all.filter((c) => c.category === category);
    }
    return all;
  }

  async updateConfig(key: string, value: string, adminId: string) {
    const result = await this.systemConfigService.upsert(key, value, adminId);
    this.logger.log(`Admin ${adminId} updated config ${key} = ${value}`);
    return result;
  }

  // ─── COLLECTORS PERFORMANCE ────────────────────────────────────

  async getCollectorPerformance(limit = 10): Promise<any[]> {
    const collectors = await this.userRepo.find({
      where: { role: UserRole.COLLECTOR, isActive: true },
      order: { avgRating: 'DESC' },
      take: limit,
    });

    const results = await Promise.all(
      collectors.map(async (c) => {
        const [totalEarnings, completedJobs, avgCompletionTime] = await Promise.all([
          this.earningRepo
            .createQueryBuilder('e')
            .select('COALESCE(SUM(e.total_amount), 0)', 'total')
            .where('e.collector_id = :id', { id: c.id })
            .getRawOne()
            .then((r) => Number(r?.total ?? 0)),
          this.jobRepo.count({
            where: { collectorId: c.id, status: JobStatus.COMPLETED },
          }),
          this.jobRepo
            .createQueryBuilder('j')
            .select(
              'COALESCE(AVG(EXTRACT(EPOCH FROM (j.completed_at - j.started_at)) / 60), 0)',
              'avg_minutes',
            )
            .where('j.collector_id = :id', { id: c.id })
            .andWhere('j.started_at IS NOT NULL')
            .andWhere('j.completed_at IS NOT NULL')
            .getRawOne()
            .then((r) => Math.round(Number(r?.avg_minutes ?? 0))),
        ]);

        return {
          id: c.id,
          name: c.name,
          avgRating: Number(c.avgRating),
          completedJobs,
          totalEarnings,
          avgCompletionTime,
        };
      }),
    );

    return results;
  }

  // ─── PAYMENT VERIFICATION ──────────────────────────────────────

  async verifyPayment(jobId: string, adminId: string): Promise<JobResponseDto> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const verifiableStatuses = [PaymentStatus.PENDING, PaymentStatus.AWAITING_ADMIN_VERIFICATION];
    if (!verifiableStatuses.includes(job.paymentStatus as PaymentStatus)) {
      throw new BadRequestException('Job is not pending payment verification');
    }

    if (job.status !== JobStatus.PAYMENT_PENDING) {
      throw new BadRequestException('Job is not in PAYMENT_PENDING status');
    }

    // Update payment status and job status
    job.paymentStatus = PaymentStatus.VERIFIED;
    job.paymentVerifiedBy = adminId;
    job.paymentVerifiedAt = new Date();
    job.status = JobStatus.REQUESTED; // Move to REQUESTED for assignment

    const saved = await this.jobRepo.save(job);
    this.logger.log(`Admin ${adminId} verified payment for job ${jobId}`);

    // Trigger job assignment since it's now verified
    this.assignmentService.autoAssign(jobId);

    return await this.jobsService.toResponseDto(saved);
  }

  async rejectPayment(jobId: string, adminId: string, reason?: string): Promise<JobResponseDto> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const pendingStatuses = [PaymentStatus.PENDING, PaymentStatus.AWAITING_ADMIN_VERIFICATION];
    if (!pendingStatuses.includes(job.paymentStatus as PaymentStatus)) {
      throw new BadRequestException('Job is not pending payment verification');
    }

    if (job.status !== JobStatus.PAYMENT_PENDING) {
      throw new BadRequestException('Job is not in PAYMENT_PENDING status');
    }

    // REJECTED = admin explicitly rejected the submitted proof/ref
    // PAYMENT_FAILED = distinct from CANCELLED; allows household to resubmit payment
    job.paymentStatus = PaymentStatus.REJECTED;
    job.paymentRejectionReason = reason ?? 'Payment verification failed';
    job.status = JobStatus.PAYMENT_FAILED;

    const saved = await this.jobRepo.save(job);
    this.logger.log(`Admin ${adminId} rejected payment for job ${jobId}: ${reason}`);

    return await this.jobsService.toResponseDto(saved);
  }

  // ─── STATS ────────────────────────────────────────────────────

  async getStats(): Promise<Record<string, any>> {
    const [
      totalHouseholds,
      totalCollectors,
      totalAdmins,
      totalJobs,
      activeJobs,
      completedJobs,
      cancelledJobs,
      flaggedCollectors,
      totalDisputes,
      openDisputes,
      avgRating,
      earningsTotal,
      earningsPending,
      avgCompletionTimeMinutes,
      paymentIntegrationEnabled,
    ] = await Promise.all([
      this.usersService.countByRole(UserRole.HOUSEHOLD),
      this.usersService.countByRole(UserRole.COLLECTOR),
      this.usersService.countByRole(UserRole.ADMIN),
      this.jobRepo.count(),
      this.jobRepo.count({
        where: [
          { status: JobStatus.REQUESTED },
          { status: JobStatus.ASSIGNED },
          { status: JobStatus.IN_PROGRESS },
        ],
      }),
      this.jobRepo.count({ where: { status: JobStatus.COMPLETED } }),
      this.jobRepo.count({ where: { status: JobStatus.CANCELLED } }),
      this.usersService.countFlaggedCollectors(),
      this.disputeRepo.count(),
      this.disputeRepo.count({ where: { status: DisputeStatus.OPEN } }),
      this.ratingRepo
        .createQueryBuilder('r')
        .select('COALESCE(AVG(r.value), 0)', 'avg')
        .getRawOne()
        .then((r) => Math.round(Number(r?.avg ?? 0) * 100) / 100),
      this.earningRepo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.total_amount), 0)', 'total')
        .getRawOne()
        .then((r) => Number(r?.total ?? 0)),
      this.earningRepo
        .createQueryBuilder('e')
        .select('COALESCE(SUM(e.total_amount), 0)', 'total')
        .where('e.status = :status', { status: EarningStatus.PENDING })
        .getRawOne()
        .then((r) => Number(r?.total ?? 0)),
      this.jobRepo
        .createQueryBuilder('j')
        .select(
          'COALESCE(AVG(EXTRACT(EPOCH FROM (j.completed_at - j.started_at)) / 60), 0)',
          'avg_minutes',
        )
        .where('j.started_at IS NOT NULL')
        .andWhere('j.completed_at IS NOT NULL')
        .getRawOne()
        .then((r) => Math.round(Number(r?.avg_minutes ?? 0))),
      this.featureFlagService.isEnabled(FEATURE_FLAGS.PAYMENT_INTEGRATION, false),
    ]);

    // jobsByStatus breakdown
    const statusCounts = await this.jobRepo
      .createQueryBuilder('j')
      .select('j.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('j.status')
      .getRawMany();

    const jobsByStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      jobsByStatus[row.status] = Number(row.count);
    }

    return {
      totalUsers: totalHouseholds + totalCollectors + totalAdmins,
      totalHouseholds,
      totalCollectors,
      totalJobs,
      activeJobs,
      completedJobs,
      cancelledJobs,
      flaggedCollectors,
      avgCompletionTimeMinutes,
      avgRating,
      jobsByStatus,
      earningsTotal,
      earningsPending,
      totalDisputes,
      openDisputes,
      paymentIntegrationEnabled,
    };
  }

  // ─── EARNINGS / PAYOUTS ───────────────────────────────────────

  async listEarnings(filters: {
    status?: EarningStatus;
    collectorId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const qb = this.earningRepo
      .createQueryBuilder('e')
      .leftJoin('e.collector', 'collector')
      .addSelect(['collector.id', 'collector.name', 'collector.phone'])
      .orderBy('e.createdAt', 'DESC');

    if (filters.status) {
      qb.andWhere('e.status = :status', { status: filters.status });
    }
    if (filters.collectorId) {
      qb.andWhere('e.collector_id = :collectorId', { collectorId: filters.collectorId });
    }
    if (filters.from) {
      qb.andWhere('e.createdAt >= :from', { from: new Date(filters.from) });
    }
    if (filters.to) {
      qb.andWhere('e.createdAt <= :to', { to: new Date(filters.to) });
    }

    const total = await qb.getCount();
    const earnings = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: earnings.map((e) => ({
        id: e.id,
        jobId: e.jobId,
        collectorId: e.collectorId,
        collectorName: (e as any).collector?.name ?? null,
        collectorPhone: (e as any).collector?.phone ?? null,
        baseAmount: Number(e.baseAmount),
        distanceAmount: Number(e.distanceAmount),
        surgeMultiplier: Number(e.surgeMultiplier),
        totalAmount: Number(e.totalAmount),
        status: e.status,
        confirmedAt: e.confirmedAt,
        createdAt: e.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async exportEarningsCsv(filters: {
    status?: EarningStatus;
    collectorId?: string;
    from?: string;
    to?: string;
  }): Promise<string> {
    const qb = this.earningRepo
      .createQueryBuilder('e')
      .leftJoin('e.collector', 'collector')
      .addSelect(['collector.id', 'collector.name', 'collector.phone'])
      .orderBy('e.createdAt', 'DESC');

    if (filters.status) {
      qb.andWhere('e.status = :status', { status: filters.status });
    }
    if (filters.collectorId) {
      qb.andWhere('e.collector_id = :collectorId', { collectorId: filters.collectorId });
    }
    if (filters.from) {
      qb.andWhere('e.created_at >= :from', { from: new Date(filters.from) });
    }
    if (filters.to) {
      qb.andWhere('e.created_at <= :to', { to: new Date(filters.to) });
    }

    const earnings = await qb.getMany();

    const header = 'id,jobId,collectorId,collectorName,collectorPhone,baseAmount,distanceAmount,surgeMultiplier,totalAmount,status,confirmedAt,createdAt';
    const rows = earnings.map((e) => [
      e.id,
      e.jobId,
      e.collectorId,
      (e as any).collector?.name ?? '',
      (e as any).collector?.phone ?? '',
      e.baseAmount,
      e.distanceAmount,
      e.surgeMultiplier,
      e.totalAmount,
      e.status,
      e.confirmedAt?.toISOString() ?? '',
      e.createdAt.toISOString(),
    ].join(','));

    return [header, ...rows].join('\n');
  }
}
