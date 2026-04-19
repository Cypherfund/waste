import { EarningStatus } from '../../common/enums/earning-status.enum';

export class EarningResponseDto {
  id: string;
  jobId: string;
  collectorId: string;
  baseAmount: number;
  distanceAmount: number;
  surgeMultiplier: number;
  totalAmount: number;
  status: EarningStatus;
  confirmedAt: Date | null;
  createdAt: Date;
}

export class EarningsSummaryDto {
  totalEarnings: number;
  pendingEarnings: number;
  confirmedEarnings: number;
  jobCount: number;
  earnings: EarningResponseDto[];
}

export class EarningsQuickSummaryDto {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
}
