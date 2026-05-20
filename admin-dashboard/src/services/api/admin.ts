import client from './client';
import {
  AdminUser,
  UserDetail,
  Job,
  JobListResponse,
  Dispute,
  FraudFlag,
  SystemConfig,
  DashboardStats,
  Earning,
  EarningsListResponse,
  SubscriptionPlan,
  PayoutRequest,
  PayoutListResponse,
  PayoutConfig,
  PaymentProvider,
  PendingPayment,
  CollectorFloat,
} from '../../types';

export const usersApi = {
  list: (params?: { role?: string; isActive?: string }) =>
    client.get<AdminUser[]>('/admin/users', { params }).then((r) => r.data),

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
};

export const earningsApi = {
  list: (params?: { status?: string; collectorId?: string; from?: string; to?: string; page?: number; limit?: number }) =>
    client
      .get<EarningsListResponse>('/admin/earnings', { params })
      .then((r) => r.data),

  markAsPaid: (id: string) =>
    client.post<Earning>(`/admin/earnings/${id}/pay`).then((r) => r.data),

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
    client.get<PendingPayment[]>('/admin/jobs/pending-payment')
      .then((r) => (r.data as unknown as { data: Job[] }).data.map((j): PendingPayment => ({
        jobId: j.id,
        householdId: j.householdId,
        householdName: j.householdName ?? null,
        scheduledDate: j.scheduledDate,
        paymentMode: j.paymentMode ?? 'MANUAL_PROVIDER',
        paymentMethod: j.paymentMethod,
        paymentRef: j.paymentRef,
        paymentProofUrl: j.paymentProofUrl,
        paymentStatus: j.paymentStatus ?? 'PENDING',
        quotedPrice: j.quotedPrice,
        createdAt: j.createdAt,
      }))),

  verify: (jobId: string) =>
    client.patch(`/admin/jobs/${jobId}/verify-payment`).then((r) => r.data),

  reject: (jobId: string, reason: string) =>
    client.patch(`/admin/jobs/${jobId}/reject-payment`, { reason }).then((r) => r.data),
};

export const collectorFloatApi = {
  list: () =>
    client.get<CollectorFloat[]>('/admin/users', { params: { role: 'COLLECTOR', isActive: 'true' } })
      .then((r) => (r.data as unknown as AdminUser[]).map((u): CollectorFloat => ({
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
