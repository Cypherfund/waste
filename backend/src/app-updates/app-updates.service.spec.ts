import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppUpdatesService } from './app-updates.service';
import { AppVersion, AppPlatform, AppType, UpdateType } from './entities/app-version.entity';
import { FcmProvider } from '../notifications/providers/fcm.provider';
import { UsersService } from '../users/users.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

const makeVersion = (overrides: Partial<AppVersion> = {}): AppVersion => ({
  id: 1,
  platform: AppPlatform.ALL,
  appType: AppType.ALL,
  versionName: '1.2.0',
  buildNumber: 50,
  minSupportedBuild: 40,
  latestBuild: 50,
  updateType: UpdateType.OPTIONAL,
  title: 'Update Available',
  message: 'A new version is ready.',
  storeUrl: 'https://play.google.com/store/apps/details?id=com.test',
  releaseNotes: 'Bug fixes',
  isActive: true,
  publishedAt: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

describe('AppUpdatesService', () => {
  let service: AppUpdatesService;
  let repo: any;
  let fcmProvider: any;
  let usersService: any;
  let wsGateway: any;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    fcmProvider = {
      send: jest.fn().mockResolvedValue({ success: true }),
    };

    usersService = {
      findAllWithFcmToken: jest.fn().mockResolvedValue([]),
    };

    wsGateway = {
      broadcastAppUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppUpdatesService,
        { provide: getRepositoryToken(AppVersion), useValue: repo },
        { provide: FcmProvider, useValue: fcmProvider },
        { provide: UsersService, useValue: usersService },
        { provide: AppWebSocketGateway, useValue: wsGateway },
      ],
    }).compile();

    service = module.get<AppUpdatesService>(AppUpdatesService);
  });

  // ─── checkUpdate ──────────────────────────────────────────────

  describe('checkUpdate', () => {
    it('returns no update when no active record found', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.checkUpdate({
        platform: AppPlatform.ANDROID,
        appType: AppType.HOUSEHOLD,
        versionName: '1.0.0',
        buildNumber: 10,
      });

      expect(result.updateAvailable).toBe(false);
      expect(result.forceUpdate).toBe(false);
    });

    it('returns forceUpdate=true when buildNumber < minSupportedBuild', async () => {
      repo.find.mockResolvedValue([makeVersion({ minSupportedBuild: 40, latestBuild: 50 })]);

      const result = await service.checkUpdate({
        platform: AppPlatform.ANDROID,
        appType: AppType.HOUSEHOLD,
        versionName: '1.0.0',
        buildNumber: 35, // below min
      });

      expect(result.forceUpdate).toBe(true);
      expect(result.updateAvailable).toBe(true);
    });

    it('returns updateAvailable=true, forceUpdate=false when minSupportedBuild <= buildNumber < latestBuild', async () => {
      repo.find.mockResolvedValue([makeVersion({ minSupportedBuild: 40, latestBuild: 50 })]);

      const result = await service.checkUpdate({
        platform: AppPlatform.ANDROID,
        appType: AppType.HOUSEHOLD,
        versionName: '1.1.0',
        buildNumber: 45, // between min and latest
      });

      expect(result.updateAvailable).toBe(true);
      expect(result.forceUpdate).toBe(false);
    });

    it('returns updateAvailable=false when buildNumber == latestBuild', async () => {
      repo.find.mockResolvedValue([makeVersion({ minSupportedBuild: 40, latestBuild: 50 })]);

      const result = await service.checkUpdate({
        platform: AppPlatform.ANDROID,
        appType: AppType.HOUSEHOLD,
        versionName: '1.2.0',
        buildNumber: 50, // up to date
      });

      expect(result.updateAvailable).toBe(false);
      expect(result.forceUpdate).toBe(false);
    });

    it('returns correct metadata with update', async () => {
      const v = makeVersion({
        versionName: '2.0.0',
        latestBuild: 100,
        minSupportedBuild: 80,
        title: 'New release',
        message: 'Major update',
        storeUrl: 'https://store.example.com',
        releaseNotes: 'New feature',
      });
      repo.find.mockResolvedValue([v]);

      const result = await service.checkUpdate({
        platform: AppPlatform.ANDROID,
        appType: AppType.HOUSEHOLD,
        versionName: '1.9.0',
        buildNumber: 90,
      });

      expect(result.latestVersion).toBe('2.0.0');
      expect(result.latestBuild).toBe(100);
      expect(result.minSupportedBuild).toBe(80);
      expect(result.title).toBe('New release');
      expect(result.message).toBe('Major update');
      expect(result.storeUrl).toBe('https://store.example.com');
    });

    it('uses the first (highest-priority) record returned by the repository', async () => {
      // DB query returns records ordered by specificity; service uses [0].
      // Mock simulates DB returning the ANDROID-specific record first.
      const androidRecord = makeVersion({ id: 2, platform: AppPlatform.ANDROID, latestBuild: 60 });
      const allRecord = makeVersion({ id: 1, platform: AppPlatform.ALL, latestBuild: 50 });
      repo.find.mockResolvedValue([androidRecord, allRecord]);

      const result = await service.checkUpdate({
        platform: AppPlatform.ANDROID,
        appType: AppType.HOUSEHOLD,
        versionName: '1.0.0',
        buildNumber: 55,
      });

      // Service uses candidates[0] = androidRecord (latestBuild=60), 55 < 60 → updateAvailable
      expect(result.updateAvailable).toBe(true);
      expect(result.latestBuild).toBe(60);
    });
  });

  // ─── isVersionSupported ───────────────────────────────────────

  describe('isVersionSupported', () => {
    it('returns true when no active record exists (fail open)', async () => {
      repo.find.mockResolvedValue([]);

      const supported = await service.isVersionSupported(
        AppPlatform.ANDROID,
        AppType.HOUSEHOLD,
        10,
      );

      expect(supported).toBe(true);
    });

    it('returns false when buildNumber < minSupportedBuild', async () => {
      repo.find.mockResolvedValue([makeVersion({ minSupportedBuild: 40 })]);

      const supported = await service.isVersionSupported(
        AppPlatform.ANDROID,
        AppType.HOUSEHOLD,
        35,
      );

      expect(supported).toBe(false);
    });

    it('returns true when buildNumber >= minSupportedBuild', async () => {
      repo.find.mockResolvedValue([makeVersion({ minSupportedBuild: 40 })]);

      const supported = await service.isVersionSupported(
        AppPlatform.ANDROID,
        AppType.HOUSEHOLD,
        40,
      );

      expect(supported).toBe(true);
    });
  });

  // ─── sendUpdateNotification ───────────────────────────────────

  describe('sendUpdateNotification', () => {
    it('sends FCM to all users with tokens and broadcasts via WebSocket', async () => {
      const record = makeVersion({ id: 1 });
      repo.findOne.mockResolvedValue(record);
      usersService.findAllWithFcmToken.mockResolvedValue([
        { id: 'u1', fcmToken: 'token-1' },
        { id: 'u2', fcmToken: 'token-2' },
      ]);
      fcmProvider.send.mockResolvedValue({ success: true });

      const result = await service.sendUpdateNotification(1);

      expect(fcmProvider.send).toHaveBeenCalledTimes(2);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(wsGateway.broadcastAppUpdate).toHaveBeenCalledTimes(1);
      expect(wsGateway.broadcastAppUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          updateType: record.updateType,
          versionName: record.versionName,
          latestBuild: record.latestBuild,
          minSupportedBuild: record.minSupportedBuild,
        }),
      );
    });

    it('counts failed FCM sends correctly', async () => {
      repo.findOne.mockResolvedValue(makeVersion());
      usersService.findAllWithFcmToken.mockResolvedValue([
        { id: 'u1', fcmToken: 'token-1' },
        { id: 'u2', fcmToken: 'token-2' },
      ]);
      fcmProvider.send
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false });

      const result = await service.sendUpdateNotification(1);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      // WebSocket still broadcasts even if some FCM sends failed
      expect(wsGateway.broadcastAppUpdate).toHaveBeenCalledTimes(1);
    });

    it('still broadcasts via WebSocket when no FCM users exist', async () => {
      repo.findOne.mockResolvedValue(makeVersion());
      usersService.findAllWithFcmToken.mockResolvedValue([]);

      const result = await service.sendUpdateNotification(1);

      expect(fcmProvider.send).not.toHaveBeenCalled();
      expect(result.sent).toBe(0);
      expect(wsGateway.broadcastAppUpdate).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException for unknown id', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.sendUpdateNotification(999)).rejects.toThrow();
    });
  });
});
