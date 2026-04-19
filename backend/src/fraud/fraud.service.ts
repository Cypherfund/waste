import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FraudFlag } from './entities/fraud-flag.entity';
import { Proof } from '../jobs/entities/proof.entity';
import { Job } from '../jobs/entities/job.entity';
import { UsersService } from '../users/users.service';
import { SystemConfigService } from '../config/system-config.service';
import { ReviewFraudFlagDto } from './dto/review-fraud-flag.dto';
import { FraudType, FraudFlagStatus } from '../common/enums/fraud-type.enum';
import { FraudSeverity } from '../common/enums/fraud-severity.enum';
import { JobStatus } from '../common/enums/job-status.enum';
import { haversineDistance } from '../assignment/assignment.service';
import {
  JobEvents,
  JobEventPayload,
  JobCompletedPayload,
  FraudEvents,
} from '../events/events.types';

@Injectable()
export class FraudService {
  private readonly logger = new Logger(FraudService.name);

  constructor(
    @InjectRepository(FraudFlag)
    private readonly flagRepo: Repository<FraudFlag>,
    @InjectRepository(Proof)
    private readonly proofRepo: Repository<Proof>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly usersService: UsersService,
    private readonly systemConfigService: SystemConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── EVENT LISTENERS ──────────────────────────────────────────

  @OnEvent(JobEvents.COMPLETED)
  async onJobCompleted(payload: JobCompletedPayload): Promise<void> {
    try {
      const job = await this.jobRepo.findOne({
        where: { id: payload.jobId },
      });
      if (!job || !job.collectorId) return;

      const proof = await this.proofRepo.findOne({
        where: { jobId: job.id },
      });

      // Run all detection checks in parallel
      await Promise.all([
        this.checkFastCompletion(job),
        this.checkGpsMismatch(job, proof),
        this.checkImageReuse(proof, job.collectorId),
        this.checkSuspiciousPattern(job.collectorId),
      ]);
    } catch (err) {
      this.logger.error(`Fraud check failed for job ${payload.jobId}: ${err.message}`);
    }
  }

  // ─── DETECTION METHODS ────────────────────────────────────────

  /**
   * FAST_COMPLETION: flag if job completed < threshold minutes after IN_PROGRESS.
   */
  async checkFastCompletion(job: Job): Promise<FraudFlag | null> {
    if (!job.startedAt || !job.completedAt) return null;

    const thresholdMinutes = await this.systemConfigService.getNumber(
      'fraud.fast_completion_minutes',
      5,
    );

    const durationMinutes =
      (job.completedAt.getTime() - job.startedAt.getTime()) / (1000 * 60);

    if (durationMinutes >= thresholdMinutes) return null;

    return this.createFlag({
      jobId: job.id,
      collectorId: job.collectorId!,
      type: FraudType.FAST_COMPLETION,
      severity: FraudSeverity.MEDIUM,
      details: {
        durationMinutes: Math.round(durationMinutes * 100) / 100,
        thresholdMinutes,
        startedAt: job.startedAt.toISOString(),
        completedAt: job.completedAt.toISOString(),
      },
    });
  }

  /**
   * GPS_MISMATCH: flag if collector completion coords are too far from job location.
   */
  async checkGpsMismatch(
    job: Job,
    proof: Proof | null,
  ): Promise<FraudFlag | null> {
    // Skip safely if no coordinates available
    if (!proof || proof.collectorLat == null || proof.collectorLng == null) return null;
    if (job.locationLat == null || job.locationLng == null) return null;

    const thresholdKm = await this.systemConfigService.getNumber(
      'fraud.gps_mismatch_km',
      0.5, // 500m default
    );

    const distanceKm = haversineDistance(
      Number(proof.collectorLat),
      Number(proof.collectorLng),
      Number(job.locationLat),
      Number(job.locationLng),
    );

    if (distanceKm <= thresholdKm) return null;

    // HIGH severity if > 2km, MEDIUM otherwise
    const severity = distanceKm > 2 ? FraudSeverity.HIGH : FraudSeverity.MEDIUM;

    return this.createFlag({
      jobId: job.id,
      collectorId: job.collectorId!,
      type: FraudType.GPS_MISMATCH,
      severity,
      details: {
        distanceKm: Math.round(distanceKm * 1000) / 1000,
        thresholdKm,
        proofLat: Number(proof.collectorLat),
        proofLng: Number(proof.collectorLng),
        jobLat: Number(job.locationLat),
        jobLng: Number(job.locationLng),
      },
    });
  }

  /**
   * IMAGE_REUSE: flag if proof imageUrl was used in another proof recently.
   * MVP: simple exact URL match in recent proofs (not this job).
   */
  async checkImageReuse(
    proof: Proof | null,
    collectorId: string,
  ): Promise<FraudFlag | null> {
    if (!proof) return null;

    const existing = await this.proofRepo
      .createQueryBuilder('p')
      .innerJoin('p.job', 'j')
      .where('p.image_url = :url', { url: proof.imageUrl })
      .andWhere('p.id != :proofId', { proofId: proof.id })
      .andWhere('j.collector_id = :collectorId', { collectorId })
      .andWhere('p.uploaded_at > :cutoff', {
        cutoff: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .getOne();

    if (!existing) return null;

    return this.createFlag({
      jobId: proof.jobId,
      collectorId,
      type: FraudType.IMAGE_REUSE,
      severity: FraudSeverity.HIGH,
      details: {
        imageUrl: proof.imageUrl,
        matchedProofId: existing.id,
        matchedJobId: existing.jobId,
      },
    });
  }

  /**
   * SUSPICIOUS_PATTERN: flag if collector completes too many jobs in a short window.
   * Default threshold: > 3 completions in 1 hour.
   */
  async checkSuspiciousPattern(
    collectorId: string,
  ): Promise<FraudFlag | null> {
    const thresholdCount = await this.systemConfigService.getNumber(
      'fraud.suspicious_completions_per_hour',
      3,
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentJobs = await this.jobRepo.find({
      where: {
        collectorId,
        status: JobStatus.COMPLETED,
        completedAt: MoreThan(oneHourAgo),
      },
      order: { completedAt: 'DESC' },
    });

    if (recentJobs.length <= thresholdCount) return null;

    // HIGH if very excessive, MEDIUM otherwise
    const severity =
      recentJobs.length > thresholdCount * 2
        ? FraudSeverity.HIGH
        : FraudSeverity.MEDIUM;

    // Use the most recently completed job as the anchor for this flag
    const latestJob = recentJobs[0];

    return this.createFlag({
      jobId: latestJob.id,
      collectorId,
      type: FraudType.SUSPICIOUS_PATTERN,
      severity,
      details: {
        recentCompletions: recentJobs.length,
        thresholdPerHour: thresholdCount,
        windowStart: oneHourAgo.toISOString(),
        recentJobIds: recentJobs.map((j) => j.id),
      },
    });
  }

  // ─── FLAG CREATION + AUTO-ACTIONS ─────────────────────────────

  /**
   * Create a fraud flag, persist it, emit event, and auto-pause if HIGH severity.
   */
  async createFlag(params: {
    jobId: string;
    collectorId: string;
    type: FraudType;
    severity: FraudSeverity;
    details: Record<string, any>;
  }): Promise<FraudFlag> {
    const flag = this.flagRepo.create({
      jobId: params.jobId,
      collectorId: params.collectorId,
      type: params.type,
      severity: params.severity,
      details: params.details,
      status: FraudFlagStatus.OPEN,
    });

    const saved = await this.flagRepo.save(flag);

    this.logger.warn(
      `Fraud flag ${saved.id} created: type=${params.type} severity=${params.severity} collector=${params.collectorId} job=${params.jobId}`,
    );

    this.eventEmitter.emit(FraudEvents.FLAG_CREATED, {
      flagId: saved.id,
      jobId: params.jobId,
      collectorId: params.collectorId,
      type: params.type,
      severity: params.severity,
      timestamp: new Date(),
    });

    // HIGH severity → auto-pause collector
    if (params.severity === FraudSeverity.HIGH) {
      await this.autoPauseCollector(params.collectorId, saved);
    }

    return saved;
  }

  /**
   * Auto-pause collector by setting isActive = false.
   */
  private async autoPauseCollector(
    collectorId: string,
    flag: FraudFlag,
  ): Promise<void> {
    try {
      await this.usersService.deactivateUser(collectorId);

      this.logger.warn(
        `Collector ${collectorId} auto-paused due to HIGH severity fraud flag ${flag.id}`,
      );

      this.eventEmitter.emit(FraudEvents.COLLECTOR_AUTO_PAUSED, {
        collectorId,
        flagId: flag.id,
        reason: `HIGH severity ${flag.type} fraud detected`,
        timestamp: new Date(),
      });
    } catch (err) {
      this.logger.error(
        `Failed to auto-pause collector ${collectorId}: ${err.message}`,
      );
    }
  }

  // ─── ADMIN-READY REVIEW METHODS ──────────────────────────────

  /**
   * List fraud flags with optional filters.
   */
  async listFlags(filters?: {
    status?: FraudFlagStatus;
    collectorId?: string;
    type?: FraudType;
    severity?: FraudSeverity;
  }): Promise<FraudFlag[]> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.collectorId) where.collectorId = filters.collectorId;
    if (filters?.type) where.type = filters.type;
    if (filters?.severity) where.severity = filters.severity;

    return this.flagRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Review a fraud flag (admin resolution).
   */
  async reviewFlag(
    flagId: string,
    adminId: string,
    dto: ReviewFraudFlagDto,
  ): Promise<FraudFlag> {
    const flag = await this.flagRepo.findOne({ where: { id: flagId } });
    if (!flag) throw new NotFoundException('Fraud flag not found');

    if (flag.status !== FraudFlagStatus.OPEN) {
      throw new BadRequestException('Fraud flag is already reviewed');
    }

    flag.status = dto.resolution;
    flag.reviewedBy = adminId;
    flag.reviewNotes = dto.reviewNotes;
    flag.reviewedAt = new Date();

    const saved = await this.flagRepo.save(flag);

    this.logger.log(
      `Fraud flag ${flagId} reviewed as ${dto.resolution} by admin ${adminId}`,
    );

    this.eventEmitter.emit(FraudEvents.FLAG_REVIEWED, {
      flagId: saved.id,
      jobId: saved.jobId,
      resolution: dto.resolution,
      reviewedBy: adminId,
      timestamp: new Date(),
    });

    return saved;
  }
}
