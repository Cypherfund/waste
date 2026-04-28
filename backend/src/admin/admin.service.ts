import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { UsersService } from '../users/users.service';
import { JobsService } from '../jobs/jobs.service';
import { AssignmentService } from '../assignment/assignment.service';
import { DisputesService } from '../disputes/disputes.service';
import { FraudService } from '../fraud/fraud.service';
import { SystemConfigService } from '../config/system-config.service';
import { Job } from '../jobs/entities/job.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { User } from '../users/entities/user.entity';
import { AdminJobFilterDto } from './dto/admin-job-filter.dto';
import { ResolveDisputeDto } from '../disputes/dto/resolve-dispute.dto';
import { ReviewFraudFlagDto } from '../fraud/dto/review-fraud-flag.dto';
import { JobStatus } from '../common/enums/job-status.enum';
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
  ) {}

  // ─── USERS ────────────────────────────────────────────────────

  async listUsers(filters?: { role?: string; isActive?: boolean }) {
    return this.usersService.listUsers(filters);
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

  async listJobs(filters: AdminJobFilterDto): Promise<PaginatedResponse<JobResponseDto>> {
    const where: FindOptionsWhere<Job> = {};

    if (filters.status) where.status = filters.status;
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

    return paginate(
      jobs.map((j) => this.jobsService.toResponseDto(j)),
      total,
      page,
      limit,
    );
  }

  async getJob(jobId: string): Promise<JobResponseDto> {
    const job = await this.jobsService.getJobEntity(jobId);
    return this.jobsService.toResponseDto(job);
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
    };
  }
}
