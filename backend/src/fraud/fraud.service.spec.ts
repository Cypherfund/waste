import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FraudService } from './fraud.service';
import { FraudFlag } from './entities/fraud-flag.entity';
import { Proof } from '../jobs/entities/proof.entity';
import { Job } from '../jobs/entities/job.entity';
import { UsersService } from '../users/users.service';
import { SystemConfigService } from '../config/system-config.service';
import { FraudType, FraudFlagStatus } from '../common/enums/fraud-type.enum';
import { FraudSeverity } from '../common/enums/fraud-severity.enum';
import { JobStatus } from '../common/enums/job-status.enum';
import { FraudEvents } from '../events/events.types';

describe('FraudService', () => {
  let service: FraudService;
  let flagRepo: any;
  let proofRepo: any;
  let jobRepo: any;
  let usersService: any;
  let systemConfigService: any;
  let eventEmitter: any;

  const now = new Date();

  const makeJob = (overrides: any = {}): any => ({
    id: 'job-1',
    householdId: 'hh-1',
    collectorId: 'col-1',
    status: JobStatus.COMPLETED,
    locationLat: 4.0435,
    locationLng: 9.6966,
    startedAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
    completedAt: now,
    ...overrides,
  });

  const makeProof = (overrides: any = {}): any => ({
    id: 'proof-1',
    jobId: 'job-1',
    imageUrl: 'https://cdn.example.com/proof/unique-abc.jpg',
    collectorLat: 4.0436,
    collectorLng: 9.6967,
    uploadedAt: now,
    ...overrides,
  });

  let flagIdCounter = 0;

  beforeEach(async () => {
    flagIdCounter = 0;

    flagRepo = {
      create: jest.fn((data) => ({
        id: `flag-${++flagIdCounter}`,
        createdAt: new Date(),
        reviewedBy: null,
        reviewNotes: null,
        reviewedAt: null,
        ...data,
      })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };

    proofRepo = {
      findOne: jest.fn().mockResolvedValue(makeProof()),
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // no reuse by default
      }),
    };

    jobRepo = {
      findOne: jest.fn().mockResolvedValue(makeJob()),
      count: jest.fn().mockResolvedValue(1), // low count by default
      find: jest.fn().mockResolvedValue([makeJob()]), // 1 job by default (under threshold)
    };

    usersService = {
      deactivateUser: jest.fn().mockResolvedValue(undefined),
    };

    systemConfigService = {
      getNumber: jest.fn().mockImplementation((key: string, fallback: number) => {
        return Promise.resolve(fallback);
      }),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudService,
        { provide: getRepositoryToken(FraudFlag), useValue: flagRepo },
        { provide: getRepositoryToken(Proof), useValue: proofRepo },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: UsersService, useValue: usersService },
        { provide: SystemConfigService, useValue: systemConfigService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<FraudService>(FraudService);
  });

  // ─── FAST_COMPLETION Detection ──────────────────────────────────

  describe('checkFastCompletion', () => {
    it('should create MEDIUM flag when job completed in under 5 minutes', async () => {
      const job = makeJob({
        startedAt: new Date(now.getTime() - 2 * 60 * 1000), // 2 min ago
        completedAt: now,
      });

      const result = await service.checkFastCompletion(job);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(FraudType.FAST_COMPLETION);
      expect(result!.severity).toBe(FraudSeverity.MEDIUM);
      expect(result!.details.durationMinutes).toBeCloseTo(2, 0);
    });

    it('should NOT flag when completion takes longer than threshold', async () => {
      const job = makeJob({
        startedAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 min ago
        completedAt: now,
      });

      const result = await service.checkFastCompletion(job);
      expect(result).toBeNull();
    });

    it('should NOT crash when startedAt is null', async () => {
      const job = makeJob({ startedAt: null });
      const result = await service.checkFastCompletion(job);
      expect(result).toBeNull();
    });

    it('should NOT crash when completedAt is null', async () => {
      const job = makeJob({ completedAt: null });
      const result = await service.checkFastCompletion(job);
      expect(result).toBeNull();
    });
  });

  // ─── GPS_MISMATCH Detection ─────────────────────────────────────

  describe('checkGpsMismatch', () => {
    it('should create flag when proof coordinates far from job location', async () => {
      const job = makeJob({
        locationLat: 4.0435,
        locationLng: 9.6966,
      });
      // Proof coords ~5km away
      const proof = makeProof({
        collectorLat: 4.09,
        collectorLng: 9.70,
      });

      const result = await service.checkGpsMismatch(job, proof);

      expect(result).not.toBeNull();
      expect(result!.type).toBe(FraudType.GPS_MISMATCH);
      expect(result!.details.distanceKm).toBeGreaterThan(0.5);
    });

    it('should assign HIGH severity for > 2km mismatch', async () => {
      const job = makeJob({ locationLat: 4.0, locationLng: 9.0 });
      const proof = makeProof({ collectorLat: 4.05, collectorLng: 9.05 });

      const result = await service.checkGpsMismatch(job, proof);

      expect(result).not.toBeNull();
      expect(result!.severity).toBe(FraudSeverity.HIGH);
    });

    it('should NOT flag when coords are close', async () => {
      const job = makeJob({ locationLat: 4.0435, locationLng: 9.6966 });
      const proof = makeProof({ collectorLat: 4.0436, collectorLng: 9.6967 });

      const result = await service.checkGpsMismatch(job, proof);
      expect(result).toBeNull();
    });

    it('should NOT crash when proof is null', async () => {
      const job = makeJob();
      const result = await service.checkGpsMismatch(job, null);
      expect(result).toBeNull();
    });

    it('should NOT crash when proof has null coordinates', async () => {
      const job = makeJob();
      const proof = makeProof({ collectorLat: null, collectorLng: null });
      const result = await service.checkGpsMismatch(job, proof);
      expect(result).toBeNull();
    });

    it('should NOT crash when job has null coordinates', async () => {
      const job = makeJob({ locationLat: null, locationLng: null });
      const proof = makeProof();
      const result = await service.checkGpsMismatch(job, proof);
      expect(result).toBeNull();
    });
  });

  // ─── IMAGE_REUSE Detection ──────────────────────────────────────

  describe('checkImageReuse', () => {
    it('should create HIGH flag when image URL matches a recent proof', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'old-proof-99',
          jobId: 'old-job-99',
          imageUrl: 'https://cdn.example.com/proof/unique-abc.jpg',
        }),
      };
      proofRepo.createQueryBuilder.mockReturnValue(qb);

      const proof = makeProof();
      const result = await service.checkImageReuse(proof, 'col-1');

      expect(result).not.toBeNull();
      expect(result!.type).toBe(FraudType.IMAGE_REUSE);
      expect(result!.severity).toBe(FraudSeverity.HIGH);
      expect(result!.details.matchedProofId).toBe('old-proof-99');
    });

    it('should NOT flag when no matching image found', async () => {
      const proof = makeProof();
      const result = await service.checkImageReuse(proof, 'col-1');
      expect(result).toBeNull();
    });

    it('should NOT crash when proof is null', async () => {
      const result = await service.checkImageReuse(null, 'col-1');
      expect(result).toBeNull();
    });
  });

  // ─── SUSPICIOUS_PATTERN Detection ───────────────────────────────

  describe('checkSuspiciousPattern', () => {
    it('should create flag when too many completions in 1 hour', async () => {
      // 5 jobs > 3 threshold
      const jobs = Array.from({ length: 5 }, (_, i) => makeJob({ id: `job-${i}` }));
      jobRepo.find.mockResolvedValue(jobs);

      const result = await service.checkSuspiciousPattern('col-1');

      expect(result).not.toBeNull();
      expect(result!.type).toBe(FraudType.SUSPICIOUS_PATTERN);
      expect(result!.severity).toBe(FraudSeverity.MEDIUM);
      expect(result!.jobId).toBe('job-0'); // anchored to first (most recent) job
    });

    it('should assign HIGH severity for very excessive completions', async () => {
      // 8 jobs > 3*2 = 6
      const jobs = Array.from({ length: 8 }, (_, i) => makeJob({ id: `job-${i}` }));
      jobRepo.find.mockResolvedValue(jobs);

      const result = await service.checkSuspiciousPattern('col-1');

      expect(result).not.toBeNull();
      expect(result!.severity).toBe(FraudSeverity.HIGH);
    });

    it('should NOT flag when completions within normal range', async () => {
      // 2 jobs <= 3 threshold
      const jobs = Array.from({ length: 2 }, (_, i) => makeJob({ id: `job-${i}` }));
      jobRepo.find.mockResolvedValue(jobs);

      const result = await service.checkSuspiciousPattern('col-1');
      expect(result).toBeNull();
    });
  });

  // ─── Severity / Auto-Actions ────────────────────────────────────

  describe('auto-pause on HIGH severity', () => {
    it('should auto-pause collector for HIGH severity flag', async () => {
      await service.createFlag({
        jobId: 'job-1',
        collectorId: 'col-1',
        type: FraudType.GPS_MISMATCH,
        severity: FraudSeverity.HIGH,
        details: { distanceKm: 5.0 },
      });

      expect(usersService.deactivateUser).toHaveBeenCalledWith('col-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        FraudEvents.COLLECTOR_AUTO_PAUSED,
        expect.objectContaining({ collectorId: 'col-1' }),
      );
    });

    it('should NOT auto-pause for MEDIUM severity', async () => {
      await service.createFlag({
        jobId: 'job-1',
        collectorId: 'col-1',
        type: FraudType.FAST_COMPLETION,
        severity: FraudSeverity.MEDIUM,
        details: {},
      });

      expect(usersService.deactivateUser).not.toHaveBeenCalled();
    });

    it('should NOT auto-pause for LOW severity', async () => {
      await service.createFlag({
        jobId: 'job-1',
        collectorId: 'col-1',
        type: FraudType.DUPLICATE_REQUEST,
        severity: FraudSeverity.LOW,
        details: {},
      });

      expect(usersService.deactivateUser).not.toHaveBeenCalled();
    });

    it('should emit FRAUD_FLAG_CREATED event for every flag', async () => {
      await service.createFlag({
        jobId: 'job-1',
        collectorId: 'col-1',
        type: FraudType.FAST_COMPLETION,
        severity: FraudSeverity.MEDIUM,
        details: {},
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        FraudEvents.FLAG_CREATED,
        expect.objectContaining({
          jobId: 'job-1',
          collectorId: 'col-1',
          type: FraudType.FAST_COMPLETION,
          severity: FraudSeverity.MEDIUM,
        }),
      );
    });
  });

  // ─── Review Flow ────────────────────────────────────────────────

  describe('reviewFlag', () => {
    const openFlag = {
      id: 'flag-1',
      jobId: 'job-1',
      collectorId: 'col-1',
      type: FraudType.GPS_MISMATCH,
      severity: FraudSeverity.HIGH,
      details: {},
      status: FraudFlagStatus.OPEN,
      reviewedBy: null,
      reviewNotes: null,
      reviewedAt: null,
      createdAt: new Date(),
    };

    it('should update flag status, reviewedBy, and reviewedAt', async () => {
      flagRepo.findOne.mockResolvedValue({ ...openFlag });

      const result = await service.reviewFlag('flag-1', 'admin-1', {
        resolution: FraudFlagStatus.CONFIRMED,
        reviewNotes: 'GPS clearly shows collector was not at location',
      });

      expect(result.status).toBe(FraudFlagStatus.CONFIRMED);
      expect(result.reviewedBy).toBe('admin-1');
      expect(result.reviewNotes).toBe('GPS clearly shows collector was not at location');
      expect(result.reviewedAt).toBeDefined();
    });

    it('should emit FRAUD_FLAG_REVIEWED event', async () => {
      flagRepo.findOne.mockResolvedValue({ ...openFlag });

      await service.reviewFlag('flag-1', 'admin-1', {
        resolution: FraudFlagStatus.DISMISSED,
        reviewNotes: 'False positive',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        FraudEvents.FLAG_REVIEWED,
        expect.objectContaining({
          flagId: 'flag-1',
          resolution: FraudFlagStatus.DISMISSED,
          reviewedBy: 'admin-1',
        }),
      );
    });

    it('should reject review for non-existent flag', async () => {
      flagRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reviewFlag('bad-id', 'admin-1', {
          resolution: FraudFlagStatus.CONFIRMED,
          reviewNotes: 'N/A',
        }),
      ).rejects.toThrow('Fraud flag not found');
    });

    it('should reject review for already reviewed flag', async () => {
      flagRepo.findOne.mockResolvedValue({
        ...openFlag,
        status: FraudFlagStatus.CONFIRMED,
      });

      await expect(
        service.reviewFlag('flag-1', 'admin-1', {
          resolution: FraudFlagStatus.DISMISSED,
          reviewNotes: 'N/A',
        }),
      ).rejects.toThrow('Fraud flag is already reviewed');
    });
  });

  // ─── Event Listener (integration) ──────────────────────────────

  describe('onJobCompleted', () => {
    it('should run all fraud checks when job completes', async () => {
      // Job completed in 2 minutes (should trigger fast completion)
      const fastJob = makeJob({
        startedAt: new Date(now.getTime() - 2 * 60 * 1000),
        completedAt: now,
      });
      jobRepo.findOne.mockResolvedValue(fastJob);

      await service.onJobCompleted({
        jobId: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        status: JobStatus.COMPLETED,
        timestamp: now,
        proofId: 'proof-1',
      });

      // At least one flag should be created (fast completion)
      expect(flagRepo.create).toHaveBeenCalled();
      expect(flagRepo.save).toHaveBeenCalled();
    });

    it('should not crash when job not found', async () => {
      jobRepo.findOne.mockResolvedValue(null);

      await expect(
        service.onJobCompleted({
          jobId: 'missing',
          householdId: 'hh-1',
          collectorId: 'col-1',
          status: JobStatus.COMPLETED,
          timestamp: now,
          proofId: 'proof-1',
        }),
      ).resolves.not.toThrow();
    });
  });

  // ─── listFlags ──────────────────────────────────────────────────

  describe('listFlags', () => {
    it('should return flags with optional filters', async () => {
      flagRepo.find.mockResolvedValue([openFlag]);

      const result = await service.listFlags({ status: FraudFlagStatus.OPEN });

      expect(flagRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: FraudFlagStatus.OPEN },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('should return all flags when no filters', async () => {
      await service.listFlags();

      expect(flagRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  // Use openFlag reference for listFlags tests
  const openFlag = {
    id: 'flag-1',
    jobId: 'job-1',
    collectorId: 'col-1',
    type: FraudType.GPS_MISMATCH,
    severity: FraudSeverity.HIGH,
    details: {},
    status: FraudFlagStatus.OPEN,
    createdAt: new Date(),
  };
});
