import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsMessage, SmsResult } from './sms.provider';
import axios from 'axios';

/**
 * WhatsApp Business API Provider
 * Uses Meta's Cloud API for WhatsApp Business
 * 
 * Prerequisites:
 * - Meta Business Account
 * - WhatsApp Business Account
 * - Phone number registered with WhatsApp Business API
 * - Permanent access token
 * 
 * API Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
@Injectable()
export class WhatsAppProvider implements SmsProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  private readonly apiToken: string;
  private readonly phoneNumberId: string;
  private readonly businessAccountId: string;
  private readonly apiVersion: string;
  private readonly baseUrl = 'https://graph.facebook.com';
  private readonly otpTemplateName: string;
  private readonly otpTemplateLanguage: string;

  constructor(private readonly configService: ConfigService) {
    this.apiToken = this.configService.get('WHATSAPP_API_TOKEN', '');
    this.phoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID', '');
    this.businessAccountId = this.configService.get('WHATSAPP_BUSINESS_ACCOUNT_ID', '');
    this.apiVersion = this.configService.get('WHATSAPP_GRAPH_API_VERSION', 'v18.0');
    this.otpTemplateName = this.configService.get('WHATSAPP_OTP_TEMPLATE_NAME', 'otp_code');
    this.otpTemplateLanguage = this.configService.get('WHATSAPP_OTP_TEMPLATE_LANGUAGE', 'en_US');
  }

  async send(message: SmsMessage): Promise<SmsResult> {
    if (!message.phone) {
      return { success: false, error: 'No phone number provided' };
    }

    if (!this.apiToken || !this.phoneNumberId) {
      this.logger.error('WhatsApp API token or phone number ID not configured');
      return { success: false, error: 'WhatsApp not configured' };
    }

    try {
      const normalizedPhone = this.normalizePhone(message.phone);
      
      // Check if this is an OTP message
      const isOtpMessage = message.body.toLowerCase().includes('verification code') || 
                           message.body.toLowerCase().includes('otp');
      
      let payload: any;
      
      if (isOtpMessage) {
        // For OTP messages, use template (works even outside 24h window)
        const otpCode = this.extractOtpCode(message.body);
        payload = this.buildOtpTemplatePayload(normalizedPhone, otpCode);
        this.logger.log(`Sending WhatsApp OTP template "${this.otpTemplateName}" to ${normalizedPhone}`);
      } else {
        // For regular messages, try text (requires 24h window)
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: {
            body: message.body,
          },
        };
        this.logger.log(`Sending WhatsApp text message to ${normalizedPhone}`);
      }

      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
      
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.messages && response.data.messages[0]?.id) {
        return {
          success: true,
          messageId: response.data.messages[0].id,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from WhatsApp API',
      };
    } catch (error: any) {
      this.logger.error(`WhatsApp send failed: ${error.message}`);
      
      // Handle specific WhatsApp API errors
      if (error.response?.data?.error) {
        const waError = error.response.data.error;
        
        // Common error codes
        if (waError.code === 131026) {
          return {
            success: false,
            error: 'User has not opted in or 24-hour session expired. Template message required.',
          };
        }
        
        if (waError.code === 132001) {
          return {
            success: false,
            error: 'Phone number not registered with WhatsApp Business API',
          };
        }

        return {
          success: false,
          error: `WhatsApp API Error: ${waError.message || waError.type}`,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send a template message (required for first contact or outside 24h window)
   * Template must be pre-approved by Meta
   */
  async sendTemplate(
    phone: string,
    templateName: string,
    languageCode: string = 'en_US',
    components?: any[],
  ): Promise<SmsResult> {
    if (!this.apiToken || !this.phoneNumberId) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    try {
      const normalizedPhone = this.normalizePhone(phone);

      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      };

      if (components) {
        payload.template.components = components;
      }

      this.logger.log(`Sending WhatsApp template "${templateName}" to ${normalizedPhone}`);

      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
      
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.messages && response.data.messages[0]?.id) {
        return {
          success: true,
          messageId: response.data.messages[0].id,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from WhatsApp API',
      };
    } catch (error: any) {
      this.logger.error(`WhatsApp template send failed: ${error.message}`);
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: `WhatsApp API Error: ${error.response.data.error.message || error.response.data.error.type}`,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if a phone number is registered with WhatsApp
   */
  async checkPhoneNumber(phone: string): Promise<{ exists: boolean; waId?: string }> {
    if (!this.apiToken || !this.businessAccountId) {
      return { exists: false };
    }

    try {
      const normalizedPhone = this.normalizePhone(phone);
      
      const url = `${this.baseUrl}/${this.apiVersion}/${this.businessAccountId}/phone_numbers`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
        params: {
          filter: normalizedPhone,
        },
      });

      const numbers = response.data.data || [];
      const found = numbers.find((n: any) => n.display_phone_number === normalizedPhone);

      return {
        exists: !!found,
        waId: found?.id,
      };
    } catch (error) {
      this.logger.error(`WhatsApp check phone failed: ${error}`);
      return { exists: false };
    }
  }

  /**
   * Extract OTP code from message body
   * Assumes format: "Your verification code is: 123456."
   */
  private extractOtpCode(messageBody: string): string {
    // Look for 6-digit number
    const match = messageBody.match(/(\d{6})/);
    return match ? match[1] : '';
  }

  /**
   * Build OTP template payload for WhatsApp
   * Template must be pre-approved by Meta
   */
  private buildOtpTemplatePayload(phone: string, otpCode: string): any {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: this.otpTemplateName,
        language: {
          code: this.otpTemplateLanguage,
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: otpCode,
              },
            ],
          },
        ],
      },
    };
  }

  /**
   * Normalize phone number for WhatsApp
   * WhatsApp requires international format without + prefix
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If no country code, add +237 for Cameroon
    if (cleaned.length <= 9) {
      cleaned = '237' + cleaned;
    }

    return cleaned;
  }
}
