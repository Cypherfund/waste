import { Injectable, Logger } from '@nestjs/common';

export interface SmsMessage {
  phone: string;
  body: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<SmsResult>;
}

export const SMS_PROVIDER = 'SMS_PROVIDER';

/**
 * Stub SMS provider for testing/fallback
 */
@Injectable()
export class StubSmsProvider implements SmsProvider {
  private readonly logger = new Logger(StubSmsProvider.name);

  async send(message: SmsMessage): Promise<SmsResult> {
    if (!message.phone) {
      return { success: false, error: 'No phone number provided' };
    }

    try {
      this.logger.log(`[STUB] SMS to ${message.phone}: "${message.body.slice(0, 50)}..."`);
      return { success: true, messageId: `sms-stub-${Date.now()}` };
    } catch (error) {
      this.logger.error(`SMS send failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
