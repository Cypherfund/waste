import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketerNotification, NotificationType, MarketerProfile } from '../entities';

@Injectable()
export class MarketerNotificationService {
  private readonly logger = new Logger(MarketerNotificationService.name);

  constructor(
    @InjectRepository(MarketerNotification)
    private readonly notificationRepo: Repository<MarketerNotification>,
    @InjectRepository(MarketerProfile)
    private readonly profileRepo: Repository<MarketerProfile>,
  ) {}

  async sendNotification(
    marketerProfileId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<MarketerNotification> {
    // Save to database
    const notification = await this.notificationRepo.save({
      marketerProfileId,
      type,
      title,
      message,
      data: data || null,
      isRead: false,
    });

    // Try to send push notification if FCM token available
    try {
      await this.sendPushNotification(marketerProfileId, title, message, { type, ...data });
    } catch (error) {
      this.logger.warn('Failed to send push notification:', error);
      // Don't fail - in-app notification is saved
    }

    return notification;
  }

  private async sendPushNotification(
    marketerProfileId: string,
    title: string,
    body: string,
    data: Record<string, any>,
  ): Promise<void> {
    // Get marketer profile with user to find FCM token
    const profile = await this.profileRepo.findOne({
      where: { id: marketerProfileId },
      relations: ['user'],
    });

    if (!profile?.user?.fcmToken) {
      return; // No FCM token, skip push
    }

    const fcmToken = profile.user.fcmToken;
    const serverKey = process.env.FCM_SERVER_KEY;

    if (!serverKey) {
      this.logger.warn('FCM server key not configured');
      return;
    }

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${serverKey}`,
        },
        body: JSON.stringify({
          to: fcmToken,
          notification: {
            title,
            body,
            sound: 'default',
          },
          data,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`FCM error: ${error}`);
      }

      this.logger.log(`Push notification sent to marketer ${marketerProfileId}`);
    } catch (error) {
      this.logger.error('Failed to send FCM notification:', error);
      throw error;
    }
  }

  async getNotifications(marketerProfileId: string, unreadOnly?: boolean): Promise<MarketerNotification[]> {
    const where: any = { marketerProfileId };
    if (unreadOnly) {
      where.isRead = false;
    }
    
    return this.notificationRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: string, marketerProfileId: string): Promise<void> {
    await this.notificationRepo.update(
      { id: notificationId, marketerProfileId },
      { isRead: true },
    );
  }

  async markAllAsRead(marketerProfileId: string): Promise<void> {
    await this.notificationRepo.update(
      { marketerProfileId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(marketerProfileId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { marketerProfileId, isRead: false },
    });
  }
}
