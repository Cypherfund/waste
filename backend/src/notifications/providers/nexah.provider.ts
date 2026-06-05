import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsMessage, SmsResult } from './sms.provider';
import axios from 'axios';

/**
 * NEXAH SMS Provider for Cameroon
 * API: https://smsvas.com/bulk/public/index.php/api/v1/sendsms
 */
@Injectable()
export class NexahProvider implements SmsProvider {
  private readonly logger = new Logger(NexahProvider.name);
  private readonly user: string;
  private readonly password: string;
  private readonly senderId: string;
  private readonly apiUrl = 'https://smsvas.com/bulk/public/index.php/api/v1/sendsms';

  constructor(private readonly configService: ConfigService) {
    this.user = this.configService.get('NEXAH_USER', '');
    this.password = this.configService.get('NEXAH_PASSWORD', '');
    this.senderId = this.configService.get('NEXAH_SENDER_ID', 'KmerTrash');
  }

  async send(message: SmsMessage): Promise<SmsResult> {
    if (!message.phone) {
      return { success: false, error: 'No phone number provided' };
    }

    if (!this.user || !this.password) {
      this.logger.warn('NEXAH credentials not configured, falling back to stub');
      return { success: false, error: 'NEXAH credentials not configured' };
    }

    try {
      const normalizedPhone = this.normalizePhone(message.phone);
      const payload = {
        user: this.user,
        password: this.password,
        senderid: this.senderId,
        sms: message.body,
        mobiles: normalizedPhone,
      };

      this.logger.log(`Sending SMS via NEXAH to ${normalizedPhone}`);

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const data = response.data;

      // Check for successful response (responsecode: 1 = success)
      if (data.responsecode === 1 || data.responsedescription?.toLowerCase() === 'success') {
        // Extract message ID from the first SMS entry
        const smsEntry = data.sms?.[0];
        return {
          success: true,
          messageId: smsEntry?.messageid || `nexah-${Date.now()}`,
        };
      } else {
        // Map error codes to readable messages
        const errorCode = data.sms?.[0]?.errorcode || data.Errorcode;
        const errorMessage = this.mapErrorCode(errorCode) || data.responsemessage || data.Errordescription || 'Failed to send SMS';
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      this.logger.error(`NEXAH SMS send failed: ${error.message}`);
      return {
        success: false,
        error: error.response?.data?.responsemessage || error.message,
      };
    }
  }

  /**
   * Map NEXAH error codes to readable messages
   */
  private mapErrorCode(code: number | string): string | undefined {
    const errorMap: Record<string, string> = {
      '-10019': 'Inactive User',
      '-10003': 'Invalid Mobile Number',
      '-10026': 'Client SMS ID Max Limit Exceed',
      '-10008': 'Balance not enough',
    };
    return errorMap[String(code)];
  }

  /**
   * Normalize phone number for NEXAH
   * Ensures 237 prefix (without +) for Cameroon numbers
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Remove leading 00 if present
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    }

    // Remove leading + if somehow present (shouldn't be after \D removal, but just in case)
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // If no 237 prefix, add it
    if (!cleaned.startsWith('237')) {
      cleaned = '237' + cleaned;
    }

    return cleaned;
  }
}
