import client from './client';
import {
  AdminUser,
  UserDetail,
  UserListResponse,
  Job,
  JobListResponse,
  Dispute,
  FraudFlag,
  SystemConfig,
  DashboardStats,
  EarningsListResponse,
  SubscriptionPlan,
  PayoutRequest,
  PayoutListResponse,
  PayoutConfig,
  PaymentProvider,
  PendingPayment,
  CollectorFloat,
  ReconciliationSummary,
  UnreconciledItem,
} from '../../types';

export const usersApi = {
  list: (params?: { role?: string; isActive?: string; page?: number; limit?: number }) =>
    client.get<UserListResponse>('/admin/users', { params }).then((r) => r.data),

  getDetail: (id: string) =>
    client.get<UserDetail>(`/admin/users/${id}`).then((r) => r.data),

  updateStatus: (id: string, isActive: boolean) =>
    client.patch(`/admin/users/${id}`, { isActive }).then((r) => r.data),
};

export const jobsApi = {
  list: (params?: Record<string, string>) =>
    client.get<JobListResponse>('/admin/jobs', { params }).then((r) => r.data),

  getDetail: (id: string) =>
    client.get<Job>(`/admin/jobs/${id}`).then((r) => r.data),

  manualAssign: (jobId: string, collectorId: string) =>
    client
      .post(`/admin/jobs/${jobId}/assign`, { collectorId })
      .then((r) => r.data),

  manualReassign: (jobId: string, collectorId: string) =>
    client
      .post(`/admin/jobs/${jobId}/reassign`, { collectorId })
      .then((r) => r.data),

  cancel: (jobId: string, reason?: string) =>
    client
      .post(`/jobs/${jobId}/cancel`, { reason })
      .then((r) => r.data),

  verifyPayment: (jobId: string) =>
    client
      .patch(`/admin/jobs/${jobId}/verify-payment`)
      .then((r) => r.data),

  rejectPayment: (jobId: string, reason?: string) =>
    client
      .patch(`/admin/jobs/${jobId}/reject-payment`, { reason })
      .then((r) => r.data),
};

export const disputesApi = {
  list: (status?: string) =>
    client
      .get<Dispute[]>('/admin/disputes', { params: status ? { status } : {} })
      .then((r) => r.data),

  resolve: (id: string, resolution: string, adminNotes: string) =>
    client
      .patch(`/admin/disputes/${id}`, { resolution, adminNotes })
      .then((r) => r.data),
};

export const fraudApi = {
  list: (params?: { status?: string; severity?: string }) =>
    client
      .get<FraudFlag[]>('/admin/fraud-flags', { params })
      .then((r) => r.data),

  review: (id: string, resolution: string, reviewNotes: string) =>
    client
      .patch(`/admin/fraud-flags/${id}`, { resolution, reviewNotes })
      .then((r) => r.data),
};

export const configApi = {
  list: (category?: string) =>
    client
      .get<SystemConfig[]>('/admin/config', {
        params: category ? { category } : {},
      })
      .then((r) => r.data),

  update: (key: string, value: string) =>
    client.put(`/admin/config/${key}`, { value }).then((r) => r.data),

  purgeCache: (flagKey?: string) =>
    client.post<{ cleared: number }>('/admin/config/purge-cache', { flagKey }).then((r) => r.data),
};

