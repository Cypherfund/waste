import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Dispute } from './entities/dispute.entity';
import { JobsService } from '../jobs/jobs.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputeResponseDto } from './dto/dispute-response.dto';
import { JobStatus } from '../common/enums/job-status.enum';
import { DisputeStatus } from '../common/enums/dispute-status.enum';
import { ProofEvents, DisputeEvents } from '../events/events.types';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    private readonly jobsService: JobsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a dispute for a COMPLETED job.
   * - Only household owner
   * - Job must be COMPLETED
   * - One dispute per job
   * - Transitions job COMPLETED → DISPUTED
   */
  async createDispute(
    jobId: string,
    householdId: string,
    dto: CreateDisputeDto,
  ): Promise<DisputeResponseDto> {
    const job = await this.jobsService.getJobEntity(jobId);

    // Ownership check
    if (job.householdId !== householdId) {
      throw new ForbiddenException('You can only dispute your own jobs');
    }

    // State check
    if (job.status !== JobStatus.COMPLETED) {
      throw new BadRequestException(
        `Job must be in COMPLETED status to dispute (current: ${job.status})`,
      );
    }

    // Duplicate check
    const existing = await this.disputeRepo.findOne({ where: { jobId } });
    if (existing) {
      throw new ConflictException('A dispute already exists for this job');
    }

    // Create dispute
    const dispute = this.disputeRepo.create({
      jobId,
      householdId,
      reason: dto.reason,
      status: DisputeStatus.OPEN,
    });

    const saved = await this.disputeRepo.save(dispute);

    // Transition job COMPLETED → DISPUTED
    await this.jobsService.transitionToDisputed(jobId);

    this.logger.log(`Dispute ${saved.id} created for job ${jobId} by household ${householdId}`);

    // Emit events
    this.eventEmitter.emit(ProofEvents.DISPUTED, {
      jobId,
      householdId,
      collectorId: job.collectorId,
      disputeId: saved.id,
      reason: dto.reason,
      timestamp: new Date(),
    });

    return this.toResponseDto(saved);
  }

  /**
   * Resolve a dispute (admin-ready).
   * - RESOLVED_ACCEPTED: validate the job (DISPUTED → VALIDATED)
   * - RESOLVED_REJECTED: cancel the job (DISPUTED → CANCELLED)
   */
  async resolveDispute(
    disputeId: string,
    adminId: string,
    dto: ResolveDisputeDto,
  ): Promise<DisputeResponseDto> {
    const dispute = await this.disputeRepo.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status !== DisputeStatus.OPEN) {
      throw new BadRequestException('Dispute is already resolved');
    }

    dispute.status = dto.resolution;
    dispute.adminNotes = dto.adminNotes;
    dispute.resolvedBy = adminId;
    dispute.resolvedAt = new Date();

    const saved = await this.disputeRepo.save(dispute);

    // Transition job based on resolution
    if (dto.resolution === DisputeStatus.RESOLVED_ACCEPTED) {
      // Dispute accepted → collector was wrong → cancel job
      await this.jobsService.transitionDisputeResolved(dispute.jobId, JobStatus.CANCELLED);
    } else {
      // Dispute rejected → collector was right → validate job
      await this.jobsService.transitionDisputeResolved(dispute.jobId, JobStatus.VALIDATED);
    }

    this.logger.log(
      `Dispute ${disputeId} resolved as ${dto.resolution} by admin ${adminId}`,
    );

    this.eventEmitter.emit(DisputeEvents.RESOLVED, {
      disputeId: saved.id,
      jobId: dispute.jobId,
      resolution: dto.resolution,
      resolvedBy: adminId,
      timestamp: new Date(),
    });

    return this.toResponseDto(saved);
  }

  private toResponseDto(dispute: Dispute): DisputeResponseDto {
    return {
      id: dispute.id,
      jobId: dispute.jobId,
      householdId: dispute.householdId,
      reason: dispute.reason,
      status: dispute.status,
      adminNotes: dispute.adminNotes,
      resolvedBy: dispute.resolvedBy,
      resolvedAt: dispute.resolvedAt,
      createdAt: dispute.createdAt,
    };
  }
}
