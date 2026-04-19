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

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  /**
   * Send an SMS message.
   * Stubbed for now — replace with real SMS gateway (e.g. Twilio, AfricasTalking) in production.
   */
  async send(message: SmsMessage): Promise<SmsResult> {
    if (!message.phone) {
      return { success: false, error: 'No phone number provided' };
    }

    try {
      // TODO: Replace with real SMS gateway call
      this.logger.log(
        `[STUB] SMS to ${message.phone}: "${message.body.slice(0, 50)}..."`,
      );

      return { success: true, messageId: `sms-stub-${Date.now()}` };
    } catch (error) {
      this.logger.error(`SMS send failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
