import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PricingService } from './pricing.service';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { PricingType } from '../common/enums/pricing-type.enum';
import { SystemConfigService } from '../config/system-config.service';

describe('PricingService', () => {
  let service: PricingService;
  let subRepo: any;
  let planRepo: any;
  let systemConfigService: any;

  const makePlan = (overrides: any = {}): any => ({
    id: 'plan-1',
    name: 'Basic Plan',
    price: 3500,
    pickupsPerWeek: 3,
    isActive: true,
    ...overrides,
  });

  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const makeSubscription = (overrides: any = {}): any => ({
    id: 'sub-1',
    userId: 'user-1',
    planId: 'plan-1',
    status: SubscriptionStatus.ACTIVE,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    remainingPickupsThisWeek: 3,
    weekResetDate: getMondayOfWeek(new Date()).toISOString().split('T')[0],
    plan: makePlan(),
    ...overrides,
  });

  beforeEach(async () => {
    const mockQueryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    subRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      _mockQueryBuilder: mockQueryBuilder,
    };

    planRepo = {
      find: jest.fn(),
    };

    systemConfigService = {
      configRepo: {
        findOne: jest.fn().mockImplementation(({ where: { key } }) => {
          const values: Record<string, string> = {
            'pricing.per_pickup_price': '500',
            'pricing.weeks_per_month': '4',
          };
          const value = values[key];
          if (!value) return null;
          return Promise.resolve({ key, value });
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: getRepositoryToken(UserSubscription), useValue: subRepo },
        { provide: getRepositoryToken(SubscriptionPlan), useValue: planRepo },
        { provide: SystemConfigService, useValue: systemConfigService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  describe('getQuoteForUser', () => {
    it('should return pay-per-pickup pricing for user without subscription', async () => {
      subRepo.findOne.mockResolvedValue(null);
      planRepo.find.mockResolvedValue([makePlan()]);

      const result = await service.getQuoteForUser('user-1');

      expect(result.quotedPrice).toBe(500);
      expect(result.pricingType).toBe(PricingType.PAY_PER_PICKUP);
      expect(result.isCoveredBySubscription).toBe(false);
      expect(result.remainingPickupsThisWeek).toBeNull();
      expect(result.planName).toBeNull();
      expect(result.perPickupPrice).toBe(500);
      expect(result.subscriptionPrice).toBe(3500);
      expect(result.subscriptionSavingsMessage).toContain('save up to');
    });

    it('should return free pricing for user with active subscription and remaining pickups', async () => {
      const subscription = makeSubscription({ remainingPickupsThisWeek: 2 });
      subRepo.findOne.mockResolvedValue(subscription);
      planRepo.find.mockResolvedValue([makePlan()]);

      const result = await service.getQuoteForUser('user-1');

      expect(result.quotedPrice).toBe(0);
      expect(result.pricingType).toBe(PricingType.SUBSCRIPTION);
      expect(result.isCoveredBySubscription).toBe(true);
      expect(result.remainingPickupsThisWeek).toBe(2);
      expect(result.planName).toBe('Basic Plan');
      expect(result.perPickupPrice).toBe(500);
      expect(result.subscriptionPrice).toBe(3500);
      expect(result.subscriptionSavingsMessage).toBeNull();
    });

    it('should return pay-per-pickup for user with subscription but no remaining pickups', async () => {
      const subscription = makeSubscription({ remainingPickupsThisWeek: 0 });
      subRepo.findOne.mockResolvedValue(subscription);
      planRepo.find.mockResolvedValue([makePlan()]);

      const result = await service.getQuoteForUser('user-1');

      expect(result.quotedPrice).toBe(500);
      expect(result.pricingType).toBe(PricingType.PAY_PER_PICKUP);
      expect(result.isCoveredBySubscription).toBe(false);
      expect(result.remainingPickupsThisWeek).toBe(0);
      expect(result.planName).toBe('Basic Plan');
    });

    it('should return null for expired subscription', async () => {
      const subscription = makeSubscription({ endDate: '2025-01-01' });
      subRepo.findOne.mockResolvedValue(subscription);
      planRepo.find.mockResolvedValue([makePlan()]);

      const result = await service.getQuoteForUser('user-1');

      expect(result.quotedPrice).toBe(500);
      expect(result.isCoveredBySubscription).toBe(false);
      expect(result.remainingPickupsThisWeek).toBeNull();
    });

    it('should throw error if required config is missing', async () => {
      systemConfigService.configRepo.findOne.mockResolvedValue(null);
      subRepo.findOne.mockResolvedValue(null);
      planRepo.find.mockResolvedValue([]);

      await expect(service.getQuoteForUser('user-1')).rejects.toThrow(
        "Required configuration 'pricing.per_pickup_price' is not set",
      );
    });

    it('should throw error if config value is not a valid number', async () => {
      systemConfigService.configRepo.findOne.mockResolvedValue({
        key: 'pricing.per_pickup_price',
        value: 'invalid',
      });
      subRepo.findOne.mockResolvedValue(null);
      planRepo.find.mockResolvedValue([]);

      await expect(service.getQuoteForUser('user-1')).rejects.toThrow(
        "Configuration 'pricing.per_pickup_price' is not a valid number",
      );
    });
  });

  describe('consumePickup', () => {
    it('should return true and execute atomic decrement for user with active subscription', async () => {
      const subscription = makeSubscription({ remainingPickupsThisWeek: 3 });
      subRepo.findOne.mockResolvedValue(subscription);
      subRepo._mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      const result = await service.consumePickup('user-1');

      expect(result).toBe(true);
      expect(subRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should return false if user has no subscription', async () => {
      subRepo.findOne.mockResolvedValue(null);

      const result = await service.consumePickup('user-1');

      expect(result).toBe(false);
      expect(subRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return false if atomic decrement finds remaining = 0', async () => {
      const subscription = makeSubscription({ remainingPickupsThisWeek: 0 });
      subRepo.findOne.mockResolvedValue(subscription);
      subRepo._mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await service.consumePickup('user-1');

      expect(result).toBe(false);
    });

    it('should reset weekly pickups before consuming if needed', async () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekMonday = getMondayOfWeek(lastWeek);
      const lastWeekMondayStr = lastWeekMonday.toISOString().split('T')[0];

      const subscription = makeSubscription({
        remainingPickupsThisWeek: 0,
        weekResetDate: lastWeekMondayStr,
      });
      subRepo.findOne.mockResolvedValue(subscription);
      planRepo.find.mockResolvedValue([makePlan()]);
      subRepo._mockQueryBuilder.execute.mockResolvedValue({ affected: 1 });

      const result = await service.consumePickup('user-1');

      expect(result).toBe(true);
      expect(subscription.weekResetDate).toBe(
        getMondayOfWeek(new Date()).toISOString().split('T')[0],
      );
      expect(subRepo.save).toHaveBeenCalledWith(subscription); // reset saves
    });
  });

  describe('getActiveSubscription', () => {
    it('should return active subscription', async () => {
      const subscription = makeSubscription();
      subRepo.findOne.mockResolvedValue(subscription);

      const result = await service.getActiveSubscription('user-1');

      expect(result).toEqual(subscription);
      expect(subRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: SubscriptionStatus.ACTIVE },
        relations: ['plan'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return null if no subscription found', async () => {
      subRepo.findOne.mockResolvedValue(null);

      const result = await service.getActiveSubscription('user-1');

      expect(result).toBeNull();
    });

    it('should return null for expired subscription', async () => {
      const subscription = makeSubscription({ endDate: '2025-01-01' });
      subRepo.findOne.mockResolvedValue(subscription);

      const result = await service.getActiveSubscription('user-1');

      expect(result).toBeNull();
    });

    it('should return null for inactive subscription', async () => {
      // The WHERE clause filters by status, so a CANCELLED subscription
      // would never be returned by the database query. We simulate this
      // by having the mock return null for non-active statuses.
      subRepo.findOne.mockResolvedValue(null);

      const result = await service.getActiveSubscription('user-1');

      expect(result).toBeNull();
    });
  });

  describe('buildSavingsMessage', () => {
    it('should return savings message when subscription saves money', async () => {
      subRepo.findOne.mockResolvedValue(null);
      planRepo.find.mockResolvedValue([makePlan({ price: 3500 })]);

      const result = await service.getQuoteForUser('user-1');

      expect(result.subscriptionSavingsMessage).toContain('save up to');
      expect(result.subscriptionSavingsMessage).toContain('3,500'); // locale formatted
    });

    it('should return null when subscription price is 0', async () => {
      subRepo.findOne.mockResolvedValue(null);
      planRepo.find.mockResolvedValue([makePlan({ price: 0 })]);

      const result = await service.getQuoteForUser('user-1');

      expect(result.subscriptionSavingsMessage).toBeNull();
    });

    it('should return null when subscription does not save money', async () => {
      subRepo.findOne.mockResolvedValue(null);
      planRepo.find.mockResolvedValue([makePlan({ price: 10000 })]);

      const result = await service.getQuoteForUser('user-1');

      expect(result.subscriptionSavingsMessage).toBeNull();
    });

    it('should return null when no active plans exist', async () => {
      subRepo.findOne.mockResolvedValue(null);
      planRepo.find.mockResolvedValue([]);

      const result = await service.getQuoteForUser('user-1');

      expect(result.subscriptionPrice).toBe(0);
      expect(result.subscriptionSavingsMessage).toBeNull();
    });
  });

  describe('resetWeeklyPickupsIfNeeded', () => {
    it('should reset pickups on new week', async () => {
      // Use a date from last week to trigger reset
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekMonday = getMondayOfWeek(lastWeek);
      const lastWeekMondayStr = lastWeekMonday.toISOString().split('T')[0];

      const subscription = makeSubscription({
        remainingPickupsThisWeek: 0,
        weekResetDate: lastWeekMondayStr,
      });
      subRepo.findOne.mockResolvedValue(subscription);
      planRepo.find.mockResolvedValue([makePlan()]);

      await service.getQuoteForUser('user-1');

      expect(subscription.remainingPickupsThisWeek).toBe(3);
      expect(subscription.weekResetDate).toBe(
        getMondayOfWeek(new Date()).toISOString().split('T')[0],
      );
      expect(subRepo.save).toHaveBeenCalledWith(subscription);
    });

    it('should not reset pickups if already on current week', async () => {
      const currentMondayStr = getMondayOfWeek(new Date()).toISOString().split('T')[0];
      const subscription = makeSubscription({
        remainingPickupsThisWeek: 3,
        weekResetDate: currentMondayStr,
      });
      subRepo.findOne.mockResolvedValue(subscription);
      planRepo.find.mockResolvedValue([makePlan()]);

      await service.getQuoteForUser('user-1');

      expect(subscription.remainingPickupsThisWeek).toBe(3);
      expect(subRepo.save).not.toHaveBeenCalled();
    });

    it('should use plan pickups per week if available', async () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekMonday = getMondayOfWeek(lastWeek);
      const lastWeekMondayStr = lastWeekMonday.toISOString().split('T')[0];

      const subscription = makeSubscription({
        remainingPickupsThisWeek: 0,
        weekResetDate: lastWeekMondayStr,
        plan: makePlan({ pickupsPerWeek: 5 }),
      });
      subRepo.findOne.mockResolvedValue(subscription);
      planRepo.find.mockResolvedValue([makePlan({ pickupsPerWeek: 5 })]);

      await service.getQuoteForUser('user-1');

      expect(subscription.remainingPickupsThisWeek).toBe(5);
    });

    it('should use default pickups per week if plan not available', async () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekMonday = getMondayOfWeek(lastWeek);
      const lastWeekMondayStr = lastWeekMonday.toISOString().split('T')[0];

      const subscription = makeSubscription({
        remainingPickupsThisWeek: 0,
        weekResetDate: lastWeekMondayStr,
        plan: null,
      });
      subRepo.findOne.mockResolvedValue(subscription);
      planRepo.find.mockResolvedValue([makePlan()]);

      await service.getQuoteForUser('user-1');

      expect(subscription.remainingPickupsThisWeek).toBe(2);
    });
  });
});
