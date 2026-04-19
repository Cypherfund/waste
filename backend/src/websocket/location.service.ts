import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationUpdate } from './entities/location-update.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobStatus } from '../common/enums/job-status.enum';

export interface LocationUpdateInput {
  jobId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
  networkType?: string | null;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    @InjectRepository(LocationUpdate)
    private readonly locationRepo: Repository<LocationUpdate>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  /**
   * Upsert the latest location for a job.
   * Validates: job exists, is IN_PROGRESS, collector owns it, coordinates valid.
   */
  async updateLocation(
    collectorId: string,
    input: LocationUpdateInput,
  ): Promise<LocationUpdate> {
    // Validate coordinates
    this.validateCoordinates(input.latitude, input.longitude);

    // Validate job
    const job = await this.jobRepo.findOne({
      where: { id: input.jobId },
    });

    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (job.collectorId !== collectorId) {
      throw new ForbiddenException('You are not assigned to this job');
    }

    if (job.status !== JobStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Job must be IN_PROGRESS for location updates, current: ${job.status}`,
      );
    }

    // Upsert: find existing or create new
    let location = await this.locationRepo.findOne({
      where: { jobId: input.jobId },
    });

    if (location) {
      location.latitude = input.latitude;
      location.longitude = input.longitude;
      location.accuracy = input.accuracy;
      location.speed = input.speed ?? null;
      location.heading = input.heading ?? null;
      location.networkType = input.networkType ?? null;
    } else {
      location = this.locationRepo.create({
        jobId: input.jobId,
        collectorId,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        speed: input.speed ?? null,
        heading: input.heading ?? null,
        networkType: input.networkType ?? null,
      });
    }

    return this.locationRepo.save(location);
  }

  /**
   * Get the latest location for a job.
   */
  async getLocation(jobId: string): Promise<LocationUpdate | null> {
    return this.locationRepo.findOne({ where: { jobId } });
  }

  /**
   * Delete location record when job leaves IN_PROGRESS (privacy by design).
   */
  async deleteLocation(jobId: string): Promise<void> {
    await this.locationRepo.delete({ jobId });
  }

  /**
   * Validate latitude/longitude ranges.
   */
  private validateCoordinates(lat: number, lng: number): void {
    if (lat < -90 || lat > 90) {
      throw new BadRequestException(
        `Invalid latitude: ${lat}. Must be between -90 and 90.`,
      );
    }
    if (lng < -180 || lng > 180) {
      throw new BadRequestException(
        `Invalid longitude: ${lng}. Must be between -180 and 180.`,
      );
    }
  }
}
