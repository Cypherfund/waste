import {
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Earning } from './entities/earning.entity';
import { Job } from '../jobs/entities/job.entity';
import { EarningStatus } from '../common/enums/earning-status.enum';
import { SystemConfigService } from '../config/system-config.service';
import { FeatureFlagService, FEATURE_FLAGS } from '../config/feature-flags';
import {
  JobEvents,
  JobCompletedPayload,
  JobEventPayload,
  EarningsEvents,
} from '../events/events.types';
import {
  EarningResponseDto,
  EarningsSummaryDto,
  EarningsQuickSummaryDto,
} from './dto/earnings-summary.dto';
import { haversineDistance } from '../assignment/assignment.service';

@Injectable()
export class EarningsService {
  private readonly logger = new Logger(EarningsService.name);

  constructor(
    @InjectRepository(Earning)
    private readonly earningRepo: Repository<Earning>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly systemConfigService: SystemConfigService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── EVENT LISTENERS ──────────────────────────────────────────

  /**
   * On JOB_COMPLETED → calculate and create PENDING earnings record.
   */
  @OnEvent(JobEvents.COMPLETED)
  async onJobCompleted(payload: JobCompletedPayload): Promise<void> {
    const job = await this.jobRepo.findOne({
      where: { id: payload.jobId },
      relations: ['collector'],
    });

    if (!job || !job.collectorId) {
      this.logger.warn(`Cannot create earnings for job ${payload.jobId}: no collector`);
      return;
    }

    // Check if earnings already exist (idempotency)
    const existing = await this.earningRepo.findOne({
      where: { jobId: job.id },
    });
    if (existing) {
      this.logger.warn(`Earnings already exist for job ${job.id}`);
      return;
    }

    const calculated = await this.calculateEarnings(job);

    const earning = this.earningRepo.create({
      jobId: job.id,
      collectorId: job.collectorId,
      baseAmount: calculated.baseAmount,
      distanceAmount: calculated.distanceAmount,
      surgeMultiplier: calculated.surgeMultiplier,
      totalAmount: calculated.totalAmount,
      status: EarningStatus.PENDING,
    });

    const saved = await this.earningRepo.save(earning);

    this.logger.log(
      `Earnings created for job ${job.id}: ${saved.totalAmount} XAF (PENDING)`,
    );

    this.eventEmitter.emit(EarningsEvents.CALCULATED, {
      earningsId: saved.id,
      jobId: job.id,
      collectorId: job.collectorId,
      amount: saved.totalAmount,
      timestamp: new Date(),
    });
  }

  /**
   * On JOB_VALIDATED → confirm earnings (PENDING → CONFIRMED).
   */
  @OnEvent(JobEvents.VALIDATED)
  async onJobValidated(payload: JobEventPayload): Promise<void> {
    const earning = await this.earningRepo.findOne({
      where: { jobId: payload.jobId },
    });

    if (!earning) {
      this.logger.warn(`No earnings found for validated job ${payload.jobId}`);
      return;
    }

    if (earning.status !== EarningStatus.PENDING) {
      this.logger.warn(
        `Earnings for job ${payload.jobId} not in PENDING state (${earning.status})`,
      );
      return;
    }

    earning.status = EarningStatus.CONFIRMED;
    earning.confirmedAt = new Date();

    const saved = await this.earningRepo.save(earning);

    this.logger.log(
      `Earnings confirmed for job ${payload.jobId}: ${saved.totalAmount} XAF`,
    );

    this.eventEmitter.emit(EarningsEvents.CONFIRMED, {
      earningsId: saved.id,
      jobId: payload.jobId,
      collectorId: saved.collectorId,
      amount: saved.totalAmount,
      timestamp: new Date(),
    });
  }

  // ─── EARNINGS CALCULATION ─────────────────────────────────────

  /**
   * Calculate earnings for a job using config-driven values.
   * Formula: total = (base_rate + distance_amount) * surge_multiplier
   */
  async calculateEarnings(job: Job): Promise<{
    baseAmount: number;
    distanceAmount: number;
    surgeMultiplier: number;
    totalAmount: number;
  }> {
    const [baseRate, perKmRate, surgeMultiplier] = await Promise.all([
      this.systemConfigService.getNumber('earnings.base_rate', 500),
      this.systemConfigService.getNumber('earnings.per_km_rate', 100),
      this.getSurgeMultiplier(),
    ]);

    // Calculate distance component
    const distanceKm = this.computeJobDistance(job);
    const distanceAmount = distanceKm * perKmRate;

    // Total = (base + distance) * surge
    const totalAmount =
      Math.round((baseRate + distanceAmount) * surgeMultiplier * 100) / 100;

    return {
      baseAmount: baseRate,
      distanceAmount: Math.round(distanceAmount * 100) / 100,
      surgeMultiplier,
      totalAmount,
    };
  }

  /**
   * Compute distance between collector home location and job location.
   * Returns 0 if coordinates are missing (base-rate-only fallback).
   */
  computeJobDistance(job: Job): number {
    if (
      job.locationLat == null ||
      job.locationLng == null ||
      !job.collector ||
      job.collector.latitude == null ||
      job.collector.longitude == null
    ) {
      return 0;
    }

    return haversineDistance(
      Number(job.collector.latitude),
      Number(job.collector.longitude),
      Number(job.locationLat),
      Number(job.locationLng),
    );
  }

  /**
   * Get surge multiplier from config (only if surge is enabled).
   */
  async getSurgeMultiplier(): Promise<number> {
    const surgeEnabled = await this.featureFlagService.isEnabled(
      FEATURE_FLAGS.SURGE_PRICING,
      false,
    );

    if (!surgeEnabled) return 1.0;

    return this.systemConfigService.getNumber('earnings.surge_multiplier', 1.0);
  }

  // ─── QUERY ENDPOINTS ──────────────────────────────────────────

  /**
   * Get collector earnings with optional date filters.
   */
  async getCollectorEarnings(
    collectorId: string,
    from?: string,
    to?: string,
  ): Promise<EarningsSummaryDto> {
    const qb = this.earningRepo
      .createQueryBuilder('e')
      .where('e.collector_id = :collectorId', { collectorId });

    if (from) {
      qb.andWhere('e.created_at >= :from', { from: new Date(from) });
    }
    if (to) {
      qb.andWhere('e.created_at <= :to', { to: new Date(to) });
    }

    qb.orderBy('e.created_at', 'DESC');

    const earnings = await qb.getMany();

    let totalEarnings = 0;
    let pendingEarnings = 0;
    let confirmedEarnings = 0;

    for (const e of earnings) {
      const amount = Number(e.totalAmount);
      totalEarnings += amount;
      if (e.status === EarningStatus.PENDING) pendingEarnings += amount;
      if (e.status === EarningStatus.CONFIRMED || e.status === EarningStatus.PAID) {
        confirmedEarnings += amount;
      }
    }

    return {
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      pendingEarnings: Math.round(pendingEarnings * 100) / 100,
      confirmedEarnings: Math.round(confirmedEarnings * 100) / 100,
      jobCount: earnings.length,
      earnings: earnings.map((e) => this.toResponseDto(e)),
    };
  }

  /**
   * Quick summary: today, thisWeek, thisMonth, allTime (confirmed + paid).
   */
  async getEarningsSummary(collectorId: string): Promise<EarningsQuickSummaryDto> {
    const now = new Date();

    // Start of today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Start of this week (Monday)
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    weekStart.setDate(weekStart.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    // Start of this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const confirmedStatuses = [EarningStatus.CONFIRMED, EarningStatus.PAID];

    const [today, thisWeek, thisMonth, allTime] = await Promise.all([
      this.sumEarnings(collectorId, confirmedStatuses, todayStart),
      this.sumEarnings(collectorId, confirmedStatuses, weekStart),
      this.sumEarnings(collectorId, confirmedStatuses, monthStart),
      this.sumEarnings(collectorId, confirmedStatuses),
    ]);

    return { today, thisWeek, thisMonth, allTime };
  }

  private async sumEarnings(
    collectorId: string,
    statuses: EarningStatus[],
    since?: Date,
  ): Promise<number> {
    const qb = this.earningRepo
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.total_amount), 0)', 'total')
      .where('e.collector_id = :collectorId', { collectorId })
      .andWhere('e.status IN (:...statuses)', { statuses });

    if (since) {
      qb.andWhere('e.created_at >= :since', { since });
    }

    const result = await qb.getRawOne();
    return parseFloat(result.total) || 0;
  }

  private toResponseDto(earning: Earning): EarningResponseDto {
    return {
      id: earning.id,
      jobId: earning.jobId,
      collectorId: earning.collectorId,
      baseAmount: Number(earning.baseAmount),
      distanceAmount: Number(earning.distanceAmount),
      surgeMultiplier: Number(earning.surgeMultiplier),
      totalAmount: Number(earning.totalAmount),
      status: earning.status,
      confirmedAt: earning.confirmedAt,
      createdAt: earning.createdAt,
    };
  }
}
