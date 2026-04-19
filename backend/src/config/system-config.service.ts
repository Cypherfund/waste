import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  async getString(key: string, defaultValue: string): Promise<string> {
    const config = await this.configRepo.findOne({ where: { key } });
    return config?.value ?? defaultValue;
  }

  async getNumber(key: string, defaultValue: number): Promise<number> {
    const config = await this.configRepo.findOne({ where: { key } });
    if (!config) return defaultValue;
    const parsed = parseFloat(config.value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  async getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    const config = await this.configRepo.findOne({ where: { key } });
    if (!config) return defaultValue;
    return config.value === 'true';
  }

  async listAll(): Promise<SystemConfig[]> {
    return this.configRepo.find({ order: { category: 'ASC', key: 'ASC' } });
  }

  async upsert(
    key: string,
    value: string,
    updatedBy: string,
  ): Promise<SystemConfig> {
    let config = await this.configRepo.findOne({ where: { key } });
    if (config) {
      config.value = value;
      config.updatedBy = updatedBy;
      config.updatedAt = new Date();
    } else {
      config = this.configRepo.create({
        key,
        value,
        category: key.split('.')[0] || 'general',
        dataType: 'string',
        updatedBy,
      });
    }
    return this.configRepo.save(config);
  }

  async getAssignmentConfig(): Promise<AssignmentConfig> {
    const [
      maxRadiusKm,
      maxConcurrentJobs,
      maxDailyJobs,
      weightDistance,
      weightWorkload,
      weightRating,
      weightRecency,
      acceptTimeoutMinutes,
      maxReassignAttempts,
    ] = await Promise.all([
      this.getNumber('assignment.max_radius_km', 10),
      this.getNumber('assignment.max_concurrent_jobs', 5),
      this.getNumber('assignment.max_daily_jobs', 15),
      this.getNumber('assignment.weight_distance', 0.4),
      this.getNumber('assignment.weight_workload', 0.3),
      this.getNumber('assignment.weight_rating', 0.15),
      this.getNumber('assignment.weight_recency', 0.15),
      this.getNumber('assignment.accept_timeout_minutes', 10),
      this.getNumber('assignment.max_reassign_attempts', 3),
    ]);

    return {
      maxRadiusKm,
      maxConcurrentJobs,
      maxDailyJobs,
      weightDistance,
      weightWorkload,
      weightRating,
      weightRecency,
      acceptTimeoutMinutes,
      maxReassignAttempts,
    };
  }
}

export interface AssignmentConfig {
  maxRadiusKm: number;
  maxConcurrentJobs: number;
  maxDailyJobs: number;
  weightDistance: number;
  weightWorkload: number;
  weightRating: number;
  weightRecency: number;
  acceptTimeoutMinutes: number;
  maxReassignAttempts: number;
}
