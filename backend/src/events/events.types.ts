export const JobEvents = {
  CREATED: 'job.created',
  ACCEPTED: 'job.accepted',
  REJECTED: 'job.rejected',
  STARTED: 'job.started',
  COMPLETED: 'job.completed',
  VALIDATED: 'job.validated',
  CANCELLED: 'job.cancelled',
  DISPUTED: 'job.disputed',
  RATED: 'job.rated',
  ASSIGNMENT_STARTED: 'job.assignment.started',
  ASSIGNED: 'job.assigned',
  ASSIGNMENT_TIMEOUT: 'job.assignment.timeout',
  ASSIGNMENT_ESCALATED: 'job.assignment.escalated',
} as const;

export interface JobEventPayload {
  jobId: string;
  householdId: string;
  collectorId?: string | null;
  status: string;
  timestamp: Date;
}

export interface JobCancelledPayload extends JobEventPayload {
  cancelledBy: string;
  reason?: string;
}

export interface JobCompletedPayload extends JobEventPayload {
  proofId: string;
}

export interface JobRejectedPayload extends JobEventPayload {
  reason?: string;
}

export interface JobAssignedPayload extends JobEventPayload {
  attempt: number;
}

export interface JobAssignmentTimeoutPayload {
  jobId: string;
  collectorId: string;
  attempt: number;
  timestamp: Date;
}

export interface JobAssignmentEscalatedPayload {
  jobId: string;
  householdId: string;
  attempts: number;
  timestamp: Date;
}

export interface JobRatedPayload {
  jobId: string;
  householdId: string;
  collectorId: string;
  ratingId: string;
  value: number;
  timestamp: Date;
}

export const ProofEvents = {
  UPLOADED: 'proof.uploaded',
  VALIDATED: 'proof.validated',
  AUTO_VALIDATED: 'proof.auto_validated',
  DISPUTED: 'proof.disputed',
} as const;

export interface ProofUploadedPayload {
  proofId: string;
  jobId: string;
  householdId: string;
  collectorId: string;
  timestamp: Date;
}

export interface ProofValidatedPayload {
  jobId: string;
  householdId: string;
  collectorId: string;
  timestamp: Date;
}

export interface ProofAutoValidatedPayload {
  jobId: string;
  householdId: string;
  collectorId: string;
  timestamp: Date;
}

export interface ProofDisputedPayload {
  jobId: string;
  householdId: string;
  collectorId: string;
  disputeId: string;
  reason: string;
  timestamp: Date;
}

export const DisputeEvents = {
  CREATED: 'dispute.created',
  RESOLVED: 'dispute.resolved',
} as const;

export interface DisputeResolvedPayload {
  disputeId: string;
  jobId: string;
  resolution: string;
  resolvedBy: string;
  timestamp: Date;
}

export const EarningsEvents = {
  CALCULATED: 'earnings.calculated',
  CONFIRMED: 'earnings.confirmed',
} as const;

export interface EarningsCalculatedPayload {
  earningsId: string;
  jobId: string;
  collectorId: string;
  amount: number;
  timestamp: Date;
}

export interface EarningsConfirmedPayload {
  earningsId: string;
  jobId: string;
  collectorId: string;
  amount: number;
  timestamp: Date;
}

export const FraudEvents = {
  FLAG_CREATED: 'fraud.flag_created',
  FLAG_REVIEWED: 'fraud.flag_reviewed',
  COLLECTOR_AUTO_PAUSED: 'fraud.collector_auto_paused',
} as const;

export interface FraudFlagCreatedPayload {
  flagId: string;
  jobId: string;
  collectorId: string;
  type: string;
  severity: string;
  timestamp: Date;
}

export interface FraudFlagReviewedPayload {
  flagId: string;
  jobId: string;
  resolution: string;
  reviewedBy: string;
  timestamp: Date;
}

export interface CollectorAutoPausedPayload {
  collectorId: string;
  flagId: string;
  reason: string;
  timestamp: Date;
}
