import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import type { ReactNode } from 'react';

vi.mock('../../services/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));

import { authApi } from '../../services/api/auth';
const mockedLogin = vi.mocked(authApi.login);
const mockedLogout = vi.mocked(authApi.logout);

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const adminUser = {
  id: 'u-1',
  name: 'Admin',
  phone: '+237600000000',
  email: null,
  role: 'ADMIN' as const,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const householdUser = {
  ...adminUser,
  id: 'u-2',
  name: 'Household User',
  role: 'HOUSEHOLD' as const,
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts unauthenticated with no stored session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('restores admin session from localStorage', async () => {
    localStorage.setItem('access_token', 'tok-123');
    localStorage.setItem('user', JSON.stringify(adminUser));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Admin');
  });

  it('rejects non-admin stored session', async () => {
    localStorage.setItem('access_token', 'tok-456');
    localStorage.setItem('user', JSON.stringify(householdUser));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('clears corrupted session data', async () => {
    localStorage.setItem('access_token', 'tok-789');
    localStorage.setItem('user', '{{bad json');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('login succeeds for admin user', async () => {
    mockedLogin.mockResolvedValue({
      user: adminUser,
      accessToken: 'new-token',
      refreshToken: 'ref-token',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('+237600000000', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.name).toBe('Admin');
    expect(localStorage.getItem('access_token')).toBe('new-token');
  });

  it('login rejects non-admin user', async () => {
    mockedLogin.mockResolvedValue({
      user: householdUser,
      accessToken: 'hh-token',
      refreshToken: 'ref-token',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.login('+237600000001', 'password');
      }),
    ).rejects.toThrow('Access denied. Admin privileges required.');

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('logout clears state and storage', async () => {
    localStorage.setItem('access_token', 'tok-123');
    localStorage.setItem('user', JSON.stringify(adminUser));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => result.current.logout());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(mockedLogout).toHaveBeenCalledOnce();
  });

  it('throws if useAuth is used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });
});
