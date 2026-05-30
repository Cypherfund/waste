import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion, AppPlatform, AppType, UpdateType } from './entities/app-version.entity';
import { CheckUpdateDto } from './dto/check-update.dto';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { FcmProvider } from '../notifications/providers/fcm.provider';
import { UsersService } from '../users/users.service';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class AppUpdatesService {
  private readonly logger = new Logger(AppUpdatesService.name);

  constructor(
    @InjectRepository(AppVersion)
    private readonly repo: Repository<AppVersion>,
    private readonly fcmProvider: FcmProvider,
    private readonly usersService: UsersService,
    private readonly wsGateway: AppWebSocketGateway,
  ) {}

  // ── PUBLIC: check update ──────────────────────────────────────────

  async checkUpdate(dto: CheckUpdateDto): Promise<{
    updateAvailable: boolean;
    forceUpdate: boolean;
    latestVersion: string | null;
    latestBuild: number | null;
    minSupportedBuild: number | null;
    title: string | null;
    message: string | null;
    storeUrl: string | null;
    releaseNotes: string[] | null;
  }> {
    // Best-match: exact platform+appType first, then broader ALL variants
    const candidates = await this.repo.find({
      where: [
        { platform: dto.platform as AppPlatform, appType: dto.appType as AppType, isActive: true },
        { platform: dto.platform as AppPlatform, appType: AppType.ALL, isActive: true },
        { platform: AppPlatform.ALL, appType: dto.appType as AppType, isActive: true },
        { platform: AppPlatform.ALL, appType: AppType.ALL, isActive: true },
      ],
      order: { publishedAt: 'DESC' },
    });

    const record = candidates[0] ?? null;

    if (!record) {
      return {
        updateAvailable: false,
        forceUpdate: false,
        latestVersion: null,
        latestBuild: null,
        minSupportedBuild: null,
        title: null,
        message: null,
        storeUrl: null,
        releaseNotes: null,
      };
    }

    const forceUpdate = dto.buildNumber < record.minSupportedBuild;
    const updateAvailable = forceUpdate || dto.buildNumber < record.latestBuild;

    const releaseNotes = record.releaseNotes
      ? record.releaseNotes
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      : null;

    return {
      updateAvailable,
      forceUpdate,
      latestVersion: record.versionName,
      latestBuild: record.latestBuild,
      minSupportedBuild: record.minSupportedBuild,
      title: updateAvailable ? record.title : null,
      message: updateAvailable ? record.message : null,
      storeUrl: record.storeUrl,
      releaseNotes: updateAvailable ? releaseNotes : null,
    };
  }

  // ── ADMIN CRUD ────────────────────────────────────────────────

  async findAll(): Promise<AppVersion[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<AppVersion> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`App version ${id} not found`);
    return record;
  }

  async create(dto: CreateAppVersionDto): Promise<AppVersion> {
    const record = this.repo.create({ ...dto });
    return this.repo.save(record);
  }

  async update(id: number, dto: Partial<CreateAppVersionDto>): Promise<AppVersion> {
    const record = await this.findOne(id);
    Object.assign(record, dto);
    return this.repo.save(record);
  }

  async publish(id: number): Promise<AppVersion> {
    const record = await this.findOne(id);
    // Deactivate other active records for same platform+appType
    await this.repo
      .createQueryBuilder()
      .update(AppVersion)
      .set({ isActive: false })
      .where('platform = :platform', { platform: record.platform })
      .andWhere('app_type = :appType', { appType: record.appType })
      .andWhere('id != :id', { id })
      .execute();

    record.isActive = true;
    record.publishedAt = new Date();
    return this.repo.save(record);
  }

  async deactivate(id: number): Promise<AppVersion> {
    const record = await this.findOne(id);
    record.isActive = false;
    return this.repo.save(record);
  }

  // ── SEND REALTIME NOTIFICATION ────────────────────────────────

  async sendUpdateNotification(id: number): Promise<{ sent: number; failed: number }> {
    const record = await this.findOne(id);
    const isForce = record.updateType === UpdateType.FORCE;

    const title = isForce ? 'Update Required' : 'Update Available';
    const body = record.message;

    // Get all users with FCM tokens
    const users = await this.usersService.findAllWithFcmToken();

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      if (!user.fcmToken) continue;
      const result = await this.fcmProvider.send({
        token: user.fcmToken,
        title,
        body,
        data: {
          type: 'APP_UPDATE_AVAILABLE',
          updateType: record.updateType,
          versionName: record.versionName,
          buildNumber: String(record.latestBuild),
          storeUrl: record.storeUrl ?? '',
        },
      });
      result.success ? sent++ : failed++;
    }

    this.logger.log(`Update notification sent: ${sent} ok, ${failed} failed`);

    // Also broadcast over WebSocket to all connected clients
    this.wsGateway.broadcastAppUpdate({
      updateType: record.updateType,
      versionName: record.versionName,
      latestBuild: record.latestBuild,
      minSupportedBuild: record.minSupportedBuild,
      title: record.title,
      message: record.message,
      storeUrl: record.storeUrl,
    });

    return { sent, failed };
  }

  // ── HEADER ENFORCEMENT ────────────────────────────────────────

  async isVersionSupported(
    platform: AppPlatform,
    appType: AppType,
    buildNumber: number,
  ): Promise<boolean> {
    const result = await this.checkUpdate({
      platform,
      appType,
      versionName: '',
      buildNumber,
    });
    return !result.forceUpdate;
  }
}
