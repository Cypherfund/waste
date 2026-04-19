import { Injectable, Logger } from '@nestjs/common';

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class FcmProvider {
  private readonly logger = new Logger(FcmProvider.name);

  /**
   * Send a push notification via FCM.
   * Stubbed for now — replace with real firebase-admin SDK call in production.
   */
  async send(message: PushMessage): Promise<PushResult> {
    if (!message.token) {
      return { success: false, error: 'No FCM token provided' };
    }

    try {
      // TODO: Replace with real FCM call:
      // const response = await admin.messaging().send({ ... });
      this.logger.log(
        `[STUB] FCM push to token ${message.token.slice(0, 12)}...: "${message.title}"`,
      );

      return { success: true, messageId: `fcm-stub-${Date.now()}` };
    } catch (error) {
      this.logger.error(`FCM push failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
