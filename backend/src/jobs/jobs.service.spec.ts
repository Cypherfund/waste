import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobsService } from './jobs.service';
import { Job } from './entities/job.entity';
import { Proof } from './entities/proof.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { JobStatus } from '../common/enums/job-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { PricingService } from '../subscriptions/pricing.service';
import { PricingType } from '../common/enums/pricing-type.enum';
import { FilesService } from '../files/files.service';
import { PaymentService } from '../payments/payment.service';
import { SystemConfigService } from '../config/system-config.service';
import { EarningsService } from '../earnings/earnings.service';

describe('JobsService - Pricing Integration', () => {
  let service: JobsService;
  let jobRepo: any;
  let proofRepo: any;
  let eventEmitter: any;
  let filesService: any;
  let pricingService: any;
  let paymentService: any;

  const makeJob = (overrides: any = {}): any => ({
    id: 'job-1',
    householdId: 'hh-1',
    collectorId: null,
    status: JobStatus.REQUESTED,
    scheduledDate: '2026-12-31',
    scheduledTime: '09:00-12:00',
    locationAddress: 'Test Address',
    locationLat: 4.05,
    locationLng: 9.7,
    notes: null,
    quotedPrice: 500,
    pricingType: PricingType.PAY_PER_PICKUP,
    isCoveredBySubscription: false,
    paymentStatus: PaymentStatus.NOT_REQUIRED,
    paymentMethod: null,
    paymentRef: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const makeCreateJobDto = (overrides: any = {}): CreateJobDto => ({
    scheduledDate: '2026-12-31',
    scheduledTime: '09:00-12:00',
    locationAddress: 'Test Address',
    locationLat: 4.05,
    locationLng: 9.7,
    notes: null,
    paymentMethod: null,
    paymentRef: null,
    ...overrides,
  });

  beforeEach(async () => {
    jobRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 'job-1', createdAt: new Date(), ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    proofRepo = {
      findOne: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    filesService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    pricingService = {
      getQuoteForUser: jest.fn(),
      consumePickup: jest.fn().mockResolvedValue(true),
    };

    paymentService = {
      isPaymentIntegrationEnabled: jest.fn().mockResolvedValue(false),
      initiatePayment: jest.fn(),
      getProviderByCode: jest.fn().mockResolvedValue({ integrationEnabled: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: getRepositoryToken(Proof), useValue: proofRepo },
        { provide: getRepositoryToken(UserSubscription), useValue: {} },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: FilesService, useValue: filesService },
        { provide: PricingService, useValue: pricingService },
        { provide: PaymentService, useValue: paymentService },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: SystemConfigService, useValue: { getNumber: jest.fn().mockResolvedValue(24) } },
        { provide: EarningsService, useValue: { calculateEarnings: jest.fn().mockResolvedValue({ totalAmount: 500 }) } },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  describe('create - pricing integration', () => {
    it('should use PricingService to get quote and store pricing info', async () => {
      const pricingQuote = {
        quotedPrice: 500,
        pricingType: PricingType.PAY_PER_PICKUP,
        isCoveredBySubscription: false,
        remainingPickupsThisWeek: null,
        planName: null,
        perPickupPrice: 500,
        subscriptionPrice: 3500,
        subscriptionSavingsMessage: 'Save up to 2500 XAF/month',
      };
      pricingService.getQuoteForUser.mockResolvedValue(pricingQuote);
      jobRepo.findOne.mockResolvedValue(null);

      const dto = makeCreateJobDto();
      await service.create('hh-1', dto);

      expect(pricingService.getQuoteForUser).toHaveBeenCalledWith('hh-1');
      expect(jobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quotedPrice: 500,
          pricingType: PricingType.PAY_PER_PICKUP,
          isCoveredBySubscription: false,
        }),
      );
    });

    it('should consume pickup if job is covered by subscription', async () => {
      const pricingQuote = {
        quotedPrice: 0,
        pricingType: PricingType.SUBSCRIPTION,
        isCoveredBySubscription: true,
        remainingPickupsThisWeek: 3,
        planName: 'Basic Plan',
        perPickupPrice: 500,
        subscriptionPrice: 3500,
        subscriptionSavingsMessage: null,
      };
      pricingService.getQuoteForUser.mockResolvedValue(pricingQuote);
      jobRepo.findOne.mockResolvedValue(null);

      const dto = makeCreateJobDto();
      await service.create('hh-1', dto);

      expect(pricingService.consumePickup).toHaveBeenCalledWith('hh-1');
    });

    it('should not consume pickup if job is not covered by subscription', async () => {
      const pricingQuote = {
        quotedPrice: 500,
        pricingType: PricingType.PAY_PER_PICKUP,
        isCoveredBySubscription: false,
        remainingPickupsThisWeek: null,
        planName: null,
        perPickupPrice: 500,
        subscriptionPrice: 3500,
        subscriptionSavingsMessage: 'Save up to 2500 XAF/month',
      };
      pricingService.getQuoteForUser.mockResolvedValue(pricingQuote);
      jobRepo.findOne.mockResolvedValue(null);

      const dto = makeCreateJobDto();
      await service.create('hh-1', dto);

      expect(pricingService.consumePickup).not.toHaveBeenCalled();
    });

    it('should store pricing info when payment verification is required', async () => {
      const pricingQuote = {
        quotedPrice: 500,
        pricingType: PricingType.PAY_PER_PICKUP,
        isCoveredBySubscription: false,
        remainingPickupsThisWeek: null,
        planName: null,
        perPickupPrice: 500,
        subscriptionPrice: 3500,
        subscriptionSavingsMessage: null,
      };
      pricingService.getQuoteForUser.mockResolvedValue(pricingQuote);
      jobRepo.findOne.mockResolvedValue(null);

      const dto = makeCreateJobDto({
        paymentMethod: 'MOBILE_MONEY',
        paymentRef: 'TX123456789',
      });
      await service.create('hh-1', dto);

      expect(jobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: JobStatus.PAYMENT_PENDING,
          paymentStatus: PaymentStatus.AWAITING_ADMIN_VERIFICATION,
          paymentMethod: 'MOBILE_MONEY',
          paymentRef: 'TX123456789',
          quotedPrice: 500,
          pricingType: PricingType.PAY_PER_PICKUP,
          isCoveredBySubscription: false,
        }),
      );
    });

    it('should store pricing info for subscription-covered jobs', async () => {
      const pricingQuote = {
        quotedPrice: 0,
        pricingType: PricingType.SUBSCRIPTION,
        isCoveredBySubscription: true,
        remainingPickupsThisWeek: 3,
        planName: 'Basic Plan',
        perPickupPrice: 500,
        subscriptionPrice: 3500,
        subscriptionSavingsMessage: null,
      };
      pricingService.getQuoteForUser.mockResolvedValue(pricingQuote);
      jobRepo.findOne.mockResolvedValue(null);

      const dto = makeCreateJobDto();
      await service.create('hh-1', dto);

      expect(jobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quotedPrice: 0,
          pricingType: PricingType.SUBSCRIPTION,
          isCoveredBySubscription: true,
        }),
      );
    });

    it('should emit job created event', async () => {
      const pricingQuote = {
        quotedPrice: 500,
        pricingType: PricingType.PAY_PER_PICKUP,
        isCoveredBySubscription: false,
        remainingPickupsThisWeek: null,
        planName: null,
        perPickupPrice: 500,
        subscriptionPrice: 3500,
        subscriptionSavingsMessage: 'Save up to 2500 XAF/month',
      };
      pricingService.getQuoteForUser.mockResolvedValue(pricingQuote);
      jobRepo.findOne.mockResolvedValue(null);

      const dto = makeCreateJobDto();
      await service.create('hh-1', dto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'job.created',
        expect.objectContaining({
          jobId: 'job-1',
          householdId: 'hh-1',
          status: JobStatus.REQUESTED,
        }),
      );
    });
  });

  describe('toResponseDto - pricing fields', () => {
    it('should include pricing fields in response DTO', async () => {
      const job = makeJob({
        quotedPrice: 500,
        pricingType: PricingType.PAY_PER_PICKUP,
        isCoveredBySubscription: false,
      });

      const dto = await service['toResponseDto'](job);

      expect(dto.quotedPrice).toBe(500);
      expect(dto.pricingType).toBe(PricingType.PAY_PER_PICKUP);
      expect(dto.isCoveredBySubscription).toBe(false);
    });

    it('should include subscription pricing fields in response DTO', async () => {
      const job = makeJob({
        quotedPrice: 0,
        pricingType: PricingType.SUBSCRIPTION,
        isCoveredBySubscription: true,
      });

      const dto = await service['toResponseDto'](job);

      expect(dto.quotedPrice).toBe(0);
      expect(dto.pricingType).toBe(PricingType.SUBSCRIPTION);
      expect(dto.isCoveredBySubscription).toBe(true);
    });
  });
});
