import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { WalletService } from '../wallet/wallet.service';
import { CountriesService } from '../countries/countries.service';
import { PaymentService } from '../payments/payment.service';
import { SystemCleanupService } from './services/system-cleanup.service';
import { OtpService } from '../auth/otp.service';
import { AdminAuditService } from './services/admin-audit.service';
import { FeatureFlagService } from '../config/feature-flags';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserRole } from '../common/enums/role.enum';

describe('AdminController', () => {
  let controller: AdminController;
  let featureFlagService: {
    clearCache: jest.Mock;
  };

  beforeEach(async () => {
    featureFlagService = {
      clearCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: {},
        },
        {
          provide: WalletService,
          useValue: {},
        },
        {
          provide: CountriesService,
          useValue: {},
        },
        {
          provide: PaymentService,
          useValue: {},
        },
        {
          provide: SystemCleanupService,
          useValue: {},
        },
        {
          provide: OtpService,
          useValue: {},
        },
        {
          provide: AdminAuditService,
          useValue: {},
        },
        {
          provide: FeatureFlagService,
          useValue: featureFlagService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('purgeCache', () => {
    it('should call featureFlagService.clearCache with flagKey when provided', async () => {
      featureFlagService.clearCache.mockResolvedValue({ cleared: 1 });

      const result = await controller.purgeCache({ flagKey: 'test.flag' });

      expect(featureFlagService.clearCache).toHaveBeenCalledWith('test.flag');
      expect(result).toEqual({ cleared: 1 });
    });

    it('should call featureFlagService.clearCache without flagKey when not provided', async () => {
      featureFlagService.clearCache.mockResolvedValue({ cleared: 5 });

      const result = await controller.purgeCache({});

      expect(featureFlagService.clearCache).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ cleared: 5 });
    });

    it('should return the result from featureFlagService.clearCache', async () => {
      const mockResult = { cleared: 3 };
      featureFlagService.clearCache.mockResolvedValue(mockResult);

      const result = await controller.purgeCache({ flagKey: 'feature.payment_integration' });

      expect(result).toEqual(mockResult);
    });

    it('should propagate errors from featureFlagService.clearCache', async () => {
      const error = new Error('Redis connection error');
      featureFlagService.clearCache.mockRejectedValue(error);

      await expect(controller.purgeCache({})).rejects.toThrow(error);
    });
  });
});
