import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SMSSendResult {
  messageId: string;
  status: string;
}

@Injectable()
export class SMSService {
  private readonly logger = new Logger(SMSService.name);
  private readonly provider: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('SMS_PROVIDER', 'africastalking');
  }

  async send(to: string, message: string): Promise<SMSSendResult> {
    // Normalize phone number
    const normalizedPhone = this.normalizePhone(to);

    switch (this.provider) {
      case 'africastalking':
        return this.sendViaAfricasTalking(normalizedPhone, message);
      case 'twilio':
        return this.sendViaTwilio(normalizedPhone, message);
      default:
        // For development, log instead of sending
        this.logger.log(`[DEV SMS] To: ${normalizedPhone}, Message: ${message}`);
        return { messageId: `dev-${Date.now()}`, status: 'sent' };
    }
  }

  private normalizePhone(phone: string): string {
    // Remove spaces and ensure + prefix
    let normalized = phone.replace(/\s/g, '');
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }
    return normalized;
  }

  private async sendViaAfricasTalking(to: string, message: string): Promise<SMSSendResult> {
    const username = this.configService.get<string>('AT_USERNAME');
    const apiKey = this.configService.get<string>('AT_API_KEY');
    const sender = this.configService.get<string>('AT_SENDER_ID', 'KmerTrash');

    if (!username || !apiKey) {
      throw new Error('Africa\'s Talking credentials not configured');
    }

    try {
      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'apiKey': apiKey,
        },
        body: new URLSearchParams({
          username,
          to,
          message,
          from: sender,
        }),
      });

      const data = await response.json();

      if (data.SMSMessageData && data.SMSMessageData.Recipients.length > 0) {
        const recipient = data.SMSMessageData.Recipients[0];
        return {
          messageId: recipient.messageId,
          status: recipient.status,
        };
      }

      throw new Error('Failed to send SMS: ' + JSON.stringify(data));
    } catch (error) {
      this.logger.error('Africa\'s Talking SMS failed:', error);
      throw error;
    }
  }

  private async sendViaTwilio(to: string, message: string): Promise<SMSSendResult> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const from = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !from) {
      throw new Error('Twilio credentials not configured');
    }

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          },
          body: new URLSearchParams({
            To: to,
            From: from,
            Body: message,
          }),
        },
      );

      const data = await response.json();

      if (data.sid) {
        return {
          messageId: data.sid,
          status: data.status,
        };
      }

      throw new Error('Failed to send SMS: ' + JSON.stringify(data));
    } catch (error) {
      this.logger.error('Twilio SMS failed:', error);
      throw error;
    }
  }
}
