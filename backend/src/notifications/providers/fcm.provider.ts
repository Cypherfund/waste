import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';

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
export class FcmProvider implements OnModuleInit {
  private readonly logger = new Logger(FcmProvider.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    // Avoid re-initialising if another module already did so
    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      return;
    }

    try {
      const serviceAccountJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
      const serviceAccountPath = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');

      let credential: admin.credential.Credential | null = null;

      if (serviceAccountJson) {
        const parsed = JSON.parse(serviceAccountJson);
        credential = admin.credential.cert(parsed);
      } else if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
        credential = admin.credential.cert(serviceAccountPath);
      }

      if (!credential) {
        this.logger.warn(
          'FCM not configured: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH. Push notifications will be logged only.',
        );
        return;
      }

      this.app = admin.initializeApp({ credential });
      this.logger.log('Firebase Admin SDK initialised');
    } catch (err) {
      this.logger.error(`Firebase Admin SDK init failed: ${err.message}`);
    }
  }

  async send(message: PushMessage): Promise<PushResult> {
    if (!message.token) {
      return { success: false, error: 'No FCM token provided' };
    }

    if (!this.app) {
      this.logger.warn(
        `[FCM STUB] Push to ${message.token.slice(0, 12)}...: "${message.title}"`,
      );
      return { success: true, messageId: `stub-${Date.now()}` };
    }

    try {
      const messageId = await admin.messaging(this.app).send({
        token: message.token,
        notification: {
          title: message.title,
          body: message.body,
        },
        data: message.data ?? {},
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: { sound: 'default', badge: 1 },
          },
        },
      });

      return { success: true, messageId };
    } catch (error) {
      this.logger.error(`FCM push failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
