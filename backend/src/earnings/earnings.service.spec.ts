import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EarningsService } from './earnings.service';
import { Earning } from './entities/earning.entity';
import { Job } from '../jobs/entities/job.entity';
import { EarningStatus } from '../common/enums/earning-status.enum';
import { SystemConfigService } from '../config/system-config.service';
import { FeatureFlagService, FEATURE_FLAGS } from '../config/feature-flags';
import { JobStatus } from '../common/enums/job-status.enum';
import { EarningsEvents } from '../events/events.types';

describe('EarningsService', () => {
  let service: EarningsService;
  let earningRepo: any;
  let jobRepo: any;
  let systemConfigService: any;
  let featureFlagService: any;
  let eventEmitter: any;

  const makeJob = (overrides: any = {}): any => ({
    id: 'job-1',
    householdId: 'hh-1',
    collectorId: 'col-1',
    status: JobStatus.COMPLETED,
    locationLat: 4.05,
    locationLng: 9.7,
    collector: {
      id: 'col-1',
      latitude: 4.0,
      longitude: 9.65,
    },
    ...overrides,
  });

  const makeEarning = (overrides: any = {}): any => ({
    id: 'earn-1',
    jobId: 'job-1',
    collectorId: 'col-1',
    baseAmount: 500,
    distanceAmount: 150,
    surgeMultiplier: 1.0,
    totalAmount: 650,
    status: EarningStatus.PENDING,
    confirmedAt: null,
    createdAt: new Date('2025-04-19T10:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    earningRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({ id: 'earn-1', createdAt: new Date(), ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      }),
    };

    jobRepo = {
      findOne: jest.fn().mockResolvedValue(makeJob()),
    };

    systemConfigService = {
      getNumber: jest.fn().mockImplementation((key: string, defaultVal: number) => {
        const values: Record<string, number> = {
          'earnings.base_rate': 500,
          'earnings.per_km_rate': 100,
          'earnings.surge_multiplier': 1.5,
        };
        return Promise.resolve(values[key] ?? defaultVal);
      }),
    };

    featureFlagService = {
      isEnabled: jest.fn().mockResolvedValue(false), // surge OFF by default
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EarningsService,
        { provide: getRepositoryToken(Earning), useValue: earningRepo },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: SystemConfigService, useValue: systemConfigService },
        { provide: FeatureFlagService, useValue: featureFlagService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<EarningsService>(EarningsService);
  });

  // ─── onJobCompleted ─────────────────────────────────────────────

  describe('onJobCompleted', () => {
    it('should create PENDING earnings on JOB_COMPLETED', async () => {
      await service.onJobCompleted({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        proofId: 'proof-1',
        status: JobStatus.COMPLETED,
        timestamp: new Date(),
      });

      expect(earningRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          collectorId: 'col-1',
          status: EarningStatus.PENDING,
        }),
      );
      expect(earningRepo.save).toHaveBeenCalled();
    });

    it('should emit EARNINGS_CALCULATED event', async () => {
      await service.onJobCompleted({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        proofId: 'proof-1',
        status: JobStatus.COMPLETED,
        timestamp: new Date(),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EarningsEvents.CALCULATED,
        expect.objectContaining({
          jobId: 'job-1',
          collectorId: 'col-1',
        }),
      );
    });

    it('should not create duplicate earnings', async () => {
      earningRepo.findOne.mockResolvedValue(makeEarning());

      await service.onJobCompleted({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        proofId: 'proof-1',
        status: JobStatus.COMPLETED,
        timestamp: new Date(),
      });

      expect(earningRepo.create).not.toHaveBeenCalled();
    });

    it('should not create earnings if no collector', async () => {
      jobRepo.findOne.mockResolvedValue(makeJob({ collectorId: null }));

      await service.onJobCompleted({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: null,
        proofId: 'proof-1',
        status: JobStatus.COMPLETED,
        timestamp: new Date(),
      });

      expect(earningRepo.create).not.toHaveBeenCalled();
    });
  });

  // ─── onJobValidated ─────────────────────────────────────────────

  describe('onJobValidated', () => {
    it('should confirm PENDING earnings on JOB_VALIDATED', async () => {
      earningRepo.findOne.mockResolvedValue(makeEarning());

      await service.onJobValidated({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        status: JobStatus.VALIDATED,
        timestamp: new Date(),
      });

      const savedEarning = earningRepo.save.mock.calls[0][0];
      expect(savedEarning.status).toBe(EarningStatus.CONFIRMED);
      expect(savedEarning.confirmedAt).toBeDefined();
    });

    it('should emit EARNINGS_CONFIRMED event', async () => {
      earningRepo.findOne.mockResolvedValue(makeEarning());

      await service.onJobValidated({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        status: JobStatus.VALIDATED,
        timestamp: new Date(),
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EarningsEvents.CONFIRMED,
        expect.objectContaining({
          jobId: 'job-1',
          collectorId: 'col-1',
        }),
      );
    });

    it('should not confirm if earnings already CONFIRMED', async () => {
      earningRepo.findOne.mockResolvedValue(
        makeEarning({ status: EarningStatus.CONFIRMED }),
      );

      await service.onJobValidated({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        status: JobStatus.VALIDATED,
        timestamp: new Date(),
      });

      expect(earningRepo.save).not.toHaveBeenCalled();
    });

    it('should handle missing earnings gracefully', async () => {
      earningRepo.findOne.mockResolvedValue(null);

      await expect(
        service.onJobValidated({
          jobId: 'job-999',
          householdId: 'hh-1',
          collectorId: 'col-1',
          status: JobStatus.VALIDATED,
          timestamp: new Date(),
        }),
      ).resolves.not.toThrow();
    });
  });

  // ─── Earnings Calculation ───────────────────────────────────────

  describe('calculateEarnings', () => {
    it('should calculate with config-driven values (no surge)', async () => {
      const job = makeJob();
      const result = await service.calculateEarnings(job);

      expect(result.baseAmount).toBe(500);
      expect(result.distanceAmount).toBeGreaterThan(0);
      expect(result.surgeMultiplier).toBe(1.0);
      expect(result.totalAmount).toBe(
        Math.round((500 + result.distanceAmount) * 1.0 * 100) / 100,
      );
    });

    it('should apply surge multiplier when surge is enabled', async () => {
      featureFlagService.isEnabled.mockResolvedValue(true);

      const job = makeJob();
      const result = await service.calculateEarnings(job);

      expect(result.surgeMultiplier).toBe(1.5);
      expect(result.totalAmount).toBe(
        Math.round((500 + result.distanceAmount) * 1.5 * 100) / 100,
      );
    });

    it('should fallback to base-rate-only when coordinates missing', async () => {
      const job = makeJob({
        locationLat: null,
        locationLng: null,
      });
      const result = await service.calculateEarnings(job);

      expect(result.distanceAmount).toBe(0);
      expect(result.totalAmount).toBe(500);
    });

    it('should fallback to base-rate-only when collector coordinates missing', async () => {
      const job = makeJob({
        collector: { id: 'col-1', latitude: null, longitude: null },
      });
      const result = await service.calculateEarnings(job);

      expect(result.distanceAmount).toBe(0);
      expect(result.totalAmount).toBe(500);
    });

    it('should fallback to base-rate-only when collector relation is null', async () => {
      const job = makeJob({ collector: null });
      const result = await service.calculateEarnings(job);

      expect(result.distanceAmount).toBe(0);
      expect(result.totalAmount).toBe(500);
    });
  });

  // ─── Earnings Summary ──────────────────────────────────────────

  describe('getCollectorEarnings', () => {
    it('should return earnings summary with totals', async () => {
      const earnings = [
        makeEarning({ totalAmount: 500, status: EarningStatus.PENDING }),
        makeEarning({
          id: 'earn-2',
          totalAmount: 700,
          status: EarningStatus.CONFIRMED,
        }),
      ];

      earningRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(earnings),
      });

      const result = await service.getCollectorEarnings('col-1');

      expect(result.totalEarnings).toBe(1200);
      expect(result.pendingEarnings).toBe(500);
      expect(result.confirmedEarnings).toBe(700);
      expect(result.jobCount).toBe(2);
      expect(result.earnings).toHaveLength(2);
    });
  });

  describe('getEarningsSummary', () => {
    it('should return today, thisWeek, thisMonth, allTime', async () => {
      // Mock sumEarnings — each call to createQueryBuilder returns a different total
      let callIndex = 0;
      const totals = [100, 500, 2000, 10000];

      earningRepo.createQueryBuilder.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: String(totals[callIndex++]) }),
      }));

      const result = await service.getEarningsSummary('col-1');

      expect(result.today).toBe(100);
      expect(result.thisWeek).toBe(500);
      expect(result.thisMonth).toBe(2000);
      expect(result.allTime).toBe(10000);
    });
  });
});
