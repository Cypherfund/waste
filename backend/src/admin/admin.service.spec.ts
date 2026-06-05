import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminAuditService } from './services/admin-audit.service';
import { UsersService } from '../users/users.service';
import { JobsService } from '../jobs/jobs.service';
import { AssignmentService } from '../assignment/assignment.service';
import { DisputesService } from '../disputes/disputes.service';
import { FraudService } from '../fraud/fraud.service';
import { SystemConfigService } from '../config/system-config.service';
import { FeatureFlagService } from '../config/feature-flags';
import { Job } from '../jobs/entities/job.entity';
import { Dispute } from '../disputes/entities/dispute.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { Rating } from '../ratings/entities/rating.entity';
import { User } from '../users/entities/user.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import {
  PaymentTransaction,
  TransactionStatus,
} from '../payments/entities/payment-transaction.entity';
import { WalletLedger } from '../wallet/entities/wallet-ledger.entity';
import { JobStatus } from '../common/enums/job-status.enum';
import { UserRole } from '../common/enums/role.enum';
import { DisputeStatus } from '../common/enums/dispute-status.enum';
import { FraudFlagStatus } from '../common/enums/fraud-type.enum';
import { FraudSeverity } from '../common/enums/fraud-severity.enum';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentService } from '../payments/payment.service';
import { PaymentStatus } from '../common/enums/payment-status.enum';

