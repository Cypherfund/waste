export enum JobStatus {
  REQUESTED = 'REQUESTED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VALIDATED = 'VALIDATED',
  RATED = 'RATED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.REQUESTED]: [JobStatus.ASSIGNED, JobStatus.CANCELLED],
  [JobStatus.ASSIGNED]: [JobStatus.IN_PROGRESS, JobStatus.REQUESTED, JobStatus.CANCELLED],
  [JobStatus.IN_PROGRESS]: [JobStatus.COMPLETED, JobStatus.CANCELLED],
  [JobStatus.COMPLETED]: [JobStatus.VALIDATED, JobStatus.DISPUTED],
  [JobStatus.VALIDATED]: [JobStatus.RATED],
  [JobStatus.DISPUTED]: [JobStatus.VALIDATED, JobStatus.CANCELLED],
  [JobStatus.RATED]: [],
  [JobStatus.CANCELLED]: [],
};

export const TERMINAL_STATUSES = [JobStatus.RATED, JobStatus.CANCELLED];

export function validateTransition(from: JobStatus, to: JobStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(`Invalid status transition: ${from} → ${to}`);
  }
}
