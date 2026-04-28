import client from './client';
import type {
  AdminUser,
  UserDetail,
  Job,
  JobListResponse,
  Dispute,
  FraudFlag,
  SystemConfig,
  DashboardStats,
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

export const statsApi = {
  get: () =>
    client.get<DashboardStats>('/admin/stats').then((r) => r.data),
};
