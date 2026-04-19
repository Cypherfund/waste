import { DisputeStatus } from '../../common/enums/dispute-status.enum';

export class DisputeResponseDto {
  id: string;
  jobId: string;
  householdId: string;
  reason: string;
  status: DisputeStatus;
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}
