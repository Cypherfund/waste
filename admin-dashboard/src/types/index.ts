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
  householdName?: string | null;
  collectorId: string | null;
  collectorName?: string | null;
  status: string;
  wasteType?: string;
  estimatedWeight?: number | null;
  scheduledDate: string;
  scheduledTime: string;
  locationLat: number | null;
  locationLng: number | null;
  locationAddress?: string | null;
  address?: string | null;
  notes: string | null;
  paymentMode: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  paymentProofUrl: string | null;
  paymentStatus: string | null;
  quotedPrice: number | null;
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

// ─── Subscriptions ─────────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  pickupsPerWeek: number;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Payouts ────────────────────────────────────────────────────────────────
export interface PayoutRequest {
  id: string;
  collectorId: string;
  collectorName: string | null;
  collectorPhone: string | null;
  amount: number;
  method: string;
  accountNumber: string | null;
  accountName: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface PayoutListResponse {
  data: PayoutRequest[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface PayoutMethod { key: string; label: string; }
export interface PayoutConfig {
  minWithdrawal: number;
  maxWithdrawal: number;
  methods: PayoutMethod[];
}

// ─── Earnings ───────────────────────────────────────────────────────────────
export interface Earning {
  id: string;
  jobId: string;
  collectorId: string;
  collectorName: string | null;
  collectorPhone: string | null;
  baseAmount: number;
  distanceAmount: number;
  surgeMultiplier: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED';
  confirmedAt: string | null;
  createdAt: string;
}

export interface EarningsListResponse {
  data: Earning[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ─── Payment Providers ───────────────────────────────────────────
export interface PaymentProvider {
  id: number;
  paymentCode: string;
  countryCode: string;
  providerName: string;
  currency: string;
  minDeposit: number | null;
  maxDeposit: number | null;
  minWithdrawal: number | null;
  maxWithdrawal: number | null;
  supportsCashin: boolean;
  supportsCashout: boolean;
  imageUrl: string | null;
  isGlobal: boolean;
  isEnabled: boolean;
  manualPaymentPhone: string | null;
  manualPaymentAccountName: string | null;
  manualInstructions: string | null;
  integrationEnabled: boolean;
  manualInstructionsEnabled: boolean;
  manualProofRequired: boolean;
  syncedAt: string;
  updatedAt: string;
}

export interface PendingPayment {
  jobId: string;
  householdId: string;
  householdName: string | null;
  scheduledDate: string;
  paymentMode: string;
  paymentMethod: string | null;
  paymentRef: string | null;
  paymentProofUrl: string | null;
  paymentStatus: string;
  quotedPrice: number | null;
  createdAt: string;
}

export interface CollectorFloat {
  collectorId: string;
  collectorName: string | null;
  collectorPhone: string | null;
  collectorFloatBalance: number;
}

export interface FloatTopUpDto {
  collectorId: string;
  amount: number;
  note?: string;
}

// ─── Growth / Ambassadors ───────────────────────────────────────
export interface Marketer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email: string | null;
  referralCode: string;
  territory: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  totalLeads: number;
  totalRegistered: number;
  totalQualified: number;
  totalExpired: number;
  conversionRate: number;
  qualificationRate: number;
  totalEarned: number;
  totalPaid: number;
  pendingAmount: number;
  approvedAmount: number;
  dailyLeadsCreated: number;
  createdAt: string;
  updatedAt: string;
  tempPassword?: string | null;
}

export interface GrowthLead {
  id: string;
  marketerId: string;
  name: string;
  phone: string;
  type: 'HOUSEHOLD' | 'COLLECTOR';
  area: string | null;
  notes: string | null;
  source: 'FIELD' | 'ONLINE' | 'REFERRAL';
  referralToken: string;
  referralCode: string;
  status: 'INVITED' | 'REGISTERED' | 'QUALIFIED' | 'EXPIRED';
  invitedAt: string;
  registeredAt: string | null;
  qualifiedAt: string | null;
  expiresAt: string;
  smsStatus: string;
  smsRetryCount: number;
  createdAt: string;
}

export interface CommissionScheme {
  id: string;
  name: string;
  type: 'HOUSEHOLD_ONBOARDING' | 'COLLECTOR_ONBOARDING' | 'SUBSCRIPTION_PAYMENT';
  description: string | null;
  commissionType: 'FIXED' | 'PERCENTAGE';
  amount: number;
  isActive: boolean;
  isAutoAssigned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionTransaction {
  id: string;
  marketerProfileId: string;
  schemeId: string;
  leadId: string;
  triggerType: string;
  referenceId: string;
  referenceType: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  description: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  paidAt: string | null;
  createdAt: string;
  marketerProfile?: { id: string; user?: { name: string; phone: string } };
}

export interface CommissionTransactionsResponse {
  data: CommissionTransaction[];
  total: number;
}

export interface MarketerPayoutRequest {
  id: string;
  marketerProfileId: string;
  amount: number;
  method: string;
  accountNumber: string;
  accountName: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  marketerProfile?: { id: string; user?: { name: string; phone: string } };
}

export interface MarketerPayoutsResponse {
  data: MarketerPayoutRequest[];
  total: number;
}

// ─── Marketing Budget & Campaigns ───────────────────────────────
export interface MarketingBudgetPeriod {
  id: string;
  name: string;
  totalBudget: number;
  committedAmount: number;
  spentAmount: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  alertThresholdPct: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingCampaign {
  id: string;
  budgetPeriodId: string;
  budgetPeriod?: MarketingBudgetPeriod;
  name: string;
  description: string | null;
  territory: string | null;
  startDate: string;
  endDate: string;
  budgetAmount: number;
  committedAmount: number;
  spentAmount: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'CANCELLED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  marketerAssignments?: CampaignMarketerAssignment[];
}

export interface CampaignMarketerAssignment {
  id: string;
  campaignId: string;
  marketerProfileId: string;
  marketerProfile?: { id: string; user?: { name: string; phone: string } };
  isActive: boolean;
  assignedBy: string;
  assignedAt: string;
}

export interface BudgetTransaction {
  id: string;
  budgetPeriodId: string;
  campaignId: string;
  campaign?: MarketingCampaign;
  commissionTransactionId: string | null;
  marketerProfileId: string | null;
  marketerProfile?: { id: string; user?: { name: string } };
  type: 'COMMITTED' | 'RELEASED' | 'SPENT' | 'ADJUSTMENT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
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
  paymentIntegrationEnabled: boolean;
}
