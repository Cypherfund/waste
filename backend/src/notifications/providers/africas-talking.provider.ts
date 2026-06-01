import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsMessage, SmsResult } from './sms.provider';
import axios from 'axios';

/**
 * Africa's Talking SMS Provider for Cameroon
 * API: https://api.africastalking.com/version1/messaging
 */
@Injectable()
export class AfricasTalkingProvider implements SmsProvider {
  private readonly logger = new Logger(AfricasTalkingProvider.name);
  private readonly apiKey: string;
  private readonly username: string;
  private readonly senderId: string;
  private readonly apiUrl = 'https://api.africastalking.com/version1/messaging';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get('AT_API_KEY', '');
    this.username = this.configService.get('AT_USERNAME', '');
    this.senderId = this.configService.get('AT_SENDER_ID', 'KmerTrash');
  }

  async send(message: SmsMessage): Promise<SmsResult> {
    if (!message.phone) {
      return { success: false, error: 'No phone number provided' };
    }

    if (!this.apiKey || !this.username) {
      this.logger.warn('Africa\'s Talking credentials not configured, falling back to stub');
      return { success: false, error: 'Africa\'s Talking credentials not configured' };
    }

    try {
      const normalizedPhone = this.normalizePhone(message.phone);
      const payload = new URLSearchParams();
      payload.append('username', this.username);
      payload.append('to', normalizedPhone);
      payload.append('message', message.body);
      if (this.senderId) {
        payload.append('from', this.senderId);
      }

      this.logger.log(`Sending SMS via Africa's Talking to ${normalizedPhone}`);

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apiKey': this.apiKey,
        },
      });

      const data = response.data;
      if (data.SMSMessageData && data.SMSMessageData.Recipients) {
        const recipient = data.SMSMessageData.Recipients[0];
        if (recipient.status === 'Success') {
          return {
            success: true,
            messageId: recipient.messageId || `at-${Date.now()}`,
          };
        } else {
          return {
            success: false,
            error: recipient.status || 'Failed to send SMS',
          };
        }
      } else {
        return {
          success: false,
          error: 'Invalid response from Africa\'s Talking',
        };
      }
    } catch (error) {
      this.logger.error(`Africa's Talking SMS send failed: ${error.message}`);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Normalize phone number for Africa's Talking
   * Ensures +237 prefix for Cameroon numbers
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with 00, replace with +
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
    }

    // If no + prefix, add +237 for Cameroon
    if (!cleaned.startsWith('+')) {
      // If starts with 237, add +
      if (cleaned.startsWith('237')) {
        cleaned = '+' + cleaned;
      } else {
        // Assume Cameroon number, add +237
        cleaned = '+237' + cleaned;
      }
    }

    return cleaned;
  }
}