describe('AdminService', () => {
  let service: AdminService;
  let usersService: any;
  let jobsService: any;
  let assignmentService: any;
  let disputesService: any;
  let fraudService: any;
  let systemConfigService: any;
  let featureFlagService: any;
  let jobRepo: any;
  let disputeRepo: any;
  let earningRepo: any;
  let ratingRepo: any;
  let userRepo: any;
  let subRepo: any;
  let paymentTransactionRepo: any;
  let mockDataSource: any;
  let mockEntityManager: any;
  let paymentService: any;

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
      autoAssign: jest.fn().mockResolvedValue(undefined),
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

    featureFlagService = {
      isEnabled: jest.fn().mockResolvedValue(false),
    };

    jobRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      find: jest.fn().mockResolvedValue([]),
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

    subRepo = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      find: jest.fn().mockResolvedValue([]),
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

    // Mock DataSource and EntityManager for wallet top-up tests
    mockEntityManager = {
      getRepository: jest.fn(),
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      transaction: jest.fn(async (callback) => callback(mockEntityManager)),
    };

    paymentTransactionRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    paymentService = {
      checkTransactionStatus: jest.fn(),
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
        { provide: FeatureFlagService, useValue: featureFlagService },
        { provide: EventEmitter2, useValue: { emit: jest.fn(), emitAsync: jest.fn() } },
        { provide: AdminAuditService, useValue: { log: jest.fn() } },
        { provide: PaymentService, useValue: paymentService },
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: getRepositoryToken(Dispute), useValue: disputeRepo },
        { provide: getRepositoryToken(Earning), useValue: earningRepo },
        { provide: getRepositoryToken(Rating), useValue: ratingRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserSubscription), useValue: subRepo },
        { provide: getRepositoryToken(PaymentTransaction), useValue: paymentTransactionRepo },
        { provide: getRepositoryToken(WalletLedger), useValue: { create: jest.fn(), save: jest.fn() } },
        { provide: DataSource, useValue: mockDataSource },
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
      await expect(service.deactivateUser('admin-1', 'admin-1')).rejects.toThrow(
        'Cannot deactivate yourself',
      );
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

      await expect(service.manualAssign('job-1', 'col-1')).rejects.toThrow('REQUESTED');
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
      const result = await service.updateConfig('assignment.max_radius_km', '15', 'admin-1');

      expect(systemConfigService.upsert).toHaveBeenCalledWith(
        'assignment.max_radius_km',
        '15',
        'admin-1',
        undefined,
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
      userRepo.find.mockResolvedValue([{ id: 'col-1', name: 'Alice', avgRating: 4.8 }]);

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

  // ─── PENDING PAYMENTS (unified job + subscription) ────────────

  describe('listPendingPaymentJobs()', () => {
    const makeJob = (overrides: any = {}): any => ({
      id: 'job-1',
      householdId: 'hh-1',
      status: 'PENDING',
      paymentStatus: 'AWAITING_ADMIN_VERIFICATION',
      createdAt: new Date('2026-05-01'),
      ...overrides,
    });

    const makePendingSub = (overrides: any = {}): any => ({
      id: 'sub-1',
      userId: 'user-1',
      status: 'PENDING_PAYMENT',
      paymentMode: 'MANUAL_PROVIDER',
      paymentRef: 'TX-123',
      paymentProofUrl: null,
      paymentStatus: 'AWAITING_ADMIN_VERIFICATION',
      startDate: '2026-05-26',
      createdAt: new Date('2026-05-02'),
      plan: { id: 'plan-1', name: 'Basic', price: 3500 },
      user: { name: 'Jane Doe' },
      ...overrides,
    });

    beforeEach(() => {
      jobsService.toResponseDto = jest.fn((j) =>
        Promise.resolve({
          id: j.id,
          householdId: j.householdId,
          paymentStatus: j.paymentStatus,
          createdAt: j.createdAt,
        }),
      );
    });

    it('returns empty list when no pending payments exist', async () => {
      jobRepo.find.mockResolvedValue([]);
      subRepo.findAndCount.mockResolvedValue(undefined); // not called directly
      subRepo.find = jest.fn().mockResolvedValue([]);

      const result = await service.listPendingPaymentJobs();

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('tags job rows with paymentSource: JOB_PAYMENT', async () => {
      jobRepo.find.mockResolvedValue([makeJob()]);
      subRepo.find = jest.fn().mockResolvedValue([]);

      const result = await service.listPendingPaymentJobs();

      expect(result.data[0].paymentSource).toBe('JOB_PAYMENT');
    });

    it('includes PROVIDER_PENDING jobs in pending payments list', async () => {
      const providerPendingJob = makeJob({ paymentStatus: PaymentStatus.PROVIDER_PENDING, paymentMode: 'INTEGRATED_PROVIDER' });
      jobRepo.find.mockResolvedValue([providerPendingJob]);
      subRepo.find = jest.fn().mockResolvedValue([]);

      const result = await service.listPendingPaymentJobs();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].paymentSource).toBe('JOB_PAYMENT');
    });

    it('queries jobs with PROVIDER_PENDING in the paymentStatus filter', async () => {
      jobRepo.find.mockResolvedValue([]);
      subRepo.find = jest.fn().mockResolvedValue([]);

      await service.listPendingPaymentJobs();

      const callArgs = jobRepo.find.mock.calls[0][0];
      expect(JSON.stringify(callArgs.where.paymentStatus)).toContain('PROVIDER_PENDING');
    });

    it('tags subscription rows with paymentSource: SUBSCRIPTION_PAYMENT', async () => {
      jobRepo.find.mockResolvedValue([]);
      subRepo.find = jest.fn().mockResolvedValue([makePendingSub()]);

      const result = await service.listPendingPaymentJobs();

      expect(result.data[0].paymentSource).toBe('SUBSCRIPTION_PAYMENT');
    });

    it('subscription row has null jobId and valid subscriptionId', async () => {
      jobRepo.find.mockResolvedValue([]);
      subRepo.find = jest.fn().mockResolvedValue([makePendingSub()]);

      const result = await service.listPendingPaymentJobs();
      const row = result.data[0];

      expect(row.jobId).toBeNull();
      expect(row.subscriptionId).toBe('sub-1');
    });

    it('subscription row includes planName from relation', async () => {
      jobRepo.find.mockResolvedValue([]);
      subRepo.find = jest.fn().mockResolvedValue([makePendingSub()]);

      const result = await service.listPendingPaymentJobs();

      expect(result.data[0].planName).toBe('Basic');
    });

    it('subscription row includes householdName from user relation', async () => {
      jobRepo.find.mockResolvedValue([]);
      subRepo.find = jest.fn().mockResolvedValue([makePendingSub()]);

      const result = await service.listPendingPaymentJobs();

      expect(result.data[0].householdName).toBe('Jane Doe');
    });

    it('returns combined and sorted results (oldest first)', async () => {
      jobRepo.find.mockResolvedValue([makeJob()]);
      subRepo.find = jest.fn().mockResolvedValue([makePendingSub()]);

      const result = await service.listPendingPaymentJobs();

      expect(result.data).toHaveLength(2);
    });
  });

  // ─── PROVIDER PAYMENT STATUS CHECK ─────────────────────────────────

  describe('checkProviderPaymentStatus()', () => {
    const providerJob = (): any => ({
      id: 'job-p1',
      paymentStatus: PaymentStatus.PROVIDER_PENDING,
      status: 'PAYMENT_PENDING',
      quotedPrice: 1500,
      householdId: 'hh-1',
    });

    const providerTx = (): any => ({
      id: 'tx-p1',
      jobId: 'job-p1',
      status: 'PENDING',
      gatewayTransactionId: 'gw-123',
    });

    it('throws NotFoundException when job not found', async () => {
      jobRepo.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.checkProviderPaymentStatus('bad-id', 'admin-1')).rejects.toThrow('Job not found');
    });

    it('throws BadRequestException when job is not PROVIDER_PENDING', async () => {
      jobRepo.findOne = jest.fn().mockResolvedValue({ ...providerJob(), paymentStatus: PaymentStatus.AWAITING_ADMIN_VERIFICATION });

      await expect(service.checkProviderPaymentStatus('job-p1', 'admin-1')).rejects.toThrow('not PROVIDER_PENDING');
    });

    it('returns UNKNOWN status when no transaction is linked', async () => {
      jobRepo.findOne = jest.fn().mockResolvedValue(providerJob());
      paymentTransactionRepo.findOne = jest.fn().mockResolvedValue(null);

      const result = await service.checkProviderPaymentStatus('job-p1', 'admin-1');

      expect(result.gatewayStatus).toBe('UNKNOWN');
      expect(result.autoVerified).toBe(false);
    });

    it('returns PENDING message when gateway status is still PENDING', async () => {
      jobRepo.findOne = jest.fn().mockResolvedValue(providerJob());
      paymentTransactionRepo.findOne = jest.fn().mockResolvedValue(providerTx());
      paymentService.checkTransactionStatus.mockResolvedValue({ ...providerTx(), status: 'PENDING' });

      const result = await service.checkProviderPaymentStatus('job-p1', 'admin-1');

      expect(result.gatewayStatus).toBe('PENDING');
      expect(result.autoVerified).toBe(false);
      expect(result.message).toMatch(/still pending/i);
    });

    it('returns FAILED message when gateway status is FAILED', async () => {
      jobRepo.findOne = jest.fn().mockResolvedValue(providerJob());
      paymentTransactionRepo.findOne = jest.fn().mockResolvedValue(providerTx());
      paymentService.checkTransactionStatus.mockResolvedValue({ ...providerTx(), status: 'FAILED' });

      const result = await service.checkProviderPaymentStatus('job-p1', 'admin-1');

      expect(result.gatewayStatus).toBe('FAILED');
      expect(result.autoVerified).toBe(false);
      expect(result.message).toMatch(/failed/i);
    });

    it('auto-verifies job and returns autoVerified=true when gateway reports SUCCESS', async () => {
      jobRepo.findOne = jest.fn()
        .mockResolvedValueOnce(providerJob())   // checkProviderPaymentStatus lookup
        .mockResolvedValueOnce(providerJob())   // verifyPayment lookup
        .mockResolvedValueOnce({ ...providerJob(), paymentStatus: PaymentStatus.VERIFIED, status: 'REQUESTED' }); // verifyPayment save reload
      paymentTransactionRepo.findOne = jest.fn().mockResolvedValue(providerTx());
      paymentService.checkTransactionStatus.mockResolvedValue({ ...providerTx(), status: 'SUCCESS' });
      jobsService.toResponseDto = jest.fn().mockResolvedValue({ id: 'job-p1', status: 'REQUESTED', paymentStatus: PaymentStatus.VERIFIED });
      jobRepo.save = jest.fn().mockResolvedValue({ ...providerJob(), paymentStatus: PaymentStatus.VERIFIED, status: 'REQUESTED' });

      const result = await service.checkProviderPaymentStatus('job-p1', 'admin-1');

      expect(result.gatewayStatus).toBe('SUCCESS');
      expect(result.autoVerified).toBe(true);
      expect(result.message).toMatch(/auto/i);
    });
  });

  // ─── LISTJOBS EXCLUDES PROVIDER_PENDING BY DEFAULT ─────────────────

  describe('listJobs() PROVIDER_PENDING exclusion', () => {
    it('excludes PROVIDER_PENDING from default unfiltered listing', async () => {
      jobRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listJobs({});

      const callArgs = jobRepo.findAndCount.mock.calls[0][0];
      // paymentStatus filter should be applied to exclude PROVIDER_PENDING
      expect(callArgs.where.paymentStatus).toBeDefined();
      expect(JSON.stringify(callArgs.where.paymentStatus)).not.toContain('PROVIDER_PENDING');
    });

    it('shows PROVIDER_PENDING jobs when paymentStatus filter is explicitly set', async () => {
      jobRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listJobs({ paymentStatus: PaymentStatus.PROVIDER_PENDING as any });

      const callArgs = jobRepo.findAndCount.mock.calls[0][0];
      expect(callArgs.where.paymentStatus).toBe(PaymentStatus.PROVIDER_PENDING);
    });

    it('shows all statuses when status filter is set without paymentStatus', async () => {
      jobRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listJobs({ status: JobStatus.COMPLETED });

      const callArgs = jobRepo.findAndCount.mock.calls[0][0];
      // When status is set but paymentStatus is not, the exclusion filter is applied
      expect(callArgs.where.status).toBe(JobStatus.COMPLETED);
    });
  });

  // ─── WALLET TOP-UP APPROVAL/REJECTION ─────────────────────────────

  describe('wallet top-up approval', () => {
    let mockTransaction = {
      id: 'txn-1',
      userId: 'user-1',
      type: 'WALLET_TOPUP',
      amount: 5000,
      status: TransactionStatus.PENDING,
      user: { id: 'user-1' },
    };

    const mockLockedQuery = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    const mockUpdateQuery = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    beforeEach(() => {
      mockTransaction = {
        id: 'txn-1',
        userId: 'user-1',
        type: 'WALLET_TOPUP',
        amount: 5000,
        status: TransactionStatus.PENDING,
        user: { id: 'user-1' },
      };
      mockLockedQuery.getOne.mockReset().mockResolvedValue(mockTransaction);
      mockUpdateQuery.set.mockClear();
      mockUpdateQuery.where.mockClear();
      mockUpdateQuery.execute.mockClear();
      mockEntityManager.getRepository.mockImplementation((entity: any) => {
        if (entity === PaymentTransaction) {
          return { createQueryBuilder: jest.fn(() => mockLockedQuery) } as any;
        }
        if (entity === User) {
          return { 
            createQueryBuilder: jest.fn(() => mockLockedQuery),
            findOne: jest.fn().mockResolvedValue({ id: 'user-1', walletBalance: 10000 }),
          } as any;
        }
        if (entity === WalletLedger) {
          return { create: jest.fn(), save: jest.fn() } as any;
        }
        return { createQueryBuilder: jest.fn(() => mockLockedQuery) } as any;
      });
      mockEntityManager.createQueryBuilder.mockReturnValue(mockUpdateQuery);
    });

    it('locks PaymentTransaction with pessimistic_write', async () => {
      mockLockedQuery.getOne.mockResolvedValue(mockTransaction);
      await service.approveWalletTopUp('txn-1', 'admin-1');

      expect(mockLockedQuery.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('throws NotFoundException if transaction not found', async () => {
      mockLockedQuery.getOne.mockResolvedValue(null);

      await expect(service.approveWalletTopUp('txn-1', 'admin-1')).rejects.toThrow(
        'Transaction not found',
      );
    });

    it('throws BadRequestException if transaction status is not PENDING', async () => {
      mockLockedQuery.getOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.VERIFIED,
      });

      await expect(service.approveWalletTopUp('txn-1', 'admin-1')).rejects.toThrow(
        'already been processed',
      );
    });

    it('throws BadRequestException if transaction type is not WALLET_TOPUP', async () => {
      mockLockedQuery.getOne.mockResolvedValue({
        ...mockTransaction,
        type: 'JOB_PAYMENT',
      });

      await expect(service.approveWalletTopUp('txn-1', 'admin-1')).rejects.toThrow(
        'not a wallet top-up',
      );
    });

    it('credits wallet and marks transaction VERIFIED', async () => {
      await service.approveWalletTopUp('txn-1', 'admin-1');

      expect(mockUpdateQuery.set).toHaveBeenCalledWith(
        expect.objectContaining({
          walletBalance: expect.any(Function),
        }),
      );
      expect(mockUpdateQuery.where).toHaveBeenCalledWith('id = :id', { id: 'user-1' });
      expect(mockUpdateQuery.execute).toHaveBeenCalled();
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.VERIFIED }),
      );
    });

    it('is idempotent - second approval does not credit wallet again', async () => {
      mockLockedQuery.getOne.mockResolvedValue(mockTransaction);
      // First approval
      await service.approveWalletTopUp('txn-1', 'admin-1');
      const executeCallCount = mockUpdateQuery.execute.mock.calls.length;

      // Second approval - transaction now VERIFIED
      mockLockedQuery.getOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.VERIFIED,
      });

      await expect(service.approveWalletTopUp('txn-1', 'admin-1')).rejects.toThrow(
        'already been processed',
      );

      // Execute should not be called again
      expect(mockUpdateQuery.execute.mock.calls.length).toBe(executeCallCount);
    });
  });

  describe('wallet top-up rejection', () => {
    let mockTransaction = {
      id: 'txn-1',
      userId: 'user-1',
      type: 'WALLET_TOPUP',
      amount: 5000,
      status: TransactionStatus.PENDING,
      user: { id: 'user-1' },
    };

    const mockLockedQuery = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    beforeEach(() => {
      mockTransaction = {
        id: 'txn-1',
        userId: 'user-1',
        type: 'WALLET_TOPUP',
        amount: 5000,
        status: TransactionStatus.PENDING,
        user: { id: 'user-1' },
      };
      mockLockedQuery.getOne.mockReset().mockResolvedValue(mockTransaction);
      mockEntityManager.getRepository.mockImplementation((entity: any) => {
        if (entity === PaymentTransaction) {
          return { createQueryBuilder: jest.fn(() => mockLockedQuery) } as any;
        }
        if (entity === User) {
          return { 
            createQueryBuilder: jest.fn(() => mockLockedQuery),
            findOne: jest.fn().mockResolvedValue({ id: 'user-1', walletBalance: 10000 }),
          } as any;
        }
        if (entity === WalletLedger) {
          return { create: jest.fn(), save: jest.fn() } as any;
        }
        return { createQueryBuilder: jest.fn(() => mockLockedQuery) } as any;
      });
    });

    it('locks PaymentTransaction with pessimistic_write', async () => {
      mockLockedQuery.getOne.mockResolvedValue(mockTransaction);

      await service.rejectWalletTopUp('txn-1', 'admin-1', 'Invalid payment');

      expect(mockLockedQuery.setLock).toHaveBeenCalledWith('pessimistic_write');
    });

    it('throws NotFoundException if transaction not found', async () => {
      mockLockedQuery.getOne.mockResolvedValue(null);

      await expect(service.rejectWalletTopUp('txn-1', 'admin-1')).rejects.toThrow(
        'Transaction not found',
      );
    });

    it('throws BadRequestException if transaction status is not PENDING', async () => {
      mockLockedQuery.getOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.VERIFIED,
      });

      await expect(service.rejectWalletTopUp('txn-1', 'admin-1')).rejects.toThrow(
        'already been processed',
      );
    });

    it('throws BadRequestException if transaction type is not WALLET_TOPUP', async () => {
      mockLockedQuery.getOne.mockResolvedValue({
        ...mockTransaction,
        type: 'JOB_PAYMENT',
      });

      await expect(service.rejectWalletTopUp('txn-1', 'admin-1')).rejects.toThrow(
        'not a wallet top-up',
      );
    });

    it('marks transaction FAILED and stores failureReason', async () => {
      mockLockedQuery.getOne.mockResolvedValue(mockTransaction);

      await service.rejectWalletTopUp('txn-1', 'admin-1', 'Invalid payment reference');

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.FAILED,
          failureReason: 'Invalid payment reference',
        }),
      );
    });

    it('does not call wallet credit update on rejection', async () => {
      mockLockedQuery.getOne.mockResolvedValue(mockTransaction);

      await service.rejectWalletTopUp('txn-1', 'admin-1', 'Invalid payment');

      // createQueryBuilder should not be called for update
      expect(mockEntityManager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('is idempotent - second rejection does not change state', async () => {
      mockLockedQuery.getOne.mockResolvedValue(mockTransaction);

      // First rejection
      await service.rejectWalletTopUp('txn-1', 'admin-1', 'Invalid payment');
      const saveCallCount = mockEntityManager.save.mock.calls.length;

      // Second rejection - transaction now FAILED
      mockLockedQuery.getOne.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.FAILED,
      });

      await expect(service.rejectWalletTopUp('txn-1', 'admin-1', 'Another reason')).rejects.toThrow(
        'already been processed',
      );

      // Save should not be called again
      expect(mockEntityManager.save.mock.calls.length).toBe(saveCallCount);
    });
  });
});
