import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.provider';
import { SmsProvider, SMS_PROVIDER } from '../notifications/providers/sms.provider';
import { SystemConfigService } from '../config/system-config.service';

export interface OtpResult {
  success: boolean;
  message?: string;
  error?: string;
  otp?: string; // Only returned in dev mode
  devMode?: boolean;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_SECONDS = 300; // 5 minutes
  private readonly OTP_LENGTH = 6;

  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    @Inject(SMS_PROVIDER)
    private readonly smsProvider: SmsProvider,
    private readonly configService: ConfigService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  /**
   * Generate and send OTP to phone number
   */
  async sendOtp(phone: string): Promise<OtpResult> {
    // Normalize phone number
    const normalizedPhone = this.normalizePhone(phone);

    // Check if OTP was recently sent (rate limiting)
    const existingKey = `otp:${normalizedPhone}`;
    const existingTtl = await this.redis.ttl(existingKey);
    
    if (existingTtl > 240) { // If less than 60 seconds passed since last send
      const waitSeconds = existingTtl - 240;
      return {
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new code`,
      };
    }

    // Generate 6-digit OTP
    const otp = this.generateOtp();

    // Store in Redis with expiry for verification
    await this.redis.setex(
      existingKey,
      this.OTP_EXPIRY_SECONDS,
      otp,
    );

    // Store for admin visibility (longer TTL: 24 hours)
    const adminKey = `admin:otp:${normalizedPhone}`;
    await this.redis.setex(
      adminKey,
      86400, // 24 hours
      otp,
    );

    // ALWAYS log to console for all providers (for support visibility)
    this.logger.log(`[OTP] Phone: ${normalizedPhone} | Code: ${otp} | Expires in 5 min`);

    // Send via SMS
    const message = `Your KmerTrash verification code is: ${otp}. Valid for 5 minutes.`;
    const smsResult = await this.smsProvider.send({
      phone: normalizedPhone,
      body: message,
    });

    if (!smsResult.success) {
      this.logger.error(`[OTP] Failed to send SMS to ${normalizedPhone}: ${smsResult.error}`);
    } else {
      this.logger.log(`[OTP] SMS sent successfully to ${normalizedPhone}`);
    }

    // Check if dev mode is enabled
    const isDevMode = this.configService.get('OTP_DEV_MODE', 'false') === 'true';
    // // Check if dev mode is enabled (only in non-production environments)
    // const isDevMode = await this.isDevModeEnabled();
    
    if (isDevMode) {
      this.logger.log(`[OTP-DEV] Dev mode enabled - returning OTP in response for ${normalizedPhone}`);
      return {
        success: true,
        message: 'Verification code sent successfully (Dev Mode)',
        otp,
        devMode: true,
      };
    }

    return {
      success: true,
      message: 'Verification code sent successfully',
    };
  }

  /**
   * Verify OTP for phone number
   */
  async verifyOtp(phone: string, code: string): Promise<OtpResult> {
    const normalizedPhone = this.normalizePhone(phone);
    const key = `otp:${normalizedPhone}`;

    // Get stored OTP
    const storedOtp = await this.redis.get(key);

    if (!storedOtp) {
      return {
        success: false,
        error: 'Verification code has expired. Please request a new one.',
      };
    }

    // Compare OTPs
    if (storedOtp !== code.trim()) {
      return {
        success: false,
        error: 'Invalid verification code. Please try again.',
      };
    }

    // Delete OTP after successful verification
    await this.redis.del(key);

    this.logger.log(`OTP verified for ${normalizedPhone}`);

    return {
      success: true,
      message: 'Verification successful',
    };
  }

  /**
   * Check if OTP dev mode is enabled
   * Requires:
   * 1. OTP_DEV_MODE env variable = 'true'
   * 2. NODE_ENV !== 'production'
   * 3. System config otp.dev_mode_display_enabled = true
   */
  private async isDevModeEnabled(): Promise<boolean> {
    // Safety check: never enable in production
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    if (nodeEnv === 'production') {
      return false;
    }

    // Check env variable
    const envDevMode = this.configService.get('OTP_DEV_MODE', 'false') === 'true';
    if (!envDevMode) {
      return false;
    }

    // Check system config (requires explicit enable)
    const configDevMode = await this.systemConfigService.getBoolean('otp.dev_mode_display_enabled', false);
    
    return configDevMode;
  }

  /**
   * Get recent OTP for a phone number (for admin support)
   * Returns the OTP if it exists and hasn't expired
   * NOTE: This is only for admin support tools, not for exposing to end users
   */
  async getRecentOtp(phone: string): Promise<{ phone: string; otp: string | null; ttl: number }> {
    const normalizedPhone = this.normalizePhone(phone);
    const adminKey = `admin:otp:${normalizedPhone}`;
    
    const otp = await this.redis.get(adminKey);
    const ttl = await this.redis.ttl(adminKey);
    
    return {
      phone: normalizedPhone,
      otp,
      ttl,
    };
  }

  /**
   * Generate 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Normalize phone number for storage
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with 00, replace with +
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.substring(2);
    }

    // If no + prefix, add +237 for Cameroon (default)
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('237')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+237' + cleaned;
      }
    }

    return cleaned;
  }
}
