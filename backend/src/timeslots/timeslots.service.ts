import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectorAvailability } from './entities/collector-availability.entity';
import { AvailabilitySlotDto } from './dto/set-availability.dto';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { DayOfWeek } from '../common/enums/day-of-week.enum';

@Injectable()
export class TimeslotsService {
  private readonly logger = new Logger(TimeslotsService.name);

  constructor(
    @InjectRepository(CollectorAvailability)
    private readonly availabilityRepo: Repository<CollectorAvailability>,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────

  /**
   * Set availability slots for a collector.
   * Validates time ranges and prevents overlapping slots on the same day.
   */
  async setAvailability(
    collectorId: string,
    slots: AvailabilitySlotDto[],
  ): Promise<AvailabilityResponseDto[]> {
    const results: AvailabilityResponseDto[] = [];

    for (const slot of slots) {
      // Validate endTime > startTime
      if (!this.isValidTimeRange(slot.startTime, slot.endTime)) {
        throw new BadRequestException(
          `endTime (${slot.endTime}) must be after startTime (${slot.startTime})`,
        );
      }

      // Check overlap with existing slots for the same day
      const hasOverlap = await this.hasOverlappingSlot(
        collectorId,
        slot.dayOfWeek,
        slot.startTime,
        slot.endTime,
      );

      if (hasOverlap) {
        throw new ConflictException(
          `Overlapping slot exists for ${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}`,
        );
      }

      // Check overlap with other slots in the same batch
      const batchOverlap = results.some(
        (r) =>
          r.collectorId === collectorId &&
          r.dayOfWeek === slot.dayOfWeek &&
          this.timesOverlap(slot.startTime, slot.endTime, r.startTime, r.endTime),
      );

      if (batchOverlap) {
        throw new ConflictException(
          `Overlapping slots in batch for ${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}`,
        );
      }

      const entity = this.availabilityRepo.create({
        collectorId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive ?? true,
      });

      const saved = await this.availabilityRepo.save(entity);
      results.push(this.toResponseDto(saved));
    }

    this.logger.log(
      `Collector ${collectorId} set ${results.length} availability slot(s)`,
    );

    return results;
  }

  /**
   * Get all availability slots for a collector.
   */
  async getAvailability(collectorId: string): Promise<AvailabilityResponseDto[]> {
    const slots = await this.availabilityRepo.find({
      where: { collectorId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });

    return slots.map((s) => this.toResponseDto(s));
  }

  // ─── AVAILABILITY CHECKS (used by AssignmentService) ──────────

  /**
   * Check if a collector is available for the given day and time window.
   * A collector with NO availability defined is treated as always available (flexible).
   */
  async isCollectorAvailable(
    collectorId: string,
    dayOfWeek: DayOfWeek,
    jobStart: string,
    jobEnd: string,
  ): Promise<boolean> {
    // Check if collector has any active slots defined
    const totalSlots = await this.availabilityRepo.count({
      where: { collectorId, isActive: true },
    });

    // No slots defined = flexible/always available
    if (totalSlots === 0) return true;

    // Check if any active slot fully covers the job window
    const coveringSlot = await this.availabilityRepo
      .createQueryBuilder('ca')
      .where('ca.collector_id = :collectorId', { collectorId })
      .andWhere('ca.day_of_week = :dayOfWeek', { dayOfWeek })
      .andWhere('ca.start_time <= :jobStart', { jobStart })
      .andWhere('ca.end_time >= :jobEnd', { jobEnd })
      .andWhere('ca.is_active = true')
      .getOne();

    return !!coveringSlot;
  }

  /**
   * Convenience overload: check availability from scheduledDate + scheduledTime.
   */
  async isCollectorAvailableForJob(
    collectorId: string,
    scheduledDate: string,
    scheduledTime: string,
  ): Promise<boolean> {
    const dayOfWeek = this.getDayOfWeek(scheduledDate);
    const [jobStart, jobEnd] = this.parseTimeWindow(scheduledTime);
    return this.isCollectorAvailable(collectorId, dayOfWeek, jobStart, jobEnd);
  }

  /**
   * Get list of collector IDs available for a given date and time window.
   */
  async getAvailableCollectorsForTime(
    scheduledDate: string,
    scheduledTime: string,
  ): Promise<string[]> {
    const dayOfWeek = this.getDayOfWeek(scheduledDate);
    const [jobStart, jobEnd] = this.parseTimeWindow(scheduledTime);

    // Collectors with matching slots
    const withSlots = await this.availabilityRepo
      .createQueryBuilder('ca')
      .select('DISTINCT ca.collector_id', 'collectorId')
      .where('ca.day_of_week = :dayOfWeek', { dayOfWeek })
      .andWhere('ca.start_time <= :jobStart', { jobStart })
      .andWhere('ca.end_time >= :jobEnd', { jobEnd })
      .andWhere('ca.is_active = true')
      .getRawMany();

    return withSlots.map((r) => r.collectorId);
  }

  // ─── UTILITIES (pure, testable) ───────────────────────────────

  /**
   * Get the day-of-week enum from a date string (YYYY-MM-DD).
   */
  getDayOfWeek(dateStr: string): DayOfWeek {
    const date = new Date(dateStr + 'T00:00:00');
    const jsDay = date.getDay(); // 0=Sun, 1=Mon, ...
    const map: DayOfWeek[] = [
      DayOfWeek.SUN,
      DayOfWeek.MON,
      DayOfWeek.TUE,
      DayOfWeek.WED,
      DayOfWeek.THU,
      DayOfWeek.FRI,
      DayOfWeek.SAT,
    ];
    return map[jsDay];
  }

  /**
   * Parse a time window string "HH:mm-HH:mm" into [start, end].
   */
  parseTimeWindow(scheduledTime: string): [string, string] {
    const [start, end] = scheduledTime.split('-');
    return [start.trim(), end.trim()];
  }

  /**
   * Validate that endTime is strictly after startTime.
   */
  isValidTimeRange(startTime: string, endTime: string): boolean {
    return endTime > startTime;
  }

  /**
   * Check if two time ranges overlap.
   * Two ranges [s1,e1] and [s2,e2] overlap when s1 < e2 AND s2 < e1.
   */
  timesOverlap(
    s1: string,
    e1: string,
    s2: string,
    e2: string,
  ): boolean {
    return s1 < e2 && s2 < e1;
  }

  // ─── PRIVATE ──────────────────────────────────────────────────

  /**
   * Check if a new slot overlaps any existing active slot for the same collector+day.
   */
  private async hasOverlappingSlot(
    collectorId: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    // Overlap: existing.start < newEnd AND newStart < existing.end
    const overlap = await this.availabilityRepo
      .createQueryBuilder('ca')
      .where('ca.collector_id = :collectorId', { collectorId })
      .andWhere('ca.day_of_week = :dayOfWeek', { dayOfWeek })
      .andWhere('ca.is_active = true')
      .andWhere('ca.start_time < :endTime', { endTime })
      .andWhere('ca.end_time > :startTime', { startTime })
      .getOne();

    return !!overlap;
  }

  private toResponseDto(slot: CollectorAvailability): AvailabilityResponseDto {
    return {
      id: slot.id,
      collectorId: slot.collectorId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
      createdAt: slot.createdAt,
      updatedAt: slot.updatedAt,
    };
  }
}
