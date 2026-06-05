import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';

export enum BusinessEventType {
  JOB_CREATION_FAILED = 'JOB_CREATION_FAILED',
  PAYMENT_INITIATION_FAILED = 'PAYMENT_INITIATION_FAILED',
  PAYMENT_CALLBACK_FAILED = 'PAYMENT_CALLBACK_FAILED',
  PAYMENT_VERIFICATION_FAILED = 'PAYMENT_VERIFICATION_FAILED',
  WALLET_TOPUP_FAILED = 'WALLET_TOPUP_FAILED',
  WALLET_DEBIT_FAILED = 'WALLET_DEBIT_FAILED',
  WALLET_CREDIT_FAILED = 'WALLET_CREDIT_FAILED',
  SUBSCRIPTION_ACTIVATION_FAILED = 'SUBSCRIPTION_ACTIVATION_FAILED',
  DOWNSTREAM_PROCESSING_FAILED = 'DOWNSTREAM_PROCESSING_FAILED',
  COLLECTOR_FLOAT_DEDUCTION_FAILED = 'COLLECTOR_FLOAT_DEDUCTION_FAILED',
  COMMISSION_CALCULATION_FAILED = 'COMMISSION_CALCULATION_FAILED',
  PAYOUT_PROCESSING_FAILED = 'PAYOUT_PROCESSING_FAILED',
  NOTIFICATION_DISPATCH_FAILED = 'NOTIFICATION_DISPATCH_FAILED',
  RECONCILIATION_FAILED = 'RECONCILIATION_FAILED',
}

export interface BusinessLogContext {
  userId?: string;
  role?: string;
  jobId?: string;
  transactionId?: string;
  subscriptionId?: string;
  amount?: number;
  provider?: string;
  requestId?: string;
  errorMessage?: string;
  [key: string]: any;
}

@Injectable()
export class BusinessLoggerService {
  private readonly logger = new Logger('BusinessLogger');

  logFailure(eventType: BusinessEventType, context: BusinessLogContext): void {
    const logData = {
      eventType,
      timestamp: new Date().toISOString(),
      ...context,
    };

    this.logger.error(JSON.stringify(logData));
  }

  logWarning(eventType: BusinessEventType, context: BusinessLogContext): void {
    const logData = {
      eventType,
      timestamp: new Date().toISOString(),
      ...context,
    };

    this.logger.warn(JSON.stringify(logData));
  }

  logInfo(eventType: BusinessEventType, context: BusinessLogContext): void {
    const logData = {
      eventType,
      timestamp: new Date().toISOString(),
      ...context,
    };

    this.logger.log(JSON.stringify(logData));
  }

  /**
   * Extract request context from Express request
   */
  extractRequestContext(req: Request): Partial<BusinessLogContext> {
    const requestId = req.headers['x-request-id'] as string || req.headers['x-correlation-id'] as string;
    const user = (req as any).user;

    return {
      requestId,
      userId: user?.userId || user?.sub,
      role: user?.role,
    };
  }
}
