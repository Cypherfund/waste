import client from './client';
import {
  Marketer,
  GrowthLead,
  CommissionScheme,
  CommissionTransactionsResponse,
  MarketerPayoutsResponse,
  MarketingBudgetPeriod,
  MarketingCampaign,
  BudgetTransaction,
} from '../../types';

export const growthMarketersApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    client.get<{ data: Marketer[]; total: number; totalPages: number }>('/admin/growth/marketers', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<Marketer>(`/admin/growth/marketers/${id}`).then((r) => r.data),

  create: (body: { name: string; phone: string; email?: string; territory?: string; password?: string }) =>
    client.post<Marketer>('/admin/growth/marketers', body).then((r) => r.data),

  suspend: (id: string) =>
    client.post(`/admin/growth/marketers/${id}/suspend`).then((r) => r.data),

  activate: (id: string) =>
    client.post(`/admin/growth/marketers/${id}/activate`).then((r) => r.data),
};

export const growthLeadsApi = {
  list: (params?: { marketerId?: string; status?: string; page?: number; limit?: number }) =>
    client.get<{ data: GrowthLead[]; total: number; totalPages: number }>('/admin/growth/leads', { params }).then((r) => r.data),

  expire: (id: string) =>
    client.post(`/admin/growth/leads/${id}/expire`).then((r) => r.data),

  resendWhatsApp: (id: string) =>
    client.post(`/admin/growth/leads/${id}/resend-whatsapp`).then((r) => r.data),
};

export const growthSchemesApi = {
  list: () =>
    client.get<CommissionScheme[]>('/admin/growth/commission-schemes').then((r) => r.data),

  create: (body: { name: string; type: string; description?: string; commissionType: string; amount: number }) =>
    client.post<CommissionScheme>('/admin/growth/commission-schemes', body).then((r) => r.data),

  update: (id: string, body: Partial<CommissionScheme>) =>
    client.patch<CommissionScheme>(`/admin/growth/commission-schemes/${id}`, body).then((r) => r.data),

  deactivate: (id: string) =>
    client.delete(`/admin/growth/commission-schemes/${id}`).then((r) => r.data),
};

export const growthCommissionsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    client.get<CommissionTransactionsResponse>('/admin/growth/commission-transactions', { params }).then((r) => r.data),

  approve: (id: string, note?: string) =>
    client.post(`/admin/growth/commission-transactions/${id}/approve`, { note }).then((r) => r.data),

  reject: (id: string, reason: string) =>
    client.post(`/admin/growth/commission-transactions/${id}/reject`, { reason }).then((r) => r.data),

  reconcileHouseholdJobs: () =>
    client.post<{ processed: number; created: number; errors: number }>('/admin/growth/commissions/reconcile/household-jobs').then((r) => r.data),

  reconcileSubscriptions: () =>
    client.post<{ processed: number; created: number; errors: number }>('/admin/growth/commissions/reconcile/subscriptions').then((r) => r.data),

  reconcileAll: () =>
    client.post<{ householdJobs: { processed: number; created: number; errors: number }; subscriptions: { processed: number; created: number; errors: number } }>('/admin/growth/commissions/reconcile/all').then((r) => r.data),
};

export const growthPayoutsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    client.get<MarketerPayoutsResponse>('/admin/growth/marketer-payouts', { params }).then((r) => r.data),

  approve: (id: string) =>
    client.post(`/admin/growth/marketer-payouts/${id}/approve`).then((r) => r.data),

  reject: (id: string, reason: string) =>
    client.post(`/admin/growth/marketer-payouts/${id}/reject`, { reason }).then((r) => r.data),

  markPaid: (id: string, paidReference: string) =>
    client.post(`/admin/growth/marketer-payouts/${id}/mark-paid`, { paidReference }).then((r) => r.data),
};

export const growthBudgetsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    client.get<{ data: MarketingBudgetPeriod[]; total: number; totalPages: number }>('/admin/marketing-budget-periods', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<MarketingBudgetPeriod>(`/admin/marketing-budget-periods/${id}`).then((r) => r.data),

  create: (body: { name: string; totalBudget: number; startDate: string; endDate: string }) =>
    client.post<MarketingBudgetPeriod>('/admin/marketing-budget-periods', body).then((r) => r.data),

  update: (id: string, body: { totalBudget?: number; adjustmentReason?: string }) =>
    client.patch<MarketingBudgetPeriod>(`/admin/marketing-budget-periods/${id}`, body).then((r) => r.data),

  close: (id: string) =>
    client.post(`/admin/marketing-budget-periods/${id}/close`).then((r) => r.data),

  getTransactions: (id: string) =>
    client.get<BudgetTransaction[]>(`/admin/marketing-budget-periods/${id}/transactions`).then((r) => r.data),
};

export const growthCampaignsApi = {
  list: (params?: { status?: string; territory?: string; budgetPeriodId?: string; page?: number; limit?: number }) =>
    client.get<{ data: MarketingCampaign[]; total: number; totalPages: number }>('/admin/marketing-campaigns', { params }).then((r) => r.data),

  getById: (id: string) =>
    client.get<MarketingCampaign>(`/admin/marketing-campaigns/${id}`).then((r) => r.data),

  create: (body: {
    budgetPeriodId: string;
    name: string;
    description?: string;
    territory?: string;
    startDate: string;
    endDate: string;
    budgetAmount: number;
  }) =>
    client.post<MarketingCampaign>('/admin/marketing-campaigns', body).then((r) => r.data),

  update: (id: string, body: Partial<{
    name: string;
    description: string;
    territory: string;
    startDate: string;
    endDate: string;
    budgetAmount: number;
  }>) =>
    client.patch<MarketingCampaign>(`/admin/marketing-campaigns/${id}`, body).then((r) => r.data),

  activate: (id: string) =>
    client.post(`/admin/marketing-campaigns/${id}/activate`).then((r) => r.data),

  pause: (id: string) =>
    client.post(`/admin/marketing-campaigns/${id}/pause`).then((r) => r.data),

  end: (id: string) =>
    client.post(`/admin/marketing-campaigns/${id}/end`).then((r) => r.data),

  cancel: (id: string) =>
    client.post(`/admin/marketing-campaigns/${id}/cancel`).then((r) => r.data),

  assignMarketers: (id: string, body: { marketerProfileIds: string[] }) =>
    client.post(`/admin/marketing-campaigns/${id}/assign-marketers`, body).then((r) => r.data),

  removeMarketer: (id: string, marketerProfileId: string) =>
    client.delete(`/admin/marketing-campaigns/${id}/assign-marketers/${marketerProfileId}`).then((r) => r.data),

  assignSchemes: (id: string, body: { schemeIds: string[] }) =>
    client.post(`/admin/marketing-campaigns/${id}/assign-schemes`, body).then((r) => r.data),

  removeScheme: (id: string, schemeId: string) =>
    client.delete(`/admin/marketing-campaigns/${id}/assign-schemes/${schemeId}`).then((r) => r.data),

  getPerformance: (id: string) =>
    client.get(`/admin/marketing-campaigns/${id}/performance`).then((r) => r.data),
};

