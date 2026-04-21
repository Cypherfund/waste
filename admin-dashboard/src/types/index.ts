// ─── Auth ────────────────────────────────────────────────────────
export interface LoginRequest {
  phone: string;
  password: string;
}

export interface AuthResponse {
  user: UserInfo;
  accessToken: string;
  refreshToken: string;
}

export interface UserInfo {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Users ───────────────────────────────────────────────────────
export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: string;
  isActive: boolean;
  avgRating: number | null;
  totalCompleted: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends AdminUser {
  completedJobs: number;
  totalEarnings: number;
}

// ─── Jobs ────────────────────────────────────────────────────────
export interface Job {
  id: string;
  householdId: string;
  collectorId: string | null;
  status: string;
  wasteType: string;
  estimatedWeight: number | null;
  scheduledDate: string;
  scheduledTime: string;
  locationLat: number | null;
  locationLng: number | null;
  address: string | null;
  notes: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobListResponse {
  data: Job[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ─── Disputes ────────────────────────────────────────────────────
export interface Dispute {
  id: string;
  jobId: string;
  householdId: string;
  collectorId: string;
  reason: string;
  status: string;
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Fraud ───────────────────────────────────────────────────────
export interface FraudFlag {
  id: string;
  jobId: string;
  collectorId: string;
  type: string;
  severity: string;
  status: string;
  details: Record<string, unknown>;
  reviewedBy: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

// ─── Config ──────────────────────────────────────────────────────
export interface SystemConfig {
  key: string;
  value: string;
  category: string;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

// ─── Stats ───────────────────────────────────────────────────────
export interface DashboardStats {
  totalUsers: number;
  totalHouseholds: number;
  totalCollectors: number;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  flaggedCollectors: number;
  totalDisputes: number;
  openDisputes: number;
  avgRating: number;
  avgCompletionTimeMinutes: number;
  earningsTotal: number;
  earningsPending: number;
  jobsByStatus: Record<string, number>;
}
