import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, Like, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SystemCleanupLog, CleanupStatus } from '../entities/system-cleanup-log.entity';
import { User } from '../../users/entities/user.entity';
import { Job } from '../../jobs/entities/job.entity';
import { Proof } from '../../jobs/entities/proof.entity';
import { Rating } from '../../ratings/entities/rating.entity';
import { Dispute } from '../../disputes/entities/dispute.entity';
import { FraudFlag } from '../../fraud/entities/fraud-flag.entity';
import { LocationUpdate } from '../../websocket/entities/location-update.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { FileRecord } from '../../files/entities/file.entity';
import { Earning } from '../../earnings/entities/earning.entity';
import { PayoutRequest } from '../../wallet/entities/payout-request.entity';
import { CollectorFloatLedger } from '../../wallet/entities/collector-float-ledger.entity';
import { UserAddress } from '../../users/entities/user-address.entity';
import { UserPaymentMethod } from '../../wallet/entities/user-payment-method.entity';
import { UserSubscription } from '../../subscriptions/entities/user-subscription.entity';
import { PaymentTransaction } from '../../payments/entities/payment-transaction.entity';
import { Lead } from '../../growth/entities/lead.entity';
import { MarketerProfile } from '../../growth/entities/marketer-profile.entity';
import { CommissionTransaction } from '../../growth/entities/commission-transaction.entity';
import { MarketerPayoutRequest } from '../../growth/entities/marketer-payout-request.entity';
import { MarketerNotification } from '../../growth/entities/marketer-notification.entity';
import { MarketingCampaign } from '../../growth/entities/marketing-campaign.entity';
import { MarketingBudgetPeriod } from '../../growth/entities/marketing-budget-period.entity';
import { BudgetTransaction } from '../../growth/entities/budget-transaction.entity';
import { CampaignMarketerAssignment } from '../../growth/entities/campaign-marketer-assignment.entity';
import { CampaignCommissionScheme } from '../../growth/entities/campaign-commission-scheme.entity';
import { MarketerSchemeAssignment } from '../../growth/entities/marketer-scheme-assignment.entity';

export interface CleanupFilters {
  createdBefore?: string;
  createdAfter?: string;
  phonePattern?: string;
  emailPattern?: string;
  roles?: string[];
  forceAllNonAdmin?: boolean;
}

export interface CleanupComponents {
  jobs?: boolean;
  users?: boolean;
  growth?: boolean;
  marketingBudgets?: boolean;
  payments?: boolean;
  files?: boolean;
  notifications?: boolean;
}

export interface CleanupRequest {
  developerCode: string;
  confirmationPhrase?: string;
  dryRun?: boolean;
  logId?: string;
  filters: CleanupFilters;
  components: CleanupComponents;
}

export interface CleanupAnalysis {
  jobs: { jobs: number; proofs: number; ratings: number; disputes: number; fraudFlags: number; locationUpdates: number };
  users: { users: number; addresses: number; paymentMethods: number; subscriptions: number };
  growth: { leads: number; marketerProfiles: number; commissionTransactions: number; marketerPayoutRequests: number };
  marketingBudgets: { campaigns: number; budgetPeriods: number; budgetTransactions: number };
  payments: { paymentTransactions: number; earnings: number; payoutRequests: number; collectorFloatLedger: number };
  files: { unusedFiles: number };
  notifications: { notifications: number; marketerNotifications: number };
}

