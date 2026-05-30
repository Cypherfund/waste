import { NotificationType } from '../../common/enums/notification-type.enum';

export interface NotificationTemplate {
  title: string;
  body: string;
}

export type TemplateContext = {
  jobId?: string;
  collectorName?: string;
  householdName?: string;
  reason?: string;
  attempts?: number;
  [key: string]: any;
};

type TemplateFactory = (ctx: TemplateContext) => NotificationTemplate;

const templates: Record<string, TemplateFactory> = {
  [NotificationType.JOB_ASSIGNED]: (ctx) => ({
    title: 'New Job Assigned',
    body: `You have been assigned a new pickup job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''}.`,
  }),

  [NotificationType.JOB_ACCEPTED]: (ctx) => ({
    title: 'Job Accepted',
    body: `Your collector has accepted the pickup job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''}.`,
  }),

  [NotificationType.JOB_REJECTED]: (ctx) => ({
    title: 'Job Reassigning',
    body: `A collector declined your job${ctx.reason ? `: ${ctx.reason}` : ''}. We are finding another collector.`,
  }),

  [NotificationType.JOB_STARTED]: (ctx) => ({
    title: 'Pickup Started',
    body: `Your collector is on the way for job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''}.`,
  }),

  [NotificationType.JOB_COMPLETED]: (ctx) => ({
    title: 'Pickup Completed',
    body: `Job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''} has been completed. Please review and validate.`,
  }),

  [NotificationType.PROOF_VALIDATED]: (ctx) => ({
    title: 'Job Validated',
    body: `Job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''} has been validated by the household.`,
  }),

  [NotificationType.JOB_CANCELLED]: (ctx) => ({
    title: 'Job Cancelled',
    body: `Job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''} has been cancelled${ctx.reason ? `: ${ctx.reason}` : ''}.`,
  }),

  [NotificationType.ASSIGNMENT_TIMEOUT]: (ctx) => ({
    title: 'Assignment Expired',
    body: `You did not accept job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''} in time. It has been reassigned.`,
  }),

  [NotificationType.ASSIGNMENT_ESCALATED]: (ctx) => ({
    title: 'Job Needs Attention',
    body: `Job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''} could not be auto-assigned after ${ctx.attempts ?? 'multiple'} attempts. Manual assignment required.`,
  }),

  [NotificationType.PROOF_UPLOADED]: (ctx) => ({
    title: 'Proof Uploaded',
    body: `Your collector has uploaded proof for job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''}. Please review and validate.`,
  }),

  [NotificationType.PROOF_AUTO_VALIDATED]: (ctx) => ({
    title: 'Proof Auto-Validated',
    body: `Proof for job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''} has been automatically validated after 24 hours.`,
  }),

  [NotificationType.JOB_RATED]: (ctx) => ({
    title: 'New Rating Received',
    body: `You received a rating for job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''}.`,
  }),

  [NotificationType.EARNINGS_CONFIRMED]: (ctx) => ({
    title: 'Earnings Confirmed',
    body: `Your earnings for job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''} have been confirmed.`,
  }),

  [NotificationType.FRAUD_FLAG]: (ctx) => ({
    title: 'Fraud Alert',
    body: `A fraud flag has been raised for job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''}. Review required.`,
  }),

  [NotificationType.ACCOUNT_DEACTIVATED]: (ctx) => ({
    title: 'Account Deactivated',
    body: `Your account has been deactivated${ctx.reason ? `: ${ctx.reason}` : '. Contact support for assistance.'}.`,
  }),

  [NotificationType.PAYMENT_VERIFIED]: (ctx) => ({
    title: 'Payment Verified',
    body: `Your payment${ctx.amount ? ` of ${ctx.amount} XAF` : ''} has been verified. Your job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''} is now being assigned.`,
  }),

  [NotificationType.PAYMENT_REJECTED]: (ctx) => ({
    title: 'Payment Rejected',
    body: `Your payment was rejected${ctx.reason ? `: ${ctx.reason}` : ''}. Please resubmit payment for job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''}.`,
  }),

  [NotificationType.PAYMENT_FAILED]: (ctx) => ({
    title: 'Payment Failed',
    body: `Your payment could not be processed${ctx.reason ? `: ${ctx.reason}` : ''}. Please try again or use a different payment method.`,
  }),

  [NotificationType.SUBSCRIPTION_ACTIVATED]: (ctx) => ({
    title: 'Subscription Activated',
    body: `Your ${ctx.planName || 'subscription'} is now active. You can start scheduling pickups.`,
  }),

  [NotificationType.JOB_DISPUTED]: (ctx) => ({
    title: 'Job Disputed',
    body: `A dispute has been raised for job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''}. Admin will review shortly.`,
  }),

  [NotificationType.DISPUTE_RESOLVED]: (ctx) => ({
    title: 'Dispute Resolved',
    body: `The dispute for job${ctx.jobId ? ` #${ctx.jobId.slice(0, 8)}` : ''} has been resolved${ctx.resolution ? `: ${ctx.resolution}` : ''}.`,
  }),

  [NotificationType.COMMISSION_EARNED]: (ctx) => ({
    title: 'Commission Earned',
    body: `You earned ${ctx.amount} XAF commission${ctx.reason ? ` for ${ctx.reason}` : ''}.`,
  }),

  [NotificationType.PAYOUT_APPROVED]: (ctx) => ({
    title: 'Payout Approved',
    body: `Your payout request for ${ctx.amount} XAF has been approved and will be processed shortly.`,
  }),

  [NotificationType.PAYOUT_REJECTED]: (ctx) => ({
    title: 'Payout Rejected',
    body: `Your payout request for ${ctx.amount} XAF was rejected${ctx.reason ? `: ${ctx.reason}` : ''}.`,
  }),
};

/**
 * Get a notification template by type.
 * Returns a generic fallback if type is not registered.
 */
export function getTemplate(type: string, ctx: TemplateContext): NotificationTemplate {
  const factory = templates[type];
  if (factory) return factory(ctx);

  return {
    title: 'Notification',
    body: `You have a new notification${ctx.jobId ? ` for job #${ctx.jobId.slice(0, 8)}` : ''}.`,
  };
}

/**
 * Events considered critical for SMS fallback (sent even if SMS flag is off).
 */
export const CRITICAL_NOTIFICATION_TYPES = new Set<string>([
  NotificationType.JOB_ASSIGNED,
  NotificationType.JOB_COMPLETED,
  NotificationType.JOB_CANCELLED,
  NotificationType.ASSIGNMENT_TIMEOUT,
  NotificationType.ASSIGNMENT_ESCALATED,
  NotificationType.PAYMENT_VERIFIED,
  NotificationType.PAYMENT_REJECTED,
  NotificationType.PAYMENT_FAILED,
  NotificationType.SUBSCRIPTION_ACTIVATED,
]);
