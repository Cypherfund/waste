import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsMessage, SmsResult } from './sms.provider';
import axios from 'axios';

/**
 * Termii SMS Provider for Cameroon
 * API: https://sms.termii.com/api/sms/send
 */
@Injectable()
export class TermiiProvider implements SmsProvider {
  private readonly logger = new Logger(TermiiProvider.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly apiUrl = 'https://sms.termii.com/api/sms/send';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get('TERMII_API_KEY', '');
    this.senderId = this.configService.get('TERMII_SENDER_ID', 'KmerTrash');
  }

  async send(message: SmsMessage): Promise<SmsResult> {
    if (!message.phone) {
      return { success: false, error: 'No phone number provided' };
    }

    if (!this.apiKey) {
      this.logger.warn('Termii API key not configured, falling back to stub');
      return { success: false, error: 'Termii API key not configured' };
    }

    try {
      const normalizedPhone = this.normalizePhone(message.phone);
      const payload = {
        to: normalizedPhone,
        from: this.senderId,
        sms: message.body,
        type: 'plain',
        channel: 'dnd',
        api_key: this.apiKey,
      };

      this.logger.log(`Sending SMS via Termii to ${normalizedPhone}`);

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.message === 'Successfully Sent') {
        return {
          success: true,
          messageId: response.data.message_id || `termii-${Date.now()}`,
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Failed to send SMS',
        };
      }
    } catch (error) {
      this.logger.error(`Termii SMS send failed: ${error.message}`);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Normalize phone number for Termii
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