@Injectable()
export class SystemCleanupService {
  private readonly logger = new Logger(SystemCleanupService.name);

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
    @InjectRepository(SystemCleanupLog)
    private cleanupLogRepo: Repository<SystemCleanupLog>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
    @InjectRepository(Proof)
    private proofRepo: Repository<Proof>,
    @InjectRepository(Rating)
    private ratingRepo: Repository<Rating>,
    @InjectRepository(Dispute)
    private disputeRepo: Repository<Dispute>,
    @InjectRepository(FraudFlag)
    private fraudFlagRepo: Repository<FraudFlag>,
    @InjectRepository(LocationUpdate)
    private locationUpdateRepo: Repository<LocationUpdate>,
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(FileRecord)
    private fileRepo: Repository<FileRecord>,
    @InjectRepository(Earning)
    private earningRepo: Repository<Earning>,
    @InjectRepository(PayoutRequest)
    private payoutRequestRepo: Repository<PayoutRequest>,
    @InjectRepository(CollectorFloatLedger)
    private collectorFloatLedgerRepo: Repository<CollectorFloatLedger>,
    @InjectRepository(UserAddress)
    private userAddressRepo: Repository<UserAddress>,
    @InjectRepository(UserPaymentMethod)
    private userPaymentMethodRepo: Repository<UserPaymentMethod>,
    @InjectRepository(UserSubscription)
    private userSubscriptionRepo: Repository<UserSubscription>,
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
    @InjectRepository(MarketerProfile)
    private marketerProfileRepo: Repository<MarketerProfile>,
    @InjectRepository(CommissionTransaction)
    private commissionTransactionRepo: Repository<CommissionTransaction>,
    @InjectRepository(MarketerPayoutRequest)
    private marketerPayoutRequestRepo: Repository<MarketerPayoutRequest>,
    @InjectRepository(MarketerNotification)
    private marketerNotificationRepo: Repository<MarketerNotification>,
    @InjectRepository(MarketingCampaign)
    private marketingCampaignRepo: Repository<MarketingCampaign>,
    @InjectRepository(MarketingBudgetPeriod)
    private marketingBudgetPeriodRepo: Repository<MarketingBudgetPeriod>,
    @InjectRepository(BudgetTransaction)
    private budgetTransactionRepo: Repository<BudgetTransaction>,
    @InjectRepository(CampaignMarketerAssignment)
    private campaignMarketerAssignmentRepo: Repository<CampaignMarketerAssignment>,
    @InjectRepository(CampaignCommissionScheme)
    private campaignCommissionSchemeRepo: Repository<CampaignCommissionScheme>,
    @InjectRepository(MarketerSchemeAssignment)
    private marketerSchemeAssignmentRepo: Repository<MarketerSchemeAssignment>,
  ) {}

  validateDeveloperCode(code: string): boolean {
    const validCode = this.configService.get<string>('DEV_CLEANUP_CODE');
    return code === validCode;
  }

  isCleanupAllowed(): boolean {
    return this.configService.get<string>('ALLOW_SYSTEM_CLEANUP') === 'true';
  }

  validateFilters(filters: CleanupFilters): void {
    if (!filters.forceAllNonAdmin) {
      const hasFilter =
        filters.createdBefore ||
        filters.createdAfter ||
        filters.phonePattern ||
        filters.emailPattern ||
        (filters.roles && filters.roles.length > 0);
      if (!hasFilter) {
        throw new BadRequestException('At least one filter is required unless forceAllNonAdmin is true');
      }
    }
  }

  validateConfirmationPhrase(phrase?: string): void {
    if (phrase !== 'DELETE TEST DATA') {
      throw new BadRequestException('Confirmation phrase must be "DELETE TEST DATA"');
    }
  }

  async analyzeCleanup(request: CleanupRequest, requestedBy: string): Promise<{ analysis: CleanupAnalysis; logId: string }> {
    if (!this.isCleanupAllowed()) {
      throw new BadRequestException('System cleanup is not enabled. Set ALLOW_SYSTEM_CLEANUP=true');
    }
    if (!this.validateDeveloperCode(request.developerCode)) {
      throw new BadRequestException('Invalid developer code');
    }
    this.validateFilters(request.filters);

    const analysis = await this.performAnalysis(request.filters, request.components);
    const log = this.cleanupLogRepo.create({
      requestedBy,
      filters: request.filters,
      components: request.components,
      analysisBefore: analysis,
      status: CleanupStatus.ANALYZED,
    });
    await this.cleanupLogRepo.save(log);

    return { analysis, logId: log.id };
  }

  async executeCleanup(request: CleanupRequest, requestedBy: string): Promise<{ deletedCounts: CleanupAnalysis; errors: string[]; logId: string }> {
    if (!this.isCleanupAllowed()) {
      throw new BadRequestException('System cleanup is not enabled. Set ALLOW_SYSTEM_CLEANUP=true');
    }
    if (!this.validateDeveloperCode(request.developerCode)) {
      throw new BadRequestException('Invalid developer code');
    }
    this.validateFilters(request.filters);
    this.validateConfirmationPhrase(request.confirmationPhrase);

    const log = await this.cleanupLogRepo.findOne({
      where: { id: request.logId },
    });
    if (!log) {
      throw new BadRequestException('Cleanup log not found. Please run analysis first.');
    }

    // Validate that execute request matches the analysis log
    const normalizeObj = (obj: any) => {
      const normalized: any = {};
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        normalized[key] = obj[key];
      }
      return normalized;
    };

    if (JSON.stringify(normalizeObj(log.filters)) !== JSON.stringify(normalizeObj(request.filters))) {
      throw new BadRequestException('Filters do not match the analysis. Please run analysis again.');
    }
    if (JSON.stringify(normalizeObj(log.components)) !== JSON.stringify(normalizeObj(request.components))) {
      throw new BadRequestException('Components do not match the analysis. Please run analysis again.');
    }

    log.status = CleanupStatus.COMPLETED;
    log.startedAt = new Date();
    await this.cleanupLogRepo.save(log);

    const errors: string[] = [];
    let deletedCounts: CleanupAnalysis;

    try {
      deletedCounts = await this.performDeletion(request.filters, request.components, request.dryRun || false, errors);
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`);
      log.status = CleanupStatus.FAILED;
      log.errors = [error.message];
      log.completedAt = new Date();
      await this.cleanupLogRepo.save(log);
      throw error;
    }

    log.deletedCounts = deletedCounts;
    log.errors = errors;
    log.completedAt = new Date();
    await this.cleanupLogRepo.save(log);

    return { deletedCounts, errors, logId: log.id };
  }

  private async performAnalysis(filters: CleanupFilters, components: CleanupComponents): Promise<CleanupAnalysis> {
    const analysis: CleanupAnalysis = {
      jobs: { jobs: 0, proofs: 0, ratings: 0, disputes: 0, fraudFlags: 0, locationUpdates: 0 },
      users: { users: 0, addresses: 0, paymentMethods: 0, subscriptions: 0 },
      growth: { leads: 0, marketerProfiles: 0, commissionTransactions: 0, marketerPayoutRequests: 0 },
      marketingBudgets: { campaigns: 0, budgetPeriods: 0, budgetTransactions: 0 },
      payments: { paymentTransactions: 0, earnings: 0, payoutRequests: 0, collectorFloatLedger: 0 },
      files: { unusedFiles: 0 },
      notifications: { notifications: 0, marketerNotifications: 0 },
    // cache: { idempotencyCache: 0 },
    };

    const userWhere = this.buildUserWhereClause(filters);
    const userIds = components.users ? await this.getUserIds(userWhere) : [];

    if (components.jobs) {
      const jobWhere = userIds.length > 0 ? { householdId: In(userIds) } : {};
      analysis.jobs.jobs = await this.jobRepo.count({ where: jobWhere });
      analysis.jobs.proofs = userIds.length > 0 ? await this.proofRepo.createQueryBuilder("proof").innerJoin("proof.job", "job").where("job.householdId IN (:...userIds)", { userIds }).getCount() : 0;
      analysis.jobs.ratings = userIds.length > 0 ? await this.ratingRepo.createQueryBuilder("rating").innerJoin("rating.job", "job").where("job.householdId IN (:...userIds)", { userIds }).getCount() : 0;
      analysis.jobs.disputes = userIds.length > 0 ? await this.disputeRepo.createQueryBuilder("dispute").innerJoin("dispute.job", "job").where("job.householdId IN (:...userIds)", { userIds }).getCount() : 0;
      analysis.jobs.fraudFlags = userIds.length > 0 ? await this.fraudFlagRepo.createQueryBuilder("fraudFlag").innerJoin("fraudFlag.job", "job").where("job.householdId IN (:...userIds)", { userIds }).getCount() : 0;
      analysis.jobs.locationUpdates = userIds.length > 0 ? await this.locationUpdateRepo.createQueryBuilder("locationUpdate").innerJoin("locationUpdate.job", "job").where("job.householdId IN (:...userIds)", { userIds }).getCount() : 0;
    }

    if (components.users) {
      analysis.users.users = await this.userRepo.count({ where: userWhere });
      analysis.users.addresses = userIds.length > 0 ? await this.userAddressRepo.count({ where: { userId: In(userIds) } }) : 0;
      analysis.users.paymentMethods = userIds.length > 0 ? await this.userPaymentMethodRepo.count({ where: { userId: In(userIds) } }) : 0;
      analysis.users.subscriptions = userIds.length > 0 ? await this.userSubscriptionRepo.count({ where: { userId: In(userIds) } }) : 0;
    }

    if (components.growth) {
      analysis.growth.leads = userIds.length > 0 ? await this.leadRepo.count({ where: { marketerId: In(userIds) } }) : 0;
      analysis.growth.marketerProfiles = userIds.length > 0 ? await this.marketerProfileRepo.count({ where: { userId: In(userIds) } }) : 0;
      
      // Get marketer profile IDs for the users
      const marketerProfiles = userIds.length > 0 ? await this.marketerProfileRepo.find({ 
        where: { userId: In(userIds) }, 
        select: ['id'] 
      }) : [];
      const marketerProfileIds = marketerProfiles.map(mp => mp.id);
      
      analysis.growth.commissionTransactions = marketerProfileIds.length > 0 ? await this.commissionTransactionRepo.count({ where: { marketerProfileId: In(marketerProfileIds) } }) : 0;
      analysis.growth.marketerPayoutRequests = marketerProfileIds.length > 0 ? await this.marketerPayoutRequestRepo.count({ where: { marketerProfileId: In(marketerProfileIds) } }) : 0;
    }

    if (components.marketingBudgets) {
      analysis.marketingBudgets.campaigns = await this.marketingCampaignRepo.count();
      analysis.marketingBudgets.budgetPeriods = await this.marketingBudgetPeriodRepo.count();
      analysis.marketingBudgets.budgetTransactions = await this.budgetTransactionRepo.count();
    }

    if (components.payments) {
      const paymentWhere = userIds.length > 0 ? { userId: In(userIds) } : {};
      analysis.payments.paymentTransactions = await this.paymentTransactionRepo.count({ where: paymentWhere });
      analysis.payments.earnings = userIds.length > 0 ? await this.earningRepo.count({ where: { collectorId: In(userIds) } }) : 0;
      analysis.payments.payoutRequests = userIds.length > 0 ? await this.payoutRequestRepo.count({ where: { collectorId: In(userIds) } }) : 0;
      analysis.payments.collectorFloatLedger = userIds.length > 0 ? await this.collectorFloatLedgerRepo.count({ where: { collectorId: In(userIds) } }) : 0;
    }

    if (components.files) {
      analysis.files.unusedFiles = await this.fileRepo.count({ where: { isUsed: false } });
    }

    if (components.notifications) {
      const notificationWhere = userIds.length > 0 ? { userId: In(userIds) } : {};
      analysis.notifications.notifications = await this.notificationRepo.count({ where: notificationWhere });
      
      // Get marketer profile IDs for the users
      const marketerProfiles = userIds.length > 0 ? await this.marketerProfileRepo.find({ 
        where: { userId: In(userIds) }, 
        select: ['id'] 
      }) : [];
      const marketerProfileIds = marketerProfiles.map(mp => mp.id);
      
      analysis.notifications.marketerNotifications = marketerProfileIds.length > 0 ? await this.marketerNotificationRepo.count({ where: { marketerProfileId: In(marketerProfileIds) } }) : 0;
    }

    return analysis;
  }

  private async performDeletion(filters: CleanupFilters, components: CleanupComponents, dryRun: boolean, errors: string[]): Promise<CleanupAnalysis> {
    const deletedCounts: CleanupAnalysis = {
      jobs: { jobs: 0, proofs: 0, ratings: 0, disputes: 0, fraudFlags: 0, locationUpdates: 0 },
      users: { users: 0, addresses: 0, paymentMethods: 0, subscriptions: 0 },
      growth: { leads: 0, marketerProfiles: 0, commissionTransactions: 0, marketerPayoutRequests: 0 },
      marketingBudgets: { campaigns: 0, budgetPeriods: 0, budgetTransactions: 0 },
      payments: { paymentTransactions: 0, earnings: 0, payoutRequests: 0, collectorFloatLedger: 0 },
      files: { unusedFiles: 0 },
      notifications: { notifications: 0, marketerNotifications: 0 },
    };

    const userWhere = this.buildUserWhereClause(filters);
    const userIds = components.users ? await this.getUserIds(userWhere) : [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete in order respecting foreign key constraints
      
      // 1. Delete earnings first (they reference jobs)
      if (components.payments) {
        deletedCounts.payments.earnings = userIds.length > 0 ? await this.deleteCount(queryRunner, this.earningRepo, { collectorId: In(userIds) }, dryRun, errors) : 0;
      }
      
      // 2. Delete job-related entities
      if (components.jobs) {
        // Get job IDs for the households
        const jobs = userIds.length > 0 ? await this.jobRepo.find({ 
          where: { householdId: In(userIds) }, 
          select: ['id'] 
        }) : [];
        const jobIds = jobs.map(j => j.id);
        
        const jobWhere = jobIds.length > 0 ? { jobId: In(jobIds) } : {};
        deletedCounts.jobs.locationUpdates = jobIds.length > 0 ? await this.deleteCount(queryRunner, this.locationUpdateRepo, jobWhere, dryRun, errors) : 0;
        deletedCounts.jobs.proofs = jobIds.length > 0 ? await this.deleteCount(queryRunner, this.proofRepo, jobWhere, dryRun, errors) : 0;
        deletedCounts.jobs.ratings = jobIds.length > 0 ? await this.deleteCount(queryRunner, this.ratingRepo, jobWhere, dryRun, errors) : 0;
        deletedCounts.jobs.disputes = jobIds.length > 0 ? await this.deleteCount(queryRunner, this.disputeRepo, jobWhere, dryRun, errors) : 0;
        deletedCounts.jobs.fraudFlags = jobIds.length > 0 ? await this.deleteCount(queryRunner, this.fraudFlagRepo, jobWhere, dryRun, errors) : 0;
        deletedCounts.jobs.jobs = userIds.length > 0 ? await this.deleteCount(queryRunner, this.jobRepo, { householdId: In(userIds) }, dryRun, errors) : 0;
      }
      
      // 3. Delete payment-related entities (after jobs are gone)
      if (components.payments) {
        const paymentWhere = userIds.length > 0 ? { userId: In(userIds) } : {};
        deletedCounts.payments.paymentTransactions = await this.deleteCount(queryRunner, this.paymentTransactionRepo, paymentWhere, dryRun, errors);
        deletedCounts.payments.payoutRequests = userIds.length > 0 ? await this.deleteCount(queryRunner, this.payoutRequestRepo, { collectorId: In(userIds) }, dryRun, errors) : 0;
        deletedCounts.payments.collectorFloatLedger = userIds.length > 0 ? await this.deleteCount(queryRunner, this.collectorFloatLedgerRepo, { collectorId: In(userIds) }, dryRun, errors) : 0;
      }

      // 4. Delete growth-related entities
      if (components.growth) {
        // Get marketer profile IDs for the users
        const marketerProfiles = userIds.length > 0 ? await this.marketerProfileRepo.find({ 
          where: { userId: In(userIds) }, 
          select: ['id'] 
        }) : [];
        const marketerProfileIds = marketerProfiles.map(mp => mp.id);
        
        deletedCounts.growth.leads = userIds.length > 0 ? await this.deleteCount(queryRunner, this.leadRepo, { marketerId: In(userIds) }, dryRun, errors) : 0;
        deletedCounts.growth.marketerProfiles = userIds.length > 0 ? await this.deleteCount(queryRunner, this.marketerProfileRepo, { userId: In(userIds) }, dryRun, errors) : 0;
        deletedCounts.growth.commissionTransactions = marketerProfileIds.length > 0 ? await this.deleteCount(queryRunner, this.commissionTransactionRepo, { marketerProfileId: In(marketerProfileIds) }, dryRun, errors) : 0;
        deletedCounts.growth.marketerPayoutRequests = marketerProfileIds.length > 0 ? await this.deleteCount(queryRunner, this.marketerPayoutRequestRepo, { marketerProfileId: In(marketerProfileIds) }, dryRun, errors) : 0;
      }

      // 5. Delete marketing budgets
      if (components.marketingBudgets) {
        deletedCounts.marketingBudgets.budgetTransactions = await this.deleteCount(queryRunner, this.budgetTransactionRepo, {}, dryRun, errors);
        deletedCounts.marketingBudgets.campaigns = await this.deleteCount(queryRunner, this.marketingCampaignRepo, {}, dryRun, errors);
        deletedCounts.marketingBudgets.budgetPeriods = await this.deleteCount(queryRunner, this.marketingBudgetPeriodRepo, {}, dryRun, errors);
      }

      // 6. Delete notifications
      if (components.notifications) {
        const notificationWhere = userIds.length > 0 ? { userId: In(userIds) } : {};
        deletedCounts.notifications.notifications = await this.deleteCount(queryRunner, this.notificationRepo, notificationWhere, dryRun, errors);
        
        // Get marketer profile IDs for the users
        const marketerProfiles = userIds.length > 0 ? await this.marketerProfileRepo.find({ 
          where: { userId: In(userIds) }, 
          select: ['id'] 
        }) : [];
        const marketerProfileIds = marketerProfiles.map(mp => mp.id);
        
        deletedCounts.notifications.marketerNotifications = marketerProfileIds.length > 0 ? await this.deleteCount(queryRunner, this.marketerNotificationRepo, { marketerProfileId: In(marketerProfileIds) }, dryRun, errors) : 0;
      }

      // 7. Delete user-related entities (before users)
      if (components.users) {
        deletedCounts.users.subscriptions = userIds.length > 0 ? await this.deleteCount(queryRunner, this.userSubscriptionRepo, { userId: In(userIds) }, dryRun, errors) : 0;
        deletedCounts.users.paymentMethods = userIds.length > 0 ? await this.deleteCount(queryRunner, this.userPaymentMethodRepo, { userId: In(userIds) }, dryRun, errors) : 0;
        deletedCounts.users.addresses = userIds.length > 0 ? await this.deleteCount(queryRunner, this.userAddressRepo, { userId: In(userIds) }, dryRun, errors) : 0;
        deletedCounts.users.users = await this.deleteCount(queryRunner, this.userRepo, userWhere, dryRun, errors);
      }

      // 8. Delete files
      if (components.files) {
        deletedCounts.files.unusedFiles = await this.deleteCount(queryRunner, this.fileRepo, { isUsed: false }, dryRun, errors);
      }

      if (!dryRun) {
        await queryRunner.commitTransaction();
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return deletedCounts;
  }

  private buildUserWhereClause(filters: CleanupFilters): any {
    const where: any = { role: In(['HOUSEHOLD', 'COLLECTOR', 'MARKETER']) };

    if (filters.createdBefore || filters.createdAfter) {
      where.createdAt = Between(
        filters.createdAfter ? new Date(filters.createdAfter) : new Date('1970-01-01'),
        filters.createdBefore ? new Date(filters.createdBefore) : new Date(),
      );
    }

    if (filters.phonePattern) {
      where.phone = Like(filters.phonePattern);
    }

    if (filters.emailPattern) {
      where.email = Like(filters.emailPattern);
    }

    if (filters.roles && filters.roles.length > 0) {
      where.role = In(filters.roles);
    }

    return where;
  }

  private async getUserIds(where: any): Promise<string[]> {
    const users = await this.userRepo.find({ where, select: ['id'] });
    return users.map((u) => u.id);
  }

  private async deleteCount(
    queryRunner: any,
    repo: Repository<any>,
    where: any,
    dryRun: boolean,
    errors: string[],
  ): Promise<number> {
    try {
      const count = await repo.count({ where });
      if (!dryRun && count > 0) {
        await repo.delete(where);
      }
      return count;
    } catch (error) {
      this.logger.error(`Error deleting from ${repo.metadata.tableName}: ${error.message}`);
      errors.push(`Failed to delete from ${repo.metadata.tableName}: ${error.message}`);
      return 0;
    }
  }

  async getLogs(): Promise<SystemCleanupLog[]> {
    return this.cleanupLogRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getLog(id: string): Promise<SystemCleanupLog | null> {
    return this.cleanupLogRepo.findOne({ where: { id } });
  }
}
