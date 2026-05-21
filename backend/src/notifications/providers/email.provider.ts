import { Injectable, Logger } from '@nestjs/common';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);

  /**
   * Send an email
   * NOTE: This is currently a stub. Implement with your email service provider
   * (SendGrid, AWS SES, Mailgun, etc.) for production use.
   */
  async send(message: EmailMessage): Promise<EmailResult> {
    this.logger.log(`[STUB] Sending email to ${message.to}: ${message.subject}`);
    
    // TODO: Implement with actual email provider
    // Example with SendGrid:
    // await this.sendgrid.send({
    //   to: message.to,
    //   from: 'noreply@kmertrash.com',
    //   subject: message.subject,
    //   text: message.body,
    // });

    // For now, always return success (logging only)
    return { success: true };
  }
}
