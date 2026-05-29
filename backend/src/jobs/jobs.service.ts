import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In, DataSource } from 'typeorm';
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
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { PaymentMode } from '../common/enums/payment-mode.enum';
import { User } from '../users/entities/user.entity';
import { CollectorFloatLedger, FloatLedgerType } from '../wallet/entities/collector-float-ledger.entity';
import { UserRole } from '../common/enums/role.enum';
import { PaginatedResponse, paginate } from '../common/dto/pagination.dto';
import {
  JobEvents,
  JobEventPayload,
  JobCancelledPayload,
  JobCompletedPayload,
  JobRejectedPayload,
  ProofEvents,
  SubscriptionEvents,
} from '../events/events.types';
import { FilesService } from '../files/files.service';
import { PricingService } from '../subscriptions/pricing.service';
import { PaymentService } from '../payments/payment.service';
import { TransactionType } from '../payments/entities/payment-transaction.entity';
import { SystemConfigService } from '../config/system-config.service';
import { EarningsService } from '../earnings/earnings.service';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { CashCollectionType } from '../common/enums/cash-collection-type.enum';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Proof)
    private readonly proofRepo: Repository<Proof>,
    @InjectRepository(UserSubscription)
    private readonly subscriptionRepo: Repository<UserSubscription>,
    private readonly eventEmitter: EventEmitter2,
    private readonly filesService: FilesService,
    private readonly pricingService: PricingService,
    private readonly paymentService: PaymentService,
    private readonly dataSource: DataSource,
    private readonly systemConfigService: SystemConfigService,
    private readonly earningsService: EarningsService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────

  async create(householdId: string, dto: CreateJobDto): Promise<JobResponseDto> {
    // Validate scheduled date is at least booking.min_advance_hours from now
    const scheduledDate = new Date(dto.scheduledDate);
    const minAdvanceHours = await this.systemConfigService.getNumber('booking.min_advance_hours', 24);
    const earliest = new Date(Date.now() + minAdvanceHours * 60 * 60 * 1000);
    earliest.setHours(0, 0, 0, 0);

    if (scheduledDate < earliest) {
      throw new BadRequestException(
        `Booking must be scheduled at least ${minAdvanceHours} hours in advance`,
      );
    }

    // Duplicate check: mirrors DDL unique partial index idx_jobs_no_duplicate
    const activeStatuses = [JobStatus.REQUESTED, JobStatus.ASSIGNED, JobStatus.IN_PROGRESS, JobStatus.PAYMENT_PENDING];
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

    // Get pricing quote first (server-side, never trusts client amount)
    const pricingQuote = await this.pricingService.getQuoteForUser(householdId);

    // Determine payment mode and statuses
    let paymentMode: PaymentMode = PaymentMode.NONE;
    let initialStatus: JobStatus = JobStatus.REQUESTED;
    let paymentStatus: PaymentStatus = PaymentStatus.NOT_REQUIRED;

    if (pricingQuote.isCoveredBySubscription) {
      // 1. Subscription-covered: no payment required
      paymentMode = PaymentMode.NONE;
      initialStatus = JobStatus.REQUESTED;
      paymentStatus = PaymentStatus.NOT_REQUIRED;
    } else if (dto.paymentMode === PaymentMode.CASH) {
      // 2. Cash: collector collects at pickup
      paymentMode = PaymentMode.CASH;
      initialStatus = JobStatus.REQUESTED;
      paymentStatus = PaymentStatus.PENDING;
      if (dto.paymentRef || dto.paymentCode || dto.paymentPhone) {
        throw new BadRequestException('paymentRef, paymentCode, and paymentPhone must not be provided for CASH payments');
      }
    } else if (dto.paymentMethod) {
      // 3. Provider-based: look up provider
      const provider = await this.paymentService.getProviderByCode(dto.paymentMethod);
      if (!provider) {
        throw new BadRequestException(`Payment provider '${dto.paymentMethod}' not found or not enabled`);
      }

      if (provider.integrationEnabled && dto.paymentCode && dto.paymentPhone) {
        // 3a. Integrated provider
        paymentMode = PaymentMode.INTEGRATED_PROVIDER;
        initialStatus = JobStatus.PAYMENT_PENDING;
        paymentStatus = PaymentStatus.PROVIDER_PENDING;
      } else if (!provider.integrationEnabled) {
        // 3b. Manual provider
        if (!dto.paymentRef) {
          throw new BadRequestException('paymentRef is required for manual provider payments');
        }
        if (provider.manualProofRequired && !dto.paymentProofUrl) {
          throw new BadRequestException('paymentProofUrl is required for this payment provider');
        }
        paymentMode = PaymentMode.MANUAL_PROVIDER;
        initialStatus = JobStatus.PAYMENT_PENDING;
        paymentStatus = PaymentStatus.AWAITING_ADMIN_VERIFICATION;
      } else {
        throw new BadRequestException('Invalid payment configuration: integrated provider requires paymentCode and paymentPhone');
      }
    }

    // Consume pickup if covered by subscription (atomic — blocks over-booking on concurrent requests)
    if (pricingQuote.isCoveredBySubscription) {
      const consumed = await this.pricingService.consumePickup(householdId);
      if (!consumed) {
        throw new ConflictException(
          'Your weekly pickup quota has been exhausted. Please wait until next week or upgrade your plan.',
        );
      }
    }

    const job = this.jobRepo.create({
      householdId,
      status: initialStatus,
      scheduledDate: dto.scheduledDate,
      scheduledTime: dto.scheduledTime,
      locationAddress: dto.locationAddress,
      locationLat: dto.locationLat ?? null,
      locationLng: dto.locationLng ?? null,
      notes: dto.notes ?? null,
      paymentMode,
      paymentMethod: dto.paymentMethod ?? null,
      paymentRef: dto.paymentRef ?? null,
      paymentProofUrl: dto.paymentProofUrl ?? null,
      paymentPhone: dto.paymentPhone ?? null,
      paymentStatus,
      quotedPrice: pricingQuote.quotedPrice,
      pricingType: pricingQuote.pricingType,
      isCoveredBySubscription: pricingQuote.isCoveredBySubscription,
    });

    const saved = await this.jobRepo.save(job);
    this.logger.log(`Job created: ${saved.id} by household ${householdId} [mode=${paymentMode}]`);

    // Initiate integrated provider payment (stub: sets PROVIDER_PENDING; no real gateway call required for now)
    if (paymentMode === PaymentMode.INTEGRATED_PROVIDER && dto.paymentCode && dto.paymentPhone) {
      try {
        const paymentTx = await this.paymentService.initiatePayment(householdId, {
          type: TransactionType.CASHIN,
          amount: pricingQuote.quotedPrice,
          paymentCode: dto.paymentCode,
          phone: dto.paymentPhone,
          jobId: saved.id,
        });
        this.logger.log(`Integrated payment initiated for job ${saved.id}: tx ${paymentTx.id}`);
      } catch (error) {
        this.logger.error(`Failed to initiate integrated payment for job ${saved.id}: ${error.message}`);
      }
    }

    this.emitEvent(JobEvents.CREATED, saved);

    return await this.toResponseDto(saved);
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

    const data = await Promise.all(jobs.map((job) => this.toResponseDto(job)));
    return paginate(data, total, page, limit);
  }

  async findAssigned(
    collectorId: string,
    filters: JobFilterDto,
  ): Promise<PaginatedResponse<JobResponseDto>> {
    const where: FindOptionsWhere<Job> = { collectorId };

    if (filters.status) {
      where.status = filters.status;
    } else {
      // By default, include all job statuses for collectors: ASSIGNED, IN_PROGRESS, COMPLETED, VALIDATED, RATED
      // This ensures completed jobs show up in the collector's job list
      where.status = In([
        JobStatus.ASSIGNED,
        JobStatus.IN_PROGRESS,
        JobStatus.COMPLETED,
        JobStatus.VALIDATED,
        JobStatus.RATED,
      ]);
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

    const data = await Promise.all(jobs.map((job) => this.toResponseDto(job)));
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

    return await this.toResponseDto(job);
  }

  // ─── LIFECYCLE ────────────────────────────────────────────────

  async acceptJob(jobId: string, collectorId: string): Promise<JobResponseDto> {
    // Pessimistic lock to prevent race with timeout/reassignment (Phase 2 §4.2)
    const result = await this.jobRepo.manager.transaction(async (manager) => {
      // Lock without relations to avoid FOR UPDATE on nullable outer join (collector)
      const job = await manager.findOne(Job, {
        where: { id: jobId },
        lock: { mode: 'pessimistic_write' },
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

    // Reload with relations for the response DTO
    const fullJob = await this.loadJob(result.id);

    this.emitEvent(JobEvents.ACCEPTED, fullJob);

    return await this.toResponseDto(fullJob);
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

    return await this.toResponseDto(saved);
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

    // Cash settlement: require confirmation and deduct platform share from float
    if (job.paymentMode === PaymentMode.CASH) {
      if (!dto.cashCollected) {
        throw new BadRequestException('cashCollected must be true to complete a CASH job');
      }
      if (
        dto.collectedAmount !== undefined &&
        job.quotedPrice != null &&
        dto.collectedAmount < Number(job.quotedPrice)
      ) {
        throw new BadRequestException(
          `collectedAmount (${dto.collectedAmount}) is less than quotedPrice (${job.quotedPrice})`,
        );
      }
      if (job.quotedPrice && job.quotedPrice > 0) {
        await this.dataSource.transaction(async (em) => {
          const collector = await em
            .getRepository(User)
            .createQueryBuilder('u')
            .where('u.id = :id', { id: collectorId })
            .setLock('pessimistic_write')
            .getOne();
          if (!collector) throw new NotFoundException('Collector not found');

          const earningsCalc = await this.earningsService.calculateEarnings(job);
          const collectorEarning = Math.min(earningsCalc.totalAmount, Number(job.quotedPrice));
          const platformShare = Math.max(Number(job.quotedPrice) - collectorEarning, 0);
          const currentFloat = Number(collector.collectorFloatBalance);

          if (currentFloat < platformShare) {
            throw new BadRequestException(
              `Insufficient float balance. Required: ${platformShare} XAF, Available: ${currentFloat} XAF`,
            );
          }

          const newFloat = currentFloat - platformShare;
          await em
            .createQueryBuilder()
            .update(User)
            .set({ collectorFloatBalance: () => `collector_float_balance - ${platformShare}` })
            .where('id = :id', { id: collectorId })
            .execute();

          const ledgerEntry = em.getRepository(CollectorFloatLedger).create({
            collectorId,
            jobId: job.id,
            type: FloatLedgerType.CASH_SETTLEMENT_DEDUCTION,
            amount: platformShare,
            balanceBefore: currentFloat,
            balanceAfter: newFloat,
            createdBy: null,
          });
          await em.getRepository(CollectorFloatLedger).save(ledgerEntry);
        });

        job.paymentStatus = PaymentStatus.VERIFIED;
      }
    }

    // Cash on First Pickup: require exact cash confirmation, deduct platform share, activate subscription
    if (job.paymentMode === PaymentMode.CASH_ON_FIRST_PICKUP) {
      if (dto.cashCollectedAmount === undefined) {
        throw new BadRequestException('cashCollectedAmount is required for CASH_ON_FIRST_PICKUP jobs');
      }
      if (job.cashToCollectAmount === null) {
        throw new BadRequestException('cashToCollectAmount is not set for this job');
      }
      if (dto.cashCollectedAmount !== Number(job.cashToCollectAmount)) {
        throw new BadRequestException(
          `cashCollectedAmount (${dto.cashCollectedAmount}) must equal cashToCollectAmount (${job.cashToCollectAmount})`,
        );
      }
      if (job.cashCollectionType !== CashCollectionType.SUBSCRIPTION_FIRST_PICKUP) {
        throw new BadRequestException('Invalid cash collection type for CASH_ON_FIRST_PICKUP job');
      }

      // Full atomic transaction for CASH_ON_FIRST_PICKUP completion
      const result = await this.dataSource.transaction(async (em) => {
        // Lock job for idempotency
        const lockedJob = await em
          .getRepository(Job)
          .createQueryBuilder('j')
          .where('j.id = :id', { id: jobId })
          .setLock('pessimistic_write')
          .getOne();
        if (!lockedJob) throw new NotFoundException('Job not found');

        // Idempotency check: if already completed, return early
        if (lockedJob.status === JobStatus.COMPLETED) {
          this.logger.log(`Job ${jobId} already completed, skipping float deduction`);
          return { alreadyCompleted: true, savedJob: lockedJob, savedProof: null };
        }

        // Lock collector float
        const collector = await em
          .getRepository(User)
          .createQueryBuilder('u')
          .where('u.id = :id', { id: collectorId })
          .setLock('pessimistic_write')
          .getOne();
        if (!collector) throw new NotFoundException('Collector not found');

        // Lock subscription
        if (!job.subscriptionId) {
          throw new BadRequestException('Subscription ID is required for CASH_ON_FIRST_PICKUP job');
        }
        const subscription = await em
          .getRepository(UserSubscription)
          .createQueryBuilder('s')
          .where('s.id = :id', { id: job.subscriptionId })
          .setLock('pessimistic_write')
          .leftJoinAndSelect('s.plan', 'plan')
          .getOne();
        if (!subscription) throw new NotFoundException('Subscription not found');

        // Calculate collector earning using locked job
        const earningsCalc = await this.earningsService.calculateEarnings(lockedJob);
        const collectorEarning = Math.min(earningsCalc.totalAmount, Number(lockedJob.cashToCollectAmount));
        const platformShare = Math.max(Number(lockedJob.cashToCollectAmount) - collectorEarning, 0);
        const currentFloat = Number(collector.collectorFloatBalance);

        // Re-check collector float at completion (not just assignment estimate)
        if (currentFloat < platformShare) {
          throw new BadRequestException(
            `Insufficient float balance. Required: ${platformShare} XAF, Available: ${currentFloat} XAF`,
          );
        }

        // Deduct platform share from collector float
        const newFloat = currentFloat - platformShare;
        await em
          .createQueryBuilder()
          .update(User)
          .set({ collectorFloatBalance: () => `collector_float_balance - ${platformShare}` })
          .where('id = :id', { id: collectorId })
          .execute();

        // Create float ledger entry for platform share deduction
        const ledgerEntry = em.getRepository(CollectorFloatLedger).create({
          collectorId,
          jobId: lockedJob.id,
          subscriptionId: subscription.id,
          type: FloatLedgerType.CASH_SUBSCRIPTION_PLATFORM_SHARE,
          amount: -platformShare,
          balanceBefore: currentFloat,
          balanceAfter: newFloat,
          createdBy: null,
        });
        await em.getRepository(CollectorFloatLedger).save(ledgerEntry);

        // Activate subscription with week reset date
        const monday = this.getMondayOfWeek(new Date());
        const mondayStr = monday.toISOString().split('T')[0];
        subscription.status = SubscriptionStatus.ACTIVE;
        subscription.paymentStatus = PaymentStatus.VERIFIED;
        subscription.remainingPickupsThisWeek = subscription.plan.pickupsPerWeek - 1; // First pickup consumed
        subscription.weekResetDate = mondayStr;
        await em.getRepository(UserSubscription).save(subscription);

        this.logger.log(
          `Activated subscription ${subscription.id} after cash collection, remaining pickups: ${subscription.remainingPickupsThisWeek}`,
        );

        // Update job status and payment status atomically
        lockedJob.paymentStatus = PaymentStatus.VERIFIED;
        lockedJob.status = JobStatus.COMPLETED;
        lockedJob.completedAt = new Date();
        const savedJob = await em.getRepository(Job).save(lockedJob);

        // Create proof record
        const proof = em.getRepository(Proof).create({
          jobId: savedJob.id,
          imageUrl: dto.proofImageUrl,
          collectorLat: dto.collectorLat ?? null,
          collectorLng: dto.collectorLng ?? null,
        });
        const savedProof = await em.getRepository(Proof).save(proof);

        return { alreadyCompleted: false, savedJob, savedProof };
      });

      // If already completed, fetch existing proof and return
      if (result.alreadyCompleted) {
        const existingProof = await this.proofRepo.findOne({ where: { jobId: result.savedJob.id } });
        return await this.toResponseDto(result.savedJob);
      }

      const saved = result.savedJob;
      const savedProof = result.savedProof;

      // Mark file as used in Files module (outside transaction as it's external service)
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

      // Emit subscription paid event for cash-on-first-pickup activation
      if (job.subscriptionId) {
        this.eventEmitter.emit(SubscriptionEvents.PAID, {
          subscriptionId: job.subscriptionId,
          userId: saved.householdId,
          planId: job.subscriptionId, // Will be resolved by event listener
          planName: 'Subscription',
          amount: Number(job.cashToCollectAmount),
          timestamp: new Date(),
        });
      }

      return await this.toResponseDto(saved);
    }

    // Normal completion flow for non-CASH_ON_FIRST_PICKUP jobs
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

    return await this.toResponseDto(saved);
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

    return await this.toResponseDto(saved);
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

    return await this.toResponseDto(saved);
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

  private async calculateCollectorEarnings(job: Job): Promise<number> {
    const earningsCalc = await this.earningsService.calculateEarnings(job);
    return Math.min(earningsCalc.totalAmount, Number(job.quotedPrice));
  }

  private async getPaymentMethodName(paymentCode: string): Promise<string | null> {
    try {
      const provider = await this.paymentService.getProviderByCode(paymentCode);
      return provider?.providerName ?? null;
    } catch {
      return null;
    }
  }

  async toResponseDto(job: Job): Promise<JobResponseDto> {
    return {
      id: job.id,
      householdId: job.householdId,
      householdName: job.household?.name,
      collectorId: job.collectorId,
      collectorName: job.collector?.name ?? null,
      collectorPhone: job.collector?.phone ?? null,
      collectorRating: job.collector?.avgRating ?? null,
      collectorAvatarUrl: job.collector?.avatarUrl ?? null,
      status: job.status,
      scheduledDate: job.scheduledDate,
      scheduledTime: job.scheduledTime,
      locationAddress: job.locationAddress,
      locationLat: job.locationLat,
      locationLng: job.locationLng,
      notes: job.notes,
      paymentMode: job.paymentMode,
      paymentMethod: job.paymentMethod,
      paymentMethodName: job.paymentMethod ? await this.getPaymentMethodName(job.paymentMethod) : null,
      paymentRef: job.paymentRef,
      paymentProofUrl: job.paymentProofUrl,
      paymentStatus: job.paymentStatus,
      quotedPrice: job.quotedPrice,
      pricingType: job.pricingType,
      isCoveredBySubscription: job.isCoveredBySubscription,
      collectorEarnings: job.quotedPrice ? await this.calculateCollectorEarnings(job) : null,
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
