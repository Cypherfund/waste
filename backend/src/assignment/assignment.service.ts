import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobsService } from '../jobs/jobs.service';
import { TimeslotsService } from '../timeslots/timeslots.service';
import {
  SystemConfigService,
  AssignmentConfig,
} from '../config/system-config.service';
import { FeatureFlagService, FEATURE_FLAGS } from '../config/feature-flags';
import {
  JobEvents,
  JobEventPayload,
  JobAssignedPayload,
  JobAssignmentEscalatedPayload,
  JobAssignmentTimeoutPayload,
} from '../events/events.types';
import { JobStatus } from '../common/enums/job-status.enum';
import { UserRole } from '../common/enums/role.enum';
import {
  CollectorCandidate,
  rankCollectors,
  ScoredCollector,
} from './assignment.scoring';

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly jobsService: JobsService,
    private readonly timeslotsService: TimeslotsService,
    private readonly systemConfigService: SystemConfigService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  // ─── EVENT LISTENER: auto-assign on job.created ───────────────

  @OnEvent(JobEvents.CREATED)
  async onJobCreated(payload: JobEventPayload): Promise<void> {
    const autoEnabled = await this.featureFlagService.isEnabled(
      FEATURE_FLAGS.AUTO_ASSIGNMENT,
      true,
    );

    if (!autoEnabled) {
      this.logger.log(
        `Auto-assignment disabled, skipping job ${payload.jobId}`,
      );
      return;
    }

    await this.autoAssign(payload.jobId);
  }

  // ─── EVENT LISTENER: reassign on job.rejected ─────────────────

  @OnEvent(JobEvents.REJECTED)
  async onJobRejected(payload: JobEventPayload): Promise<void> {
    this.logger.log(
      `Job ${payload.jobId} rejected, attempting reassignment`,
    );
    await this.autoAssign(payload.jobId);
  }

  // ─── AUTO ASSIGN ──────────────────────────────────────────────

  async autoAssign(jobId: string): Promise<void> {
    const job = await this.jobsService.getJobEntity(jobId);

    if (job.status !== JobStatus.REQUESTED) {
      this.logger.warn(
        `Job ${jobId} not in REQUESTED state (${job.status}), skipping assignment`,
      );
      return;
    }

    const config = await this.systemConfigService.getAssignmentConfig();

    // Check max reassign attempts
    if (job.assignmentAttempts >= config.maxReassignAttempts) {
      this.logger.warn(
        `Job ${jobId} exceeded max assignment attempts (${config.maxReassignAttempts}), escalating`,
      );
      this.escalate(job, config.maxReassignAttempts);
      return;
    }

    // Emit assignment started
    this.eventEmitter.emit(JobEvents.ASSIGNMENT_STARTED, {
      jobId: job.id,
      householdId: job.householdId,
      status: job.status,
      timestamp: new Date(),
    });

    // Find eligible collectors
    const candidates = await this.getEligibleCollectors(job, config);

    if (candidates.length === 0) {
      this.logger.warn(`No eligible collectors found for job ${jobId}`);
      this.escalate(job, job.assignmentAttempts);
      return;
    }

    // Rank and pick best
    const ranked = rankCollectors(candidates, config);
    const best = ranked[0];

    // Atomic assignment via JobsService
    const assigned = await this.jobsService.assignToCollector(
      jobId,
      best.id,
    );

    if (!assigned) {
      this.logger.warn(
        `Failed to assign job ${jobId} (concurrent modification)`,
      );
      return;
    }

    this.logger.log(
      `Job ${jobId} assigned to collector ${best.id} (score: ${best.score.toFixed(2)})`,
    );

    const assignedPayload: JobAssignedPayload = {
      jobId: job.id,
      householdId: job.householdId,
      collectorId: best.id,
      status: JobStatus.ASSIGNED,
      timestamp: new Date(),
      attempt: job.assignmentAttempts + 1,
    };
    this.eventEmitter.emit(JobEvents.ASSIGNED, assignedPayload);
  }

  // ─── MANUAL ASSIGN (Admin) ───────────────────────────────────

  async manualAssign(jobId: string, collectorId: string): Promise<void> {
    const job = await this.jobsService.getJobEntity(jobId);

    if (job.status !== JobStatus.REQUESTED) {
      throw new BadRequestException(
        `Job must be in REQUESTED status to assign (current: ${job.status})`,
      );
    }

    // Verify collector exists and is active
    const collector = await this.userRepo.findOne({
      where: { id: collectorId, role: UserRole.COLLECTOR, isActive: true },
    });

    if (!collector) {
      throw new NotFoundException(
        'Collector not found or not active',
      );
    }

    const assigned = await this.jobsService.assignToCollector(
      jobId,
      collectorId,
    );

    if (!assigned) {
      throw new BadRequestException(
        'Failed to assign job (may have been assigned concurrently)',
      );
    }

    this.logger.log(
      `Job ${jobId} manually assigned to collector ${collectorId}`,
    );

    const payload: JobAssignedPayload = {
      jobId: job.id,
      householdId: job.householdId,
      collectorId,
      status: JobStatus.ASSIGNED,
      timestamp: new Date(),
      attempt: job.assignmentAttempts + 1,
    };
    this.eventEmitter.emit(JobEvents.ASSIGNED, payload);
  }

  // ─── TIMEOUT HANDLER (called by scheduler) ────────────────────

  async handleTimeout(jobId: string): Promise<void> {
    const job = await this.jobsService.getJobEntity(jobId);

    if (job.status !== JobStatus.ASSIGNED) {
      return; // Already accepted or changed state
    }

    const collectorId = job.collectorId;

    this.logger.warn(
      `Assignment timeout for job ${jobId}, collector ${collectorId}`,
    );

    const timeoutPayload: JobAssignmentTimeoutPayload = {
      jobId: job.id,
      collectorId: collectorId!,
      attempt: job.assignmentAttempts,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(JobEvents.ASSIGNMENT_TIMEOUT, timeoutPayload);

    // Unassign and reassign
    const attempts = await this.jobsService.unassignCollector(jobId);
    const config = await this.systemConfigService.getAssignmentConfig();

    if (attempts >= config.maxReassignAttempts) {
      this.escalate(job, attempts);
      return;
    }

    // Try reassignment
    await this.autoAssign(jobId);
  }

  // ─── ELIGIBLE COLLECTOR FILTERING ─────────────────────────────

  async getEligibleCollectors(
    job: Job,
    config: AssignmentConfig,
  ): Promise<CollectorCandidate[]> {
    const dayOfWeek = this.timeslotsService.getDayOfWeek(job.scheduledDate);
    const [jobStart, jobEnd] = this.timeslotsService.parseTimeWindow(
      job.scheduledTime,
    );

    // Query active collectors with workload counts and distance
    const rawCollectors = await this.dataSource.query(
      `
      SELECT
        u.id,
        u.latitude,
        u.longitude,
        u.avg_rating as "avgRating",
        (
          SELECT COUNT(*) FROM jobs j
          WHERE j.collector_id = u.id
          AND j.status IN ('ASSIGNED', 'IN_PROGRESS')
        )::int as "activeJobCount",
        (
          SELECT COUNT(*) FROM jobs j
          WHERE j.collector_id = u.id
          AND j.scheduled_date = $1
          AND j.status NOT IN ('CANCELLED')
        )::int as "dailyJobCount",
        (
          SELECT MAX(j.completed_at) FROM jobs j
          WHERE j.collector_id = u.id
          AND j.status IN ('COMPLETED', 'VALIDATED', 'RATED')
        ) as "lastCompletedAt"
      FROM users u
      WHERE u.role = 'COLLECTOR'
        AND u.is_active = true
      `,
      [job.scheduledDate],
    );

    const candidates: CollectorCandidate[] = [];

    for (const raw of rawCollectors) {
      // Filter: max concurrent jobs
      if (raw.activeJobCount >= config.maxConcurrentJobs) continue;

      // Filter: max daily jobs
      if (raw.dailyJobCount >= config.maxDailyJobs) continue;

      // Filter: distance (if both have coordinates)
      let distanceKm = 0;
      if (
        job.locationLat != null &&
        job.locationLng != null &&
        raw.latitude != null &&
        raw.longitude != null
      ) {
        distanceKm = haversineDistance(
          Number(raw.latitude),
          Number(raw.longitude),
          Number(job.locationLat),
          Number(job.locationLng),
        );
        if (distanceKm > config.maxRadiusKm) continue;
      }
      // If no coordinates on collector → include (manual fallback per spec)

      // Filter: timeslot availability
      const available = await this.timeslotsService.isCollectorAvailable(
        raw.id,
        dayOfWeek,
        jobStart,
        jobEnd,
      );
      if (!available) continue;

      candidates.push({
        id: raw.id,
        distanceKm,
        activeJobCount: raw.activeJobCount,
        dailyJobCount: raw.dailyJobCount,
        avgRating: Number(raw.avgRating) || 0,
        lastCompletedAt: raw.lastCompletedAt
          ? new Date(raw.lastCompletedAt)
          : null,
      });
    }

    return candidates;
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  private escalate(job: Job, attempts: number): void {
    const payload: JobAssignmentEscalatedPayload = {
      jobId: job.id,
      householdId: job.householdId,
      attempts,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(JobEvents.ASSIGNMENT_ESCALATED, payload);
    this.logger.warn(
      `Job ${job.id} escalated after ${attempts} assignment attempts`,
    );
  }
}

// ─── GEO UTILITY ──────────────────────────────────────────────

/**
 * Haversine distance between two lat/lng points in km.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
