import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Rating } from './entities/rating.entity';
import { User } from '../users/entities/user.entity';
import { JobsService } from '../jobs/jobs.service';
import { CreateRatingDto, RatingResponseDto } from './dto/create-rating.dto';
import { JobStatus } from '../common/enums/job-status.enum';
import { JobEvents } from '../events/events.types';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepo: Repository<Rating>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jobsService: JobsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a rating for a validated job.
   * - Only household owner can rate
   * - Job must be in VALIDATED status
   * - One rating per job
   * - Transitions job VALIDATED → RATED
   * - Updates collector aggregate stats
   */
  async rateJob(
    jobId: string,
    householdId: string,
    dto: CreateRatingDto,
  ): Promise<RatingResponseDto> {
    const job = await this.jobsService.getJobEntity(jobId);

    // Ownership check
    if (job.householdId !== householdId) {
      throw new ForbiddenException('You can only rate your own jobs');
    }

    // State check
    if (job.status !== JobStatus.VALIDATED) {
      throw new BadRequestException(
        `Job must be in VALIDATED status to rate (current: ${job.status})`,
      );
    }

    // Duplicate check
    const existingRating = await this.ratingRepo.findOne({
      where: { jobId },
    });
    if (existingRating) {
      throw new ConflictException('This job has already been rated');
    }

    // Create rating
    const rating = this.ratingRepo.create({
      jobId,
      householdId,
      collectorId: job.collectorId!,
      value: dto.value,
      comment: dto.comment ?? null,
    });

    const saved = await this.ratingRepo.save(rating);
    this.logger.log(
      `Job ${jobId} rated ${dto.value}/5 by household ${householdId}`,
    );

    // Transition job VALIDATED → RATED (reuse JobsService method)
    await this.jobsService.transitionToRated(jobId);

    // Update collector aggregate stats
    await this.updateCollectorStats(job.collectorId!);

    // Emit JOB_RATED event
    this.eventEmitter.emit(JobEvents.RATED, {
      jobId,
      householdId,
      collectorId: job.collectorId,
      ratingId: saved.id,
      value: dto.value,
      timestamp: new Date(),
    });

    return this.toResponseDto(saved);
  }

  /**
   * Recalculate collector's average rating from all their ratings.
   */
  async updateCollectorStats(collectorId: string): Promise<void> {
    const result = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.value)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.collector_id = :collectorId', { collectorId })
      .getRawOne();

    const avgRating = parseFloat(result.avg) || 0;
    const totalRated = parseInt(result.count, 10) || 0;

    await this.userRepo.update(collectorId, {
      avgRating: Math.round(avgRating * 100) / 100, // 2 decimal places
      totalCompleted: totalRated,
    });

    this.logger.log(
      `Collector ${collectorId} stats updated: avgRating=${avgRating.toFixed(2)}, totalCompleted=${totalRated}`,
    );
  }

  private toResponseDto(rating: Rating): RatingResponseDto {
    return {
      id: rating.id,
      jobId: rating.jobId,
      householdId: rating.householdId,
      collectorId: rating.collectorId,
      value: rating.value,
      comment: rating.comment,
      createdAt: rating.createdAt,
    };
  }
}
