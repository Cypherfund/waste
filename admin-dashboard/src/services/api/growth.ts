import client from './client';
import {
  Marketer,
  GrowthLead,
  CommissionScheme,
  CommissionTransactionsResponse,
  MarketerPayoutsResponse,
} from '../../types';

export const growthMarketersApi = {
  list: () =>
    client.get<Marketer[]>('/admin/growth/marketers').then((r) => r.data),

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
    client.get<{ data: GrowthLead[]; total: number }>('/admin/growth/leads', { params }).then((r) => r.data),
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
