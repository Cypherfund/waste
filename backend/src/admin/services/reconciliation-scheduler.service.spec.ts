import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ReconciliationSchedulerService } from './reconciliation-scheduler.service';
import { ReconciliationService } from './reconciliation.service';
import { SystemConfigService } from '../../config/system-config.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReconciliationRun, ReconciliationRunStatus, ReconciliationRunTrigger } from '../entities/reconciliation-run.entity';
import { SentryService } from '../../sentry/sentry.service';
import { BusinessLoggerService } from '../../common/services/business-logger.service';

describe('ReconciliationSchedulerService', () => {
  let service: ReconciliationSchedulerService;
  let reconciliationRunRepo: jest.Mocked<Repository<ReconciliationRun>>;
  let reconciliationService: jest.Mocked<ReconciliationService>;
  let systemConfigService: jest.Mocked<SystemConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockReconciliationRun: ReconciliationRun = {
    id: 'run-1',
    reconciliationDate: '2026-05-29',
    status: ReconciliationRunStatus.SUCCESS,
    summaryId: 'summary-1',
    unreconciledCount: 0,
    errorMessage: null,
    startedAt: new Date(),
    finishedAt: new Date(),
    attemptCount: 1,
    triggeredBy: ReconciliationRunTrigger.SCHEDULED,
    triggeredByAdminId: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationSchedulerService,
        {
          provide: getRepositoryToken(ReconciliationRun),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ReconciliationService,
          useValue: {
            saveDailySummary: jest.fn(),
            getUnreconciledItems: jest.fn(),
          },
        },
        {
          provide: SystemConfigService,
          useValue: {
            getBoolean: jest.fn(),
            getString: jest.fn(),
            getNumber: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: SentryService,
          useValue: {
            isEnabled: jest.fn().mockReturnValue(false),
            captureException: jest.fn(),
            addBreadcrumb: jest.fn(),
            setContext: jest.fn(),
          },
        },
        {
          provide: BusinessLoggerService,
          useValue: {
            logFailure: jest.fn(),
            logWarning: jest.fn(),
            logInfo: jest.fn(),
            extractRequestContext: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReconciliationSchedulerService>(ReconciliationSchedulerService);
    reconciliationRunRepo = module.get(getRepositoryToken(ReconciliationRun));
    reconciliationService = module.get(ReconciliationService);
    systemConfigService = module.get(SystemConfigService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('runForDate', () => {
    it('should create new reconciliation run if none exists', async () => {
      systemConfigService.getNumber.mockResolvedValue(3);
      systemConfigService.getNumber.mockResolvedValue(5);
      reconciliationRunRepo.findOne.mockResolvedValue(null);
      reconciliationRunRepo.create.mockReturnValue(mockReconciliationRun);
      reconciliationRunRepo.save.mockResolvedValue(mockReconciliationRun);
      reconciliationService.saveDailySummary.mockResolvedValue({ id: 'summary-1' } as any);
      reconciliationService.getUnreconciledItems.mockResolvedValue([]);

      const result = await service.runForDate('2026-05-29', ReconciliationRunTrigger.MANUAL, 'admin-1');

      expect(reconciliationRunRepo.create).toHaveBeenCalled();
      expect(reconciliationRunRepo.save).toHaveBeenCalled();
      expect(result.status).toBe(ReconciliationRunStatus.SUCCESS);
    });

    it('should update existing reconciliation run if already exists', async () => {
      systemConfigService.getNumber.mockResolvedValue(3);
      systemConfigService.getNumber.mockResolvedValue(5);
      reconciliationRunRepo.findOne.mockResolvedValue(mockReconciliationRun);
      reconciliationRunRepo.save.mockResolvedValue(mockReconciliationRun);
      reconciliationService.saveDailySummary.mockResolvedValue({ id: 'summary-1' } as any);
      reconciliationService.getUnreconciledItems.mockResolvedValue([]);

      const result = await service.runForDate('2026-05-29', ReconciliationRunTrigger.MANUAL, 'admin-1');

      expect(reconciliationRunRepo.create).not.toHaveBeenCalled();
      expect(reconciliationRunRepo.save).toHaveBeenCalled();
    });

    it('should mark as SUCCESS_WITH_WARNINGS if unreconciled items found', async () => {
      systemConfigService.getNumber.mockResolvedValue(3);
      systemConfigService.getNumber.mockResolvedValue(5);
      reconciliationRunRepo.findOne.mockResolvedValue(null);
      reconciliationRunRepo.create.mockReturnValue(mockReconciliationRun);
      reconciliationRunRepo.save.mockResolvedValue(mockReconciliationRun);
      reconciliationService.saveDailySummary.mockResolvedValue({ id: 'summary-1' } as any);
      reconciliationService.getUnreconciledItems.mockResolvedValue([{ type: 'TEST' } as any]);

      const result = await service.runForDate('2026-05-29', ReconciliationRunTrigger.MANUAL, 'admin-1');

      expect(result.status).toBe(ReconciliationRunStatus.SUCCESS_WITH_WARNINGS);
      expect(result.unreconciledCount).toBe(1);
    });

    it('should emit notification on unreconciled items', async () => {
      systemConfigService.getBoolean.mockResolvedValue(true);
      systemConfigService.getNumber.mockResolvedValue(3);
      systemConfigService.getNumber.mockResolvedValue(5);
      reconciliationRunRepo.findOne.mockResolvedValue(null);
      reconciliationRunRepo.create.mockReturnValue(mockReconciliationRun);
      reconciliationRunRepo.save.mockResolvedValue(mockReconciliationRun);
      reconciliationService.saveDailySummary.mockResolvedValue({ id: 'summary-1' } as any);
      reconciliationService.getUnreconciledItems.mockResolvedValue([{ type: 'TEST' } as any]);

      await service.runForDate('2026-05-29', ReconciliationRunTrigger.MANUAL, 'admin-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith('admin.notification', expect.objectContaining({
        type: 'RECONCILIATION_ISSUES',
        severity: 'WARNING',
      }));
    });

    it('should mark as FAILED on error and return failed run', async () => {
      systemConfigService.getBoolean.mockImplementation((key: string) => {
        if (key === 'reconciliation.alert_on_failure') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      systemConfigService.getNumber
        .mockResolvedValueOnce(1) // retry_attempts
        .mockResolvedValueOnce(0); // retry_delay_minutes
      reconciliationRunRepo.findOne.mockResolvedValue(null);
      reconciliationRunRepo.create.mockReturnValue(mockReconciliationRun);
      reconciliationRunRepo.save.mockResolvedValue(mockReconciliationRun);
      reconciliationService.saveDailySummary.mockRejectedValue(new Error('Test error'));

      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      const result = await service.runForDate('2026-05-29', ReconciliationRunTrigger.MANUAL, 'admin-1');

      expect(result.status).toBe(ReconciliationRunStatus.FAILED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('admin.notification', expect.objectContaining({
        type: 'RECONCILIATION_FAILURE',
        severity: 'ERROR',
      }));
    }, 10000);

    it('should not emit success notification if disabled', async () => {
      systemConfigService.getBoolean.mockResolvedValue(false);
      systemConfigService.getNumber.mockResolvedValue(3);
      systemConfigService.getNumber.mockResolvedValue(5);
      reconciliationRunRepo.findOne.mockResolvedValue(null);
      reconciliationRunRepo.create.mockReturnValue(mockReconciliationRun);
      reconciliationRunRepo.save.mockResolvedValue(mockReconciliationRun);
      reconciliationService.saveDailySummary.mockResolvedValue({ id: 'summary-1' } as any);
      reconciliationService.getUnreconciledItems.mockResolvedValue([]);

      await service.runForDate('2026-05-29', ReconciliationRunTrigger.MANUAL, 'admin-1');

      expect(eventEmitter.emit).not.toHaveBeenCalledWith('admin.notification', expect.objectContaining({
        type: 'RECONCILIATION_SUCCESS',
      }));
    });
  });

  describe('runForPreviousBusinessDay', () => {
    it('should calculate previous day and run reconciliation', async () => {
      systemConfigService.getString.mockResolvedValue('Africa/Douala');
      jest.spyOn(service, 'runForDate').mockResolvedValue(mockReconciliationRun);

      await service.runForPreviousBusinessDay();

      expect(service.runForDate).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}/),
        ReconciliationRunTrigger.SCHEDULED,
        undefined,
      );
    });
  });
});
