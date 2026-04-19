import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from './entities/job.entity';
import { Proof } from './entities/proof.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { CompleteJobDto } from './dto/complete-job.dto';
import { CancelJobDto } from './dto/cancel-job.dto';
import { RejectJobDto } from './dto/reject-job.dto';
import { JobResponseDto } from './dto/job-response.dto';
import { JobFilterDto } from './dto/job-filter.dto';
import { JobStatus, validateTransition } from '../common/enums/job-status.enum';
import { UserRole } from '../common/enums/role.enum';
import { PaginatedResponse, paginate } from '../common/dto/pagination.dto';
import {
  JobEvents,
  JobEventPayload,
  JobCancelledPayload,
  JobCompletedPayload,
  JobRejectedPayload,
  ProofEvents,
} from '../events/events.types';
import { FilesService } from '../files/files.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Proof)
    private readonly proofRepo: Repository<Proof>,
    private readonly eventEmitter: EventEmitter2,
    private readonly filesService: FilesService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────

  async create(householdId: string, dto: CreateJobDto): Promise<JobResponseDto> {
    // Validate scheduled date is in the future
    const scheduledDate = new Date(dto.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (scheduledDate < today) {
      throw new BadRequestException('Scheduled date must be today or in the future');
    }

    // Duplicate check: mirrors DDL unique partial index idx_jobs_no_duplicate
    const activeStatuses = [JobStatus.REQUESTED, JobStatus.ASSIGNED, JobStatus.IN_PROGRESS];
    const existingJob = await this.jobRepo.findOne({
      where: {
        householdId,
        scheduledDate: dto.scheduledDate,
        status: In(activeStatuses),
      },
    });

    if (existingJob) {
      throw new ConflictException(
        'You already have an active job scheduled for this date',
      );
    }

    const job = this.jobRepo.create({
      householdId,
      status: JobStatus.REQUESTED,
      scheduledDate: dto.scheduledDate,
      scheduledTime: dto.scheduledTime,
      locationAddress: dto.locationAddress,
      locationLat: dto.locationLat ?? null,
      locationLng: dto.locationLng ?? null,
      notes: dto.notes ?? null,
    });

    const saved = await this.jobRepo.save(job);
    this.logger.log(`Job created: ${saved.id} by household ${householdId}`);

    this.emitEvent(JobEvents.CREATED, saved);

    return this.toResponseDto(saved);
  }

  async findMyJobs(
    householdId: string,
    filters: JobFilterDto,
  ): Promise<PaginatedResponse<JobResponseDto>> {
    const where: FindOptionsWhere<Job> = { householdId };

    if (filters.status) {
      where.status = filters.status;
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

    const data = jobs.map((job) => this.toResponseDto(job));
    return paginate(data, total, page, limit);
  }

  async findAssigned(
    collectorId: string,
    filters: JobFilterDto,
  ): Promise<PaginatedResponse<JobResponseDto>> {
    const where: FindOptionsWhere<Job> = { collectorId };

    if (filters.status) {
      where.status = filters.status;
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

    const data = jobs.map((job) => this.toResponseDto(job));
    return paginate(data, total, page, limit);
  }

  async findOne(jobId: string, userId: string, role: UserRole): Promise<JobResponseDto> {
    const job = await this.loadJob(jobId);

    // Ownership check: household can see own jobs, collector can see assigned jobs, admin sees all
    if (role === UserRole.HOUSEHOLD && job.householdId !== userId) {
      throw new ForbiddenException('You can only view your own jobs');
    }

    if (role === UserRole.COLLECTOR && job.collectorId !== userId) {
      throw new ForbiddenException('You can only view jobs assigned to you');
    }

    return this.toResponseDto(job);
  }

  // ─── LIFECYCLE ────────────────────────────────────────────────

  async acceptJob(jobId: string, collectorId: string): Promise<JobResponseDto> {
    // Pessimistic lock to prevent race with timeout/reassignment (Phase 2 §4.2)
    const result = await this.jobRepo.manager.transaction(async (manager) => {
      const job = await manager.findOne(Job, {
        where: { id: jobId },
        lock: { mode: 'pessimistic_write' },
        relations: ['household', 'collector'],
      });

      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== JobStatus.ASSIGNED) {
        throw new BadRequestException('Job is not in ASSIGNED status');
      }

      if (job.collectorId !== collectorId) {
        throw new ForbiddenException('This job is not assigned to you');
      }

      // Accept is a confirmation — status stays ASSIGNED per Phase 2 endpoint spec
      // The separate startJob endpoint transitions to IN_PROGRESS
      this.logger.log(`Job ${jobId} accepted by collector ${collectorId}`);
      return job;
    });

    this.emitEvent(JobEvents.ACCEPTED, result);

    return this.toResponseDto(result);
  }

  async rejectJob(
    jobId: string,
    collectorId: string,
    dto: RejectJobDto,
  ): Promise<{ message: string }> {
    const job = await this.loadJob(jobId);

    if (job.status !== JobStatus.ASSIGNED) {
      throw new BadRequestException('Job is not in ASSIGNED status');
    }

    if (job.collectorId !== collectorId) {
      throw new ForbiddenException('This job is not assigned to you');
    }

    // Return to REQUESTED — back to the queue
    this.transition(job, JobStatus.REQUESTED);
    job.collectorId = null;
    job.assignedAt = null;

    const saved = await this.jobRepo.save(job);
    this.logger.log(`Job ${jobId} rejected by collector ${collectorId}`);

    const payload: JobRejectedPayload = {
      jobId: saved.id,
      householdId: saved.householdId,
      collectorId,
      status: saved.status,
      timestamp: new Date(),
      reason: dto.reason,
    };
    this.eventEmitter.emit(JobEvents.REJECTED, payload);

    return { message: 'Job rejected, returning to queue' };
  }

  async startJob(jobId: string, collectorId: string): Promise<JobResponseDto> {
    const job = await this.loadJob(jobId);

    if (job.status !== JobStatus.ASSIGNED) {
      throw new BadRequestException('Job must be in ASSIGNED status to start');
    }

    if (job.collectorId !== collectorId) {
      throw new ForbiddenException('This job is not assigned to you');
    }

    this.transition(job, JobStatus.IN_PROGRESS);
    job.startedAt = new Date();

    const saved = await this.jobRepo.save(job);
    this.logger.log(`Job ${jobId} started by collector ${collectorId}`);

    this.emitEvent(JobEvents.STARTED, saved);

    return this.toResponseDto(saved);
  }

  async completeJob(
    jobId: string,
    collectorId: string,
    dto: CompleteJobDto,
  ): Promise<JobResponseDto> {
    const job = await this.loadJob(jobId);

    if (job.collectorId !== collectorId) {
      throw new ForbiddenException('This job is not assigned to you');
    }

    this.transition(job, JobStatus.COMPLETED);
    job.completedAt = new Date();

    const saved = await this.jobRepo.save(job);

    // Create proof record
    const proof = this.proofRepo.create({
      jobId: saved.id,
      imageUrl: dto.proofImageUrl,
      collectorLat: dto.collectorLat ?? null,
      collectorLng: dto.collectorLng ?? null,
    });
    const savedProof = await this.proofRepo.save(proof);

    // Mark file as used in Files module
    await this.filesService.markUsed(dto.proofImageUrl);

    this.logger.log(`Job ${jobId} completed by collector ${collectorId}, proof ${savedProof.id}`);

    // Emit proof uploaded event
    this.eventEmitter.emit(ProofEvents.UPLOADED, {
      proofId: savedProof.id,
      jobId: saved.id,
      householdId: saved.householdId,
      collectorId,
      timestamp: new Date(),
    });

    const payload: JobCompletedPayload = {
      jobId: saved.id,
      householdId: saved.householdId,
      collectorId: saved.collectorId,
      status: saved.status,
      timestamp: new Date(),
      proofId: savedProof.id,
    };
    this.eventEmitter.emit(JobEvents.COMPLETED, payload);

    return this.toResponseDto(saved);
  }

  async validateJob(jobId: string, householdId: string): Promise<JobResponseDto> {
    const job = await this.loadJob(jobId);

    if (job.householdId !== householdId) {
      throw new ForbiddenException('You can only validate your own jobs');
    }

    this.transition(job, JobStatus.VALIDATED);
    job.validatedAt = new Date();

    const saved = await this.jobRepo.save(job);
    this.logger.log(`Job ${jobId} validated by household ${householdId}`);

    this.emitEvent(JobEvents.VALIDATED, saved);

    // Emit proof validated event
    this.eventEmitter.emit(ProofEvents.VALIDATED, {
      jobId: saved.id,
      householdId: saved.householdId,
      collectorId: saved.collectorId,
      timestamp: new Date(),
    });

    return this.toResponseDto(saved);
  }

  async cancelJob(
    jobId: string,
    userId: string,
    role: UserRole,
    dto: CancelJobDto,
  ): Promise<JobResponseDto> {
    const job = await this.loadJob(jobId);

    // Household can cancel REQUESTED or ASSIGNED jobs; Admin can cancel any non-terminal
    if (role === UserRole.HOUSEHOLD) {
      if (job.householdId !== userId) {
        throw new ForbiddenException('You can only cancel your own jobs');
      }
      if (job.status !== JobStatus.REQUESTED && job.status !== JobStatus.ASSIGNED) {
        throw new BadRequestException(
          'Households can only cancel jobs in REQUESTED or ASSIGNED status',
        );
      }
    } else if (role === UserRole.ADMIN) {
      // Admin can cancel any non-terminal job
    } else {
      throw new ForbiddenException('Only households and admins can cancel jobs');
    }

    this.transition(job, JobStatus.CANCELLED);
    job.cancelledAt = new Date();
    job.cancellationReason = dto.reason ?? null;

    const saved = await this.jobRepo.save(job);
    this.logger.log(`Job ${jobId} cancelled by ${role} ${userId}`);

    const payload: JobCancelledPayload = {
      jobId: saved.id,
      householdId: saved.householdId,
      collectorId: saved.collectorId,
      status: saved.status,
      timestamp: new Date(),
      cancelledBy: userId,
      reason: dto.reason,
    };
    this.eventEmitter.emit(JobEvents.CANCELLED, payload);

    return this.toResponseDto(saved);
  }

  // ─── ASSIGNMENT (called by AssignmentService) ──────────────────

  /**
   * Atomically assign a collector to a job.
   * Uses optimistic locking via version column to prevent double assignment.
   * Only succeeds if job is still in REQUESTED status.
   * Returns true if assigned, false if another process already assigned.
   */
  async assignToCollector(jobId: string, collectorId: string): Promise<boolean> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== JobStatus.REQUESTED) {
      return false; // Already assigned or in another state
    }

    // Atomic update with version check — prevents race conditions
    const result = await this.jobRepo
      .createQueryBuilder()
      .update(Job)
      .set({
        status: JobStatus.ASSIGNED,
        collectorId,
        assignedAt: new Date(),
        assignmentAttempts: () => 'assignment_attempts + 1',
        version: () => 'version + 1',
      })
      .where('id = :id AND version = :version AND status = :status', {
        id: jobId,
        version: job.version,
        status: JobStatus.REQUESTED,
      })
      .execute();

    if (result.affected === 0) {
      this.logger.warn(`Concurrent assignment detected for job ${jobId}`);
      return false;
    }

    this.logger.log(`Job ${jobId} assigned to collector ${collectorId}`);
    return true;
  }

  /**
   * Return job to REQUESTED after rejection/timeout.
   * Increments assignmentAttempts. Returns updated attempts count.
   */
  async unassignCollector(jobId: string): Promise<number> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== JobStatus.ASSIGNED) {
      throw new BadRequestException('Job is not in ASSIGNED status');
    }

    job.status = JobStatus.REQUESTED;
    job.collectorId = null;
    job.assignedAt = null;

    const saved = await this.jobRepo.save(job);
    return saved.assignmentAttempts;
  }

  /**
   * Get the raw Job entity (for AssignmentService reads).
   */
  async getJobEntity(jobId: string): Promise<Job> {
    return this.loadJob(jobId);
  }

  /**
   * Transition a job from VALIDATED → RATED.
   * Called by RatingsService after a rating is created.
   */
  async transitionToRated(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    this.transition(job, JobStatus.RATED);
    await this.jobRepo.save(job);
  }

  /**
   * Transition a job COMPLETED → DISPUTED.
   * Called by DisputesService when a dispute is created.
   */
  async transitionToDisputed(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    this.transition(job, JobStatus.DISPUTED);
    await this.jobRepo.save(job);
    this.eventEmitter.emit(JobEvents.DISPUTED, {
      jobId: job.id,
      householdId: job.householdId,
      collectorId: job.collectorId,
      status: job.status,
      timestamp: new Date(),
    });
  }

  /**
   * Transition a disputed job to VALIDATED or CANCELLED based on admin resolution.
   */
  async transitionDisputeResolved(jobId: string, targetStatus: JobStatus): Promise<void> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['household', 'collector'],
    });
    if (!job) throw new NotFoundException('Job not found');
    this.transition(job, targetStatus);
    if (targetStatus === JobStatus.VALIDATED) {
      job.validatedAt = new Date();
    } else if (targetStatus === JobStatus.CANCELLED) {
      job.cancelledAt = new Date();
    }
    await this.jobRepo.save(job);
    this.emitEvent(
      targetStatus === JobStatus.VALIDATED ? JobEvents.VALIDATED : JobEvents.CANCELLED,
      job,
    );
  }

  /**
   * Transition a COMPLETED job → VALIDATED (used by auto-validation scheduler).
   * Returns the saved job for event emission.
   */
  async autoValidateJob(jobId: string): Promise<Job | null> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['household', 'collector'],
    });
    if (!job) return null;
    if (job.status !== JobStatus.COMPLETED) return null;
    this.transition(job, JobStatus.VALIDATED);
    job.validatedAt = new Date();
    const saved = await this.jobRepo.save(job);
    this.emitEvent(JobEvents.VALIDATED, saved);
    return saved;
  }

  /**
   * Find COMPLETED jobs older than the given date (for auto-validation).
   */
  async findCompletedJobsOlderThan(cutoff: Date): Promise<Job[]> {
    return this.jobRepo
      .createQueryBuilder('j')
      .where('j.status = :status', { status: JobStatus.COMPLETED })
      .andWhere('j.completed_at <= :cutoff', { cutoff })
      .getMany();
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────

  private async loadJob(jobId: string): Promise<Job> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['household', 'collector'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  private transition(job: Job, to: JobStatus): void {
    try {
      validateTransition(job.status, to);
    } catch {
      throw new BadRequestException(
        `Cannot transition from ${job.status} to ${to}`,
      );
    }
    job.status = to;
  }

  private emitEvent(event: string, job: Job): void {
    const payload: JobEventPayload = {
      jobId: job.id,
      householdId: job.householdId,
      collectorId: job.collectorId,
      status: job.status,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(event, payload);
  }

  toResponseDto(job: Job): JobResponseDto {
    return {
      id: job.id,
      householdId: job.householdId,
      householdName: job.household?.name,
      collectorId: job.collectorId,
      collectorName: job.collector?.name ?? null,
      status: job.status,
      scheduledDate: job.scheduledDate,
      scheduledTime: job.scheduledTime,
      locationAddress: job.locationAddress,
      locationLat: job.locationLat,
      locationLng: job.locationLng,
      notes: job.notes,
      assignedAt: job.assignedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      validatedAt: job.validatedAt,
      cancelledAt: job.cancelledAt,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
