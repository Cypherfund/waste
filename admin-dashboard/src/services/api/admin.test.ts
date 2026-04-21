import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => {
  const mockClient = {
    get: vi.fn().mockResolvedValue({ data: 'mock' }),
    post: vi.fn().mockResolvedValue({ data: 'mock' }),
    put: vi.fn().mockResolvedValue({ data: 'mock' }),
    patch: vi.fn().mockResolvedValue({ data: 'mock' }),
  };
  return { default: mockClient };
});

import client from './client';
import { usersApi, jobsApi, disputesApi, fraudApi, configApi, statsApi } from './admin';

const mockedClient = vi.mocked(client);

describe('Admin API services', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── USERS ──────────────────────────────────────────────────────

  describe('usersApi', () => {
    it('list() calls GET /admin/users with params', async () => {
      await usersApi.list({ role: 'COLLECTOR', isActive: 'true' });
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/users', {
        params: { role: 'COLLECTOR', isActive: 'true' },
      });
    });

    it('list() calls GET /admin/users without params', async () => {
      await usersApi.list();
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/users', {
        params: undefined,
      });
    });

    it('getDetail() calls GET /admin/users/:id', async () => {
      await usersApi.getDetail('user-123');
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/users/user-123');
    });

    it('updateStatus() calls PATCH /admin/users/:id', async () => {
      await usersApi.updateStatus('user-123', false);
      expect(mockedClient.patch).toHaveBeenCalledWith('/admin/users/user-123', {
        isActive: false,
      });
    });
  });

  // ─── JOBS ───────────────────────────────────────────────────────

  describe('jobsApi', () => {
    it('list() calls GET /admin/jobs with params', async () => {
      await jobsApi.list({ status: 'REQUESTED', page: '1', limit: '20' });
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/jobs', {
        params: { status: 'REQUESTED', page: '1', limit: '20' },
      });
    });

    it('getDetail() calls GET /admin/jobs/:id', async () => {
      await jobsApi.getDetail('job-456');
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/jobs/job-456');
    });

    it('manualAssign() calls POST /admin/jobs/:id/assign', async () => {
      await jobsApi.manualAssign('job-456', 'collector-789');
      expect(mockedClient.post).toHaveBeenCalledWith(
        '/admin/jobs/job-456/assign',
        { collectorId: 'collector-789' },
      );
    });
  });

  // ─── DISPUTES ───────────────────────────────────────────────────

  describe('disputesApi', () => {
    it('list() calls GET /admin/disputes with status', async () => {
      await disputesApi.list('OPEN');
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/disputes', {
        params: { status: 'OPEN' },
      });
    });

    it('list() calls GET /admin/disputes without status', async () => {
      await disputesApi.list();
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/disputes', {
        params: {},
      });
    });

    it('resolve() calls PATCH /admin/disputes/:id', async () => {
      await disputesApi.resolve('d-1', 'RESOLVED_ACCEPTED', 'Household was right');
      expect(mockedClient.patch).toHaveBeenCalledWith('/admin/disputes/d-1', {
        resolution: 'RESOLVED_ACCEPTED',
        adminNotes: 'Household was right',
      });
    });
  });

  // ─── FRAUD ──────────────────────────────────────────────────────

  describe('fraudApi', () => {
    it('list() calls GET /admin/fraud-flags with params', async () => {
      await fraudApi.list({ status: 'OPEN', severity: 'HIGH' });
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/fraud-flags', {
        params: { status: 'OPEN', severity: 'HIGH' },
      });
    });

    it('review() calls PATCH /admin/fraud-flags/:id', async () => {
      await fraudApi.review('f-1', 'CONFIRMED', 'GPS mismatch verified');
      expect(mockedClient.patch).toHaveBeenCalledWith('/admin/fraud-flags/f-1', {
        resolution: 'CONFIRMED',
        reviewNotes: 'GPS mismatch verified',
      });
    });
  });

  // ─── CONFIG ─────────────────────────────────────────────────────

  describe('configApi', () => {
    it('list() calls GET /admin/config with category', async () => {
      await configApi.list('assignment');
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/config', {
        params: { category: 'assignment' },
      });
    });

    it('list() calls GET /admin/config without category', async () => {
      await configApi.list();
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/config', {
        params: {},
      });
    });

    it('update() calls PUT /admin/config/:key', async () => {
      await configApi.update('assignment.max_radius_km', '15');
      expect(mockedClient.put).toHaveBeenCalledWith(
        '/admin/config/assignment.max_radius_km',
        { value: '15' },
      );
    });
  });

  // ─── STATS ──────────────────────────────────────────────────────

  describe('statsApi', () => {
    it('get() calls GET /admin/stats', async () => {
      await statsApi.get();
      expect(mockedClient.get).toHaveBeenCalledWith('/admin/stats');
    });
  });
});
