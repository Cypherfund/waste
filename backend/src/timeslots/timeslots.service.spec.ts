import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TimeslotsService } from './timeslots.service';
import { CollectorAvailability } from './entities/collector-availability.entity';
import { DayOfWeek } from '../common/enums/day-of-week.enum';

// ─── Helpers ────────────────────────────────────────────────────

function makeSlot(overrides: Partial<CollectorAvailability> = {}): CollectorAvailability {
  return {
    id: 'slot-1',
    collectorId: 'col-1',
    dayOfWeek: DayOfWeek.MON,
    startTime: '08:00',
    endTime: '12:00',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    collector: null as any,
    ...overrides,
  };
}

// ─── Mock query builder ─────────────────────────────────────────

function mockQueryBuilder(result: any = null) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
    getRawMany: jest.fn().mockResolvedValue(result ?? []),
  };
  return qb;
}

describe('TimeslotsService', () => {
  let service: TimeslotsService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => ({ ...dto, id: 'new-slot', createdAt: new Date(), updatedAt: new Date() })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeslotsService,
        { provide: getRepositoryToken(CollectorAvailability), useValue: repo },
      ],
    }).compile();

    service = module.get<TimeslotsService>(TimeslotsService);
  });

  // ─── PURE UTILITIES ─────────────────────────────────────────────

  describe('getDayOfWeek', () => {
    it('should return MON for a Monday date', () => {
      // 2026-04-20 is a Monday
      expect(service.getDayOfWeek('2026-04-20')).toBe(DayOfWeek.MON);
    });

    it('should return SUN for a Sunday date', () => {
      // 2026-04-19 is a Sunday
      expect(service.getDayOfWeek('2026-04-19')).toBe(DayOfWeek.SUN);
    });

    it('should return SAT for a Saturday date', () => {
      // 2026-04-25 is a Saturday
      expect(service.getDayOfWeek('2026-04-25')).toBe(DayOfWeek.SAT);
    });
  });

  describe('parseTimeWindow', () => {
    it('should parse "08:00-10:00" into ["08:00", "10:00"]', () => {
      expect(service.parseTimeWindow('08:00-10:00')).toEqual(['08:00', '10:00']);
    });

    it('should handle spaces around dash', () => {
      expect(service.parseTimeWindow('14:00 - 16:00')).toEqual(['14:00', '16:00']);
    });
  });

  describe('isValidTimeRange', () => {
    it('should return true when endTime > startTime', () => {
      expect(service.isValidTimeRange('08:00', '12:00')).toBe(true);
    });

    it('should return false when endTime = startTime', () => {
      expect(service.isValidTimeRange('08:00', '08:00')).toBe(false);
    });

    it('should return false when endTime < startTime', () => {
      expect(service.isValidTimeRange('14:00', '10:00')).toBe(false);
    });
  });

  describe('timesOverlap', () => {
    it('should detect full overlap', () => {
      expect(service.timesOverlap('08:00', '12:00', '09:00', '11:00')).toBe(true);
    });

    it('should detect partial overlap (start)', () => {
      expect(service.timesOverlap('08:00', '12:00', '10:00', '14:00')).toBe(true);
    });

    it('should detect partial overlap (end)', () => {
      expect(service.timesOverlap('10:00', '14:00', '08:00', '12:00')).toBe(true);
    });

    it('should return false for adjacent non-overlapping (end = start)', () => {
      expect(service.timesOverlap('08:00', '10:00', '10:00', '12:00')).toBe(false);
    });

    it('should return false for completely separate ranges', () => {
      expect(service.timesOverlap('08:00', '10:00', '14:00', '16:00')).toBe(false);
    });

    it('should detect when new range fully contains existing', () => {
      expect(service.timesOverlap('06:00', '18:00', '08:00', '12:00')).toBe(true);
    });
  });

  // ─── setAvailability ──────────────────────────────────────────

  describe('setAvailability', () => {
    beforeEach(() => {
      // Default: no overlapping slots
      const qb = mockQueryBuilder(null);
      repo.createQueryBuilder.mockReturnValue(qb);
    });

    it('should create valid slots', async () => {
      const result = await service.setAvailability('col-1', [
        { dayOfWeek: DayOfWeek.MON, startTime: '08:00', endTime: '12:00' },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBe(DayOfWeek.MON);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid time range (end <= start)', async () => {
      await expect(
        service.setAvailability('col-1', [
          { dayOfWeek: DayOfWeek.MON, startTime: '14:00', endTime: '10:00' },
        ]),
      ).rejects.toThrow('endTime (10:00) must be after startTime (14:00)');
    });

    it('should reject equal start and end times', async () => {
      await expect(
        service.setAvailability('col-1', [
          { dayOfWeek: DayOfWeek.MON, startTime: '10:00', endTime: '10:00' },
        ]),
      ).rejects.toThrow('endTime (10:00) must be after startTime (10:00)');
    });

    it('should reject overlapping slot with existing DB slot', async () => {
      const qb = mockQueryBuilder(makeSlot()); // returns existing slot = overlap
      repo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.setAvailability('col-1', [
          { dayOfWeek: DayOfWeek.MON, startTime: '09:00', endTime: '11:00' },
        ]),
      ).rejects.toThrow('Overlapping slot exists');
    });

    it('should reject overlapping slots within same batch', async () => {
      await expect(
        service.setAvailability('col-1', [
          { dayOfWeek: DayOfWeek.MON, startTime: '08:00', endTime: '12:00' },
          { dayOfWeek: DayOfWeek.MON, startTime: '10:00', endTime: '14:00' },
        ]),
      ).rejects.toThrow('Overlapping slots in batch');
    });

    it('should allow non-overlapping slots on same day', async () => {
      const result = await service.setAvailability('col-1', [
        { dayOfWeek: DayOfWeek.MON, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: DayOfWeek.MON, startTime: '14:00', endTime: '18:00' },
      ]);

      expect(result).toHaveLength(2);
    });

    it('should allow slots on different days', async () => {
      const result = await service.setAvailability('col-1', [
        { dayOfWeek: DayOfWeek.MON, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: DayOfWeek.TUE, startTime: '08:00', endTime: '12:00' },
      ]);

      expect(result).toHaveLength(2);
    });
  });

  // ─── getAvailability ──────────────────────────────────────────

  describe('getAvailability', () => {
    it('should return all slots for a collector', async () => {
      const slots = [
        makeSlot({ id: 's1', dayOfWeek: DayOfWeek.MON }),
        makeSlot({ id: 's2', dayOfWeek: DayOfWeek.TUE }),
      ];
      repo.find.mockResolvedValue(slots);

      const result = await service.getAvailability('col-1');

      expect(result).toHaveLength(2);
      expect(repo.find).toHaveBeenCalledWith({
        where: { collectorId: 'col-1' },
        order: { dayOfWeek: 'ASC', startTime: 'ASC' },
      });
    });

    it('should return empty array if no slots', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.getAvailability('col-1');
      expect(result).toEqual([]);
    });
  });

  // ─── isCollectorAvailable ─────────────────────────────────────

  describe('isCollectorAvailable', () => {
    it('should return true if no slots defined (flexible collector)', async () => {
      repo.count.mockResolvedValue(0);

      const result = await service.isCollectorAvailable(
        'col-1', DayOfWeek.MON, '09:00', '11:00',
      );

      expect(result).toBe(true);
    });

    it('should return true if slot fully covers job window', async () => {
      repo.count.mockResolvedValue(2);
      const qb = mockQueryBuilder(makeSlot());
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.isCollectorAvailable(
        'col-1', DayOfWeek.MON, '09:00', '11:00',
      );

      expect(result).toBe(true);
    });

    it('should return false if no slot covers job window', async () => {
      repo.count.mockResolvedValue(2);
      const qb = mockQueryBuilder(null);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.isCollectorAvailable(
        'col-1', DayOfWeek.MON, '09:00', '11:00',
      );

      expect(result).toBe(false);
    });

    it('should return false for wrong day even with valid time', async () => {
      repo.count.mockResolvedValue(2);
      const qb = mockQueryBuilder(null); // no match for WED
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.isCollectorAvailable(
        'col-1', DayOfWeek.WED, '09:00', '11:00',
      );

      expect(result).toBe(false);
    });
  });

  // ─── isCollectorAvailableForJob ───────────────────────────────

  describe('isCollectorAvailableForJob', () => {
    it('should delegate to isCollectorAvailable with parsed date/time', async () => {
      repo.count.mockResolvedValue(0); // flexible

      const result = await service.isCollectorAvailableForJob(
        'col-1', '2026-04-20', '09:00-11:00',
      );

      expect(result).toBe(true);
    });
  });

  // ─── getAvailableCollectorsForTime ────────────────────────────

  describe('getAvailableCollectorsForTime', () => {
    it('should return collector IDs with matching slots', async () => {
      const qb = mockQueryBuilder([
        { collectorId: 'col-1' },
        { collectorId: 'col-2' },
      ]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAvailableCollectorsForTime(
        '2026-04-20', '09:00-11:00',
      );

      expect(result).toEqual(['col-1', 'col-2']);
    });

    it('should return empty array if no matching collectors', async () => {
      const qb = mockQueryBuilder([]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAvailableCollectorsForTime(
        '2026-04-20', '09:00-11:00',
      );

      expect(result).toEqual([]);
    });
  });

  // ─── Edge cases ───────────────────────────────────────────────

  describe('edge cases', () => {
    it('boundary: slot exactly matches job window', async () => {
      repo.count.mockResolvedValue(1);
      const qb = mockQueryBuilder(
        makeSlot({ startTime: '09:00', endTime: '11:00' }),
      );
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.isCollectorAvailable(
        'col-1', DayOfWeek.MON, '09:00', '11:00',
      );
      expect(result).toBe(true);
    });

    it('boundary: adjacent non-overlapping slots should both be valid', () => {
      // 08:00-10:00 and 10:00-12:00 should NOT overlap
      expect(service.timesOverlap('08:00', '10:00', '10:00', '12:00')).toBe(false);
    });

    it('boundary: 1-minute overlap should be detected', () => {
      // 08:00-10:01 and 10:00-12:00 overlap by 1 minute
      expect(service.timesOverlap('08:00', '10:01', '10:00', '12:00')).toBe(true);
    });
  });
});
