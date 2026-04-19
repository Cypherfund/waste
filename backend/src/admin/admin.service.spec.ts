import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { JobsService } from '../jobs/jobs.service';
import { AssignmentService } from '../assignment/assignment.service';
import { DisputesService } from '../disputes/disputes.service';
import { FraudService } from '../fraud/fraud.service';
import { SystemConfigService } from '../config/system-config.service';
import { Job } from '../jobs/entities/job.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { User } from '../users/entities/user.entity';
import { JobStatus } from '../common/enums/job-status.enum';
import { UserRole } from '../common/enums/role.enum';
import { DisputeStatus } from '../common/enums/dispute-status.enum';
import { FraudFlagStatus } from '../common/enums/fraud-type.enum';
import { FraudSeverity } from '../common/enums/fraud-severity.enum';

describe('AdminService', () => {
  let service: AdminService;
  let usersService: any;
  let jobsService: any;
  let assignmentService: any;
  let disputesService: any;
  let fraudService: any;
  let systemConfigService: any;
  let jobRepo: any;
  let disputeRepo: any;
  let earningRepo: any;
  let ratingRepo: any;
  let userRepo: any;

  const mockQb = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ total: '0', avg: '0', avg_minutes: '0' }),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    usersService = {
      listUsers: jest.fn().mockResolvedValue([]),
      deactivateUser: jest.fn().mockResolvedValue(undefined),
      activateUser: jest.fn().mockResolvedValue(undefined),
      countByRole: jest.fn().mockResolvedValue(5),
      countFlaggedCollectors: jest.fn().mockResolvedValue(2),
    };

    jobsService = {
      getJobEntity: jest.fn().mockResolvedValue({
        id: 'job-1',
        householdId: 'hh-1',
        collectorId: 'col-1',
        status: JobStatus.COMPLETED,
      }),
      toResponseDto: jest.fn((job) => ({
        id: job.id,
        householdId: job.householdId,
        status: job.status,
      })),
    };

    assignmentService = {
      manualAssign: jest.fn().mockResolvedValue(undefined),
    };

    disputesService = {
      resolveDispute: jest.fn().mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.RESOLVED_ACCEPTED,
        resolvedBy: 'admin-1',
        resolvedAt: new Date(),
      }),
    };

    fraudService = {
      listFlags: jest.fn().mockResolvedValue([]),
      reviewFlag: jest.fn().mockResolvedValue({
        id: 'flag-1',
        status: FraudFlagStatus.CONFIRMED,
        reviewedBy: 'admin-1',
        reviewedAt: new Date(),
      }),
    };

    systemConfigService = {
      listAll: jest.fn().mockResolvedValue([
        { key: 'assignment.max_radius_km', value: '10', category: 'assignment' },
        { key: 'earnings.base_rate', value: '500', category: 'earnings' },
      ]),
      upsert: jest.fn().mockResolvedValue({
        key: 'assignment.max_radius_km',
        value: '15',
        updatedBy: 'admin-1',
      }),
    };

    jobRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn().mockResolvedValue(10),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb()),
    };

    disputeRepo = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(3),
    };

    earningRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb()),
    };

    ratingRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb()),
    };

    userRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-1',
        name: 'Test',
        phone: '+237600000000',
        email: null,
        role: UserRole.COLLECTOR,
        isActive: true,
        avgRating: 4.5,
        totalCompleted: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: UsersService, useValue: usersService },
        { provide: JobsService, useValue: jobsService },
        { provide: AssignmentService, useValue: assignmentService },
        { provide: DisputesService, useValue: disputesService },
        { provide: FraudService, useValue: fraudService },
        { provide: SystemConfigService, useValue: systemConfigService },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: getRepositoryToken(Dispute), useValue: disputeRepo },
        { provide: getRepositoryToken(Earning), useValue: earningRepo },
        { provide: getRepositoryToken(Rating), useValue: ratingRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // ─── USERS ────────────────────────────────────────────────────

  describe('user management', () => {
    it('should list users via UsersService', async () => {
      await service.listUsers({ role: 'COLLECTOR' });
      expect(usersService.listUsers).toHaveBeenCalledWith({ role: 'COLLECTOR' });
    });

    it('should get user detail with stats', async () => {
      const result = await service.getUserDetail('user-1');

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result.id).toBe('user-1');
      expect(result).toHaveProperty('completedJobs');
      expect(result).toHaveProperty('totalEarnings');
    });

    it('should throw NotFoundException for unknown user', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getUserDetail('unknown')).rejects.toThrow('User not found');
    });

    it('should deactivate a user', async () => {
      await service.deactivateUser('admin-1', 'user-1');
      expect(usersService.deactivateUser).toHaveBeenCalledWith('user-1');
    });

    it('should prevent admin from deactivating themselves', async () => {
      await expect(
        service.deactivateUser('admin-1', 'admin-1'),
      ).rejects.toThrow('Cannot deactivate yourself');
    });

    it('should activate a user', async () => {
      await service.activateUser('admin-1', 'user-1');
      expect(usersService.activateUser).toHaveBeenCalledWith('user-1');
    });
  });

  // ─── JOBS ─────────────────────────────────────────────────────

  describe('jobs monitoring', () => {
    it('should list jobs with filters', async () => {
      jobRepo.findAndCount.mockResolvedValue([[{ id: 'job-1', status: JobStatus.COMPLETED }], 1]);

      const result = await service.listJobs({ status: JobStatus.COMPLETED });

      expect(jobRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: JobStatus.COMPLETED }),
        }),
      );
      expect(result.meta.total).toBe(1);
    });

    it('should list jobs with date range filter', async () => {
      jobRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listJobs({
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      });

      const callArgs = jobRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.scheduledDate).toBeDefined();
    });

    it('should list all jobs without filters', async () => {
      jobRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listJobs({});

      expect(jobRepo.findAndCount).toHaveBeenCalled();
    });

    it('should get a single job by ID', async () => {
      const result = await service.getJob('job-1');

      expect(jobsService.getJobEntity).toHaveBeenCalledWith('job-1');
      expect(result.id).toBe('job-1');
    });
  });

  // ─── MANUAL ASSIGNMENT ────────────────────────────────────────

  describe('manual assignment', () => {
    it('should delegate to AssignmentService.manualAssign', async () => {
      await service.manualAssign('job-1', 'col-1');

      expect(assignmentService.manualAssign).toHaveBeenCalledWith('job-1', 'col-1');
    });

    it('should reject when AssignmentService throws (invalid state)', async () => {
      assignmentService.manualAssign.mockRejectedValue(
        new Error('Job must be in REQUESTED status'),
      );

      await expect(
        service.manualAssign('job-1', 'col-1'),
      ).rejects.toThrow('REQUESTED');
    });
  });

  // ─── DISPUTES ─────────────────────────────────────────────────

  describe('dispute review', () => {
    it('should list disputes with status filter', async () => {
      await service.listDisputes({ status: DisputeStatus.OPEN });

      expect(disputeRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: DisputeStatus.OPEN },
        }),
      );
    });

    it('should resolve a dispute (ACCEPTED)', async () => {
      const result = await service.resolveDispute('dispute-1', 'admin-1', {
        resolution: DisputeStatus.RESOLVED_ACCEPTED,
        adminNotes: 'Valid dispute',
      });

      expect(disputesService.resolveDispute).toHaveBeenCalledWith(
        'dispute-1',
        'admin-1',
        expect.objectContaining({ resolution: DisputeStatus.RESOLVED_ACCEPTED }),
      );
      expect(result.status).toBe(DisputeStatus.RESOLVED_ACCEPTED);
    });

    it('should resolve a dispute (REJECTED)', async () => {
      disputesService.resolveDispute.mockResolvedValue({
        id: 'dispute-1',
        status: DisputeStatus.RESOLVED_REJECTED,
        resolvedBy: 'admin-1',
      });

      const result = await service.resolveDispute('dispute-1', 'admin-1', {
        resolution: DisputeStatus.RESOLVED_REJECTED,
        adminNotes: 'Collector was correct',
      });

      expect(result.status).toBe(DisputeStatus.RESOLVED_REJECTED);
    });
  });

  // ─── FRAUD ────────────────────────────────────────────────────

  describe('fraud review', () => {
    it('should list fraud flags with status filter', async () => {
      await service.listFraudFlags({ status: FraudFlagStatus.OPEN });

      expect(fraudService.listFlags).toHaveBeenCalledWith({ status: FraudFlagStatus.OPEN });
    });

    it('should list fraud flags with severity filter', async () => {
      await service.listFraudFlags({ severity: FraudSeverity.HIGH });

      expect(fraudService.listFlags).toHaveBeenCalledWith({ severity: FraudSeverity.HIGH });
    });

    it('should confirm a fraud flag', async () => {
      const result = await service.reviewFraudFlag('flag-1', 'admin-1', {
        resolution: FraudFlagStatus.CONFIRMED,
        reviewNotes: 'GPS clearly wrong',
      });

      expect(fraudService.reviewFlag).toHaveBeenCalledWith(
        'flag-1',
        'admin-1',
        expect.objectContaining({ resolution: FraudFlagStatus.CONFIRMED }),
      );
      expect(result.status).toBe(FraudFlagStatus.CONFIRMED);
    });

    it('should dismiss a fraud flag', async () => {
      fraudService.reviewFlag.mockResolvedValue({
        id: 'flag-1',
        status: FraudFlagStatus.DISMISSED,
        reviewedBy: 'admin-1',
      });

      const result = await service.reviewFraudFlag('flag-1', 'admin-1', {
        resolution: FraudFlagStatus.DISMISSED,
        reviewNotes: 'False positive',
      });

      expect(result.status).toBe(FraudFlagStatus.DISMISSED);
    });
  });

  // ─── CONFIG ───────────────────────────────────────────────────

  describe('config management', () => {
    it('should list all config values', async () => {
      const result = await service.listConfig();
      expect(systemConfigService.listAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should filter config by category', async () => {
      const result = await service.listConfig('assignment');
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('assignment');
    });

    it('should update a config value', async () => {
      const result = await service.updateConfig(
        'assignment.max_radius_km',
        '15',
        'admin-1',
      );

      expect(systemConfigService.upsert).toHaveBeenCalledWith(
        'assignment.max_radius_km',
        '15',
        'admin-1',
      );
      expect(result.key).toBe('assignment.max_radius_km');
      expect(result.value).toBe('15');
    });
  });

  // ─── STATS ────────────────────────────────────────────────────

  describe('stats', () => {
    it('should return all spec-required stats fields', async () => {
      const result = await service.getStats();

      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('totalHouseholds');
      expect(result).toHaveProperty('totalCollectors');
      expect(result).toHaveProperty('totalJobs');
      expect(result).toHaveProperty('activeJobs');
      expect(result).toHaveProperty('completedJobs');
      expect(result).toHaveProperty('cancelledJobs');
      expect(result).toHaveProperty('flaggedCollectors');
      expect(result).toHaveProperty('avgCompletionTimeMinutes');
      expect(result).toHaveProperty('avgRating');
      expect(result).toHaveProperty('jobsByStatus');
      expect(result).toHaveProperty('earningsTotal');
      expect(result).toHaveProperty('earningsPending');
      expect(result).toHaveProperty('totalDisputes');
      expect(result).toHaveProperty('openDisputes');
    });

    it('should call underlying services and repos for counts', async () => {
      await service.getStats();

      expect(usersService.countByRole).toHaveBeenCalled();
      expect(usersService.countFlaggedCollectors).toHaveBeenCalled();
      expect(jobRepo.count).toHaveBeenCalled();
      expect(disputeRepo.count).toHaveBeenCalled();
      expect(earningRepo.createQueryBuilder).toHaveBeenCalled();
      expect(ratingRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  // ─── COLLECTOR PERFORMANCE ────────────────────────────────────

  describe('collector performance', () => {
    it('should return collector performance list', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'col-1', name: 'Alice', avgRating: 4.8 },
      ]);

      const result = await service.getCollectorPerformance(10);

      expect(userRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: UserRole.COLLECTOR, isActive: true },
          order: { avgRating: 'DESC' },
          take: 10,
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('avgRating');
      expect(result[0]).toHaveProperty('completedJobs');
      expect(result[0]).toHaveProperty('totalEarnings');
      expect(result[0]).toHaveProperty('avgCompletionTime');
    });
  });
});