export const earningsApi = {
  list: (params?: { status?: string; collectorId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    client
      .get<EarningsListResponse>('/admin/earnings', { params })
      .then((r) => r.data),

  exportCsvUrl: (params?: { status?: string; collectorId?: string; from?: string; to?: string }) => {
    const token = localStorage.getItem('access_token') ?? '';
    const qs = new URLSearchParams({ ...(params as Record<string, string>) }).toString();
    return `${client.defaults.baseURL}/admin/earnings/export${qs ? `?${qs}` : ''}`;
  },
};

export const statsApi = {
  get: () =>
    client.get<DashboardStats>('/admin/stats').then((r) => r.data),
};

export const payoutsApi = {
  list: (params?: { status?: string; collectorId?: string; page?: number; limit?: number }) =>
    client.get<PayoutListResponse>('/admin/payouts', { params }).then((r) => r.data),

  review: (id: string, action: 'approve' | 'reject' | 'mark_paid', adminNote?: string) =>
    client.patch<PayoutRequest>(`/admin/payouts/${id}`, { action, adminNote }).then((r) => r.data),

  getConfig: () =>
    client.get<PayoutConfig>('/wallet/payout-config').then((r) => r.data),
};

export const subscriptionPlansApi = {
  list: () =>
    client.get<SubscriptionPlan[]>('/subscriptions/admin/plans').then((r) => r.data),

  create: (body: { name: string; price: number; pickupsPerWeek: number; description?: string }) =>
    client.post<SubscriptionPlan>('/subscriptions/admin/plans', body).then((r) => r.data),

  update: (id: string, body: { name?: string; price?: number; pickupsPerWeek?: number; isActive?: boolean; description?: string }) =>
    client.patch<SubscriptionPlan>(`/subscriptions/admin/plans/${id}`, body).then((r) => r.data),
};

export const pendingPaymentsApi = {
  list: () =>
    client.get<{ data: any[] }>('/admin/jobs/pending-payment')
      .then((r) => {
        const items = (r.data as unknown as { data: any[] }).data;
        return items.map((item): PendingPayment => {
          if (item.paymentSource === 'WALLET_TOPUP') {
            return {
              jobId: null,
              subscriptionId: null,
              transactionId: item.transactionId ?? null,
              paymentSource: 'WALLET_TOPUP',
              householdId: item.householdId,
              householdName: item.householdName ?? null,
              planName: null,
              scheduledDate: item.createdAt,
              paymentMode: item.paymentMode ?? 'MANUAL_PROVIDER',
              paymentMethod: item.paymentMethod ?? null,
              paymentRef: item.paymentRef ?? null,
              paymentProofUrl: item.paymentProofUrl ?? null,
              paymentStatus: item.paymentStatus ?? 'PENDING',
              quotedPrice: item.amount ?? null,
              createdAt: item.createdAt,
            };
          }
          if (item.paymentSource === 'SUBSCRIPTION_PAYMENT') {
            return {
              jobId: null,
              subscriptionId: item.subscriptionId ?? null,
              transactionId: null,
              paymentSource: 'SUBSCRIPTION_PAYMENT',
              householdId: item.householdId,
              householdName: item.householdName ?? null,
              planName: item.planName ?? null,
              scheduledDate: item.scheduledDate,
              paymentMode: item.paymentMode ?? 'MANUAL_PROVIDER',
              paymentMethod: item.paymentMethod ?? null,
              paymentRef: item.paymentRef ?? null,
              paymentProofUrl: item.paymentProofUrl ?? null,
              paymentStatus: item.paymentStatus ?? 'AWAITING_ADMIN_VERIFICATION',
              quotedPrice: item.quotedPrice ?? null,
              createdAt: item.createdAt,
            };
          }
          return {
            jobId: item.id ?? item.jobId,
            subscriptionId: null,
            transactionId: null,
            paymentSource: 'JOB_PAYMENT',
            householdId: item.householdId,
            householdName: item.householdName ?? null,
            planName: null,
            scheduledDate: item.scheduledDate,
            paymentMode: item.paymentMode ?? 'MANUAL_PROVIDER',
            paymentMethod: item.paymentMethod ?? null,
            paymentRef: item.paymentRef ?? null,
            paymentProofUrl: item.paymentProofUrl ?? null,
            paymentStatus: item.paymentStatus ?? 'PENDING',
            quotedPrice: item.quotedPrice ?? null,
            createdAt: item.createdAt,
          };
        });
      }),

  checkPaymentStatus: (jobId: string) =>
    client.post<{ gatewayStatus: string; jobPaymentStatus: string; autoVerified: boolean; message: string }>(`/admin/jobs/${jobId}/check-payment-status`).then((r) => r.data),

  verify: (item: PendingPayment) => {
    if (item.paymentSource === 'WALLET_TOPUP' && item.transactionId) {
      return client.post(`/admin/wallet-top-up/${item.transactionId}/approve`).then((r) => r.data);
    }
    if (item.paymentSource === 'SUBSCRIPTION_PAYMENT' && item.subscriptionId) {
      return client.patch(`/subscriptions/admin/${item.subscriptionId}/verify-payment`).then((r) => r.data);
    }
    return client.patch(`/admin/jobs/${item.jobId}/verify-payment`).then((r) => r.data);
  },

  reject: (item: PendingPayment, reason: string) => {
    if (item.paymentSource === 'WALLET_TOPUP' && item.transactionId) {
      return client.post(`/admin/wallet-top-up/${item.transactionId}/reject`, { reason }).then((r) => r.data);
    }
    if (item.paymentSource === 'SUBSCRIPTION_PAYMENT' && item.subscriptionId) {
      return client.patch(`/subscriptions/admin/${item.subscriptionId}/reject-payment`, { reason }).then((r) => r.data);
    }
    return client.patch(`/admin/jobs/${item.jobId}/reject-payment`, { reason }).then((r) => r.data);
  },
};

export const collectorFloatApi = {
  list: () =>
    client.get<UserListResponse>('/admin/users', { params: { role: 'COLLECTOR', isActive: 'true', limit: 100 } })
      .then((r) => r.data.data.map((u): CollectorFloat => ({
        collectorId: u.id,
        collectorName: u.name,
        collectorPhone: u.phone,
        collectorFloatBalance: (u as unknown as { collectorFloatBalance?: number }).collectorFloatBalance ?? 0,
      }))),

  topUp: (collectorId: string, amount: number, note?: string) =>
    client.post(`/admin/users/${collectorId}/float-topup`, { amount, note }).then((r) => r.data),
};

export const paymentProvidersApi = {
  list: (countryCode?: string) =>
    client
      .get<PaymentProvider[]>('/admin/payments/providers', {
        params: countryCode ? { countryCode } : {},
      })
      .then((r) => r.data),

  create: (body: Partial<PaymentProvider>) =>
    client.post<PaymentProvider>('/admin/payments/providers', body).then((r) => r.data),

  update: (id: number, body: Partial<PaymentProvider>) =>
    client.patch<PaymentProvider>(`/admin/payments/providers/${id}`, body).then((r) => r.data),

  remove: (id: number) =>
    client.delete(`/admin/payments/providers/${id}`).then((r) => r.data),

  sync: (countryCode: string) =>
    client.post(`/admin/payments/providers/sync`, null, { params: { countryCode } }).then((r) => r.data),
};

export interface CleanupFilters {
  createdBefore?: string;
  createdAfter?: string;
  phonePattern?: string;
  emailPattern?: string;
  roles?: string[];
  forceAllNonAdmin?: boolean;
}

export interface CleanupComponents {
  jobs?: boolean;
  users?: boolean;
  growth?: boolean;
  marketingBudgets?: boolean;
  payments?: boolean;
  files?: boolean;
  notifications?: boolean;
  admin?: boolean;
}

export interface CleanupRequest {
  developerCode: string;
  confirmationPhrase?: string;
  dryRun?: boolean;
  logId?: string;
  filters: CleanupFilters;
  components: CleanupComponents;
}

export interface CleanupAnalysis {
  jobs: { jobs: number; proofs: number; ratings: number; disputes: number; fraudFlags: number; locationUpdates: number };
  users: { users: number; addresses: number; paymentMethods: number; subscriptions: number };
  growth: { leads: number; marketerProfiles: number; commissionTransactions: number; marketerPayoutRequests: number };
  marketingBudgets: { campaigns: number; budgetPeriods: number; budgetTransactions: number };
  payments: { paymentTransactions: number; earnings: number; payoutRequests: number; collectorFloatLedger: number };
  files: { unusedFiles: number };
  notifications: { notifications: number; marketerNotifications: number };
  admin: { walletLedger: number; reconciliationRuns: number };
}

export interface CleanupResult {
  success: boolean;
  deletedCounts: CleanupAnalysis;
  errors: string[];
  logId: string;
}

export const systemCleanupApi = {
  analyze: (request: CleanupRequest) =>
    client.post<{ analysis: CleanupAnalysis; logId: string }>('/admin/system-cleanup/analyze', request).then((r) => r.data),

  execute: (request: CleanupRequest) =>
    client.post<CleanupResult>('/admin/system-cleanup/execute', request).then((r) => r.data),

  logs: () =>
    client.get<any[]>('/admin/system-cleanup/logs').then((r) => r.data),

  getLog: (id: string) =>
    client.get<any>(`/admin/system-cleanup/logs/${id}`).then((r) => r.data),
};

export const reconciliationApi = {
  getSummary: (from: string, to: string) =>
    client.get<{ success: boolean; data: ReconciliationSummary[] }>('/admin/reconciliation/summary', { params: { from, to } })
      .then((r) => r.data.data),

  getDailyMetrics: (date: string) =>
    client.get<{ success: boolean; data: any }>('/admin/reconciliation/daily', { params: { date } })
      .then((r) => r.data.data),

  getUnreconciled: (from: string, to: string) =>
    client.get<{ success: boolean; data: UnreconciledItem[] }>('/admin/reconciliation/unreconciled', { params: { from, to } })
      .then((r) => r.data.data),

  saveDaily: (date: string) =>
    client.post<{ success: boolean; data: ReconciliationSummary }>('/admin/reconciliation/daily/save', {}, { params: { date } })
      .then((r) => r.data.data),

  exportCsv: async (from: string, to: string) => {
    const response = await client.get('/admin/reconciliation/export', {
      params: { from, to },
      responseType: 'blob',
    });
    return response.data;
  },
};

export enum AdminAuditAction {
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  WALLET_TOPUP_APPROVED = 'WALLET_TOPUP_APPROVED',
  WALLET_TOPUP_REJECTED = 'WALLET_TOPUP_REJECTED',
  SUBSCRIPTION_PAYMENT_VERIFIED = 'SUBSCRIPTION_PAYMENT_VERIFIED',
  SUBSCRIPTION_PAYMENT_REJECTED = 'SUBSCRIPTION_PAYMENT_REJECTED',
  COLLECTOR_PAYOUT_APPROVED = 'COLLECTOR_PAYOUT_APPROVED',
  COLLECTOR_PAYOUT_REJECTED = 'COLLECTOR_PAYOUT_REJECTED',
  COLLECTOR_PAYOUT_MARKED_PAID = 'COLLECTOR_PAYOUT_MARKED_PAID',
  MARKETER_PAYOUT_APPROVED = 'MARKETER_PAYOUT_APPROVED',
  MARKETER_PAYOUT_REJECTED = 'MARKETER_PAYOUT_REJECTED',
  MARKETER_PAYOUT_MARKED_PAID = 'MARKETER_PAYOUT_MARKED_PAID',
  SYSTEM_CONFIG_UPDATED = 'SYSTEM_CONFIG_UPDATED',
  PAYMENT_PROVIDER_CREATED = 'PAYMENT_PROVIDER_CREATED',
  PAYMENT_PROVIDER_UPDATED = 'PAYMENT_PROVIDER_UPDATED',
  PAYMENT_PROVIDER_DELETED = 'PAYMENT_PROVIDER_DELETED',
  COLLECTOR_FLOAT_TOPPED_UP = 'COLLECTOR_FLOAT_TOPPED_UP',
  COLLECTOR_FLOAT_ADJUSTED = 'COLLECTOR_FLOAT_ADJUSTED',
  SYSTEM_CLEANUP_ANALYZED = 'SYSTEM_CLEANUP_ANALYZED',
  SYSTEM_CLEANUP_EXECUTED = 'SYSTEM_CLEANUP_EXECUTED',
}

export enum AdminAuditEntityType {
  JOB = 'JOB',
  PAYMENT_TRANSACTION = 'PAYMENT_TRANSACTION',
  WALLET_TOPUP = 'WALLET_TOPUP',
  SUBSCRIPTION = 'SUBSCRIPTION',
  PAYOUT_REQUEST = 'PAYOUT_REQUEST',
  MARKETER_PAYOUT_REQUEST = 'MARKETER_PAYOUT_REQUEST',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  PAYMENT_PROVIDER = 'PAYMENT_PROVIDER',
  COLLECTOR_FLOAT_LEDGER = 'COLLECTOR_FLOAT_LEDGER',
  SYSTEM_CLEANUP = 'SYSTEM_CLEANUP',
}

export interface AdminAuditLog {
  id: string;
  adminId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: any;
  newValue: any;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AdminAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditLogsApi = {
  list: (params?: { from?: string; to?: string; adminId?: string; action?: string; entityType?: string; entityId?: string; page?: number; limit?: number }) =>
    client.get<AuditLogsResponse>('/admin/audit-logs', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<AdminAuditLog>(`/admin/audit-logs/${id}`).then((r) => r.data),
};

export interface OtpLookupResponse {
  phone: string;
  otp: string | null;
  expiresInSeconds: number;
  expiresInMinutes: number;
}

export const supportApi = {
  lookupOtp: (phone: string) =>
    client.get<OtpLookupResponse>('/admin/support/otp', { params: { phone } }).then((r) => r.data),
};
