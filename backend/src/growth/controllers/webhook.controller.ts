import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LeadService, SMSService } from '../services';
import { SMSSStatus } from '../entities';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly leadService: LeadService,
    private readonly smsService: SMSService,
  ) {}

  @Post('sms/delivery')
  async handleSMSDelivery(
    @Body() body: any,
    @Headers('x-sms-provider') provider: string,
  ) {
    this.logger.log(`SMS delivery webhook from ${provider}: ${JSON.stringify(body)}`);

    try {
      // Africa's Talking format
      if (provider === 'africastalking' || body.SMSMessageData) {
        const recipients = body.SMSMessageData?.Recipients || [];
        for (const recipient of recipients) {
          const status = this.mapATStatus(recipient.status);
          await this.leadService.handleSMSDeliveryUpdate(recipient.messageId, status);
        }
      }
      
      // Twilio format
      else if (provider === 'twilio' || body.MessageSid) {
        const status = this.mapTwilioStatus(body.MessageStatus);
        await this.leadService.handleSMSDeliveryUpdate(body.MessageSid, status);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Error processing SMS delivery webhook:', error);
      return { received: false, error: error.message };
    }
  }

  @Post('sms/incoming')
  async handleIncomingSMS(
    @Body() body: any,
    @Headers('x-sms-provider') provider: string,
  ) {
    this.logger.log(`Incoming SMS webhook from ${provider}: ${JSON.stringify(body)}`);

    try {
      let phone: string | undefined;
      let message: string | undefined;

      // Africa's Talking format
      if (provider === 'africastalking' || body.from) {
        phone = body.from;
        message = body.text;
      }
      
      // Twilio format
      else if (provider === 'twilio' || body.From) {
        phone = body.From;
        message = body.Body;
      }

      if (phone && message) {
        await this.leadService.handleIncomingSMS(phone, message);
      }

      return { received: true };
    } catch (error) {
      this.logger.error('Error processing incoming SMS webhook:', error);
      return { received: false, error: error.message };
    }
  }

  private mapATStatus(status: string): SMSSStatus {
    switch (status?.toLowerCase()) {
      case 'sent':
        return SMSSStatus.SENT;
      case 'delivered':
        return SMSSStatus.DELIVERED;
      case 'failed':
      case 'rejected':
        return SMSSStatus.FAILED;
      default:
        return SMSSStatus.PENDING;
    }
  }

  private mapTwilioStatus(status: string): SMSSStatus {
    switch (status?.toLowerCase()) {
      case 'sent':
        return SMSSStatus.SENT;
      case 'delivered':
        return SMSSStatus.DELIVERED;
      case 'failed':
      case 'undelivered':
        return SMSSStatus.FAILED;
      default:
        return SMSSStatus.PENDING;
    }
  }
}
