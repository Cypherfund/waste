import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UsersPage from './UsersPage';

const mockUsers = [
  {
    id: 'u-1',
    name: 'Admin User',
    phone: '+237600000000',
    email: null,
    role: 'ADMIN',
    isActive: true,
    avgRating: '0.00',
    totalCompleted: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'u-2',
    name: 'Test Collector',
    phone: '+237600000001',
    email: null,
    role: 'COLLECTOR',
    isActive: true,
    avgRating: '4.50',
    totalCompleted: 12,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'u-3',
    name: 'Inactive User',
    phone: '+237600000002',
    email: null,
    role: 'HOUSEHOLD',
    isActive: false,
    avgRating: null,
    totalCompleted: 0,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

vi.mock('../services/api/admin', () => ({
  usersApi: {
    list: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1', name: 'Admin User', role: 'ADMIN' },
  }),
}));

import { usersApi } from '../services/api/admin';
const mockedList = vi.mocked(usersApi.list);
const mockedUpdateStatus = vi.mocked(usersApi.updateStatus);

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue(mockUsers as any);
  });

  it('shows spinner then renders user table', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Collector')).toBeInTheDocument();
    expect(screen.getByText('Inactive User')).toBeInTheDocument();
  });

  it('shows empty state when no users match', async () => {
    mockedList.mockResolvedValue([]);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('No users found.')).toBeInTheDocument();
    });
  });

  it('shows "You" label for the logged-in admin', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });

  it('shows Deactivate button for other active users', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Collector')).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByText('Deactivate');
    expect(deactivateButtons.length).toBeGreaterThan(0);
  });

  it('shows Activate button for inactive users', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Activate')).toBeInTheDocument();
    });
  });

  it('shows confirmation dialog on Deactivate click', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Collector')).toBeInTheDocument();
    });

    const deactivateBtn = screen.getAllByText('Deactivate')[0];
    await user.click(deactivateBtn);

    expect(screen.getByText('Deactivate User')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to deactivate/)).toBeInTheDocument();
  });

  it('calls updateStatus and refreshes on confirm', async () => {
    const user = userEvent.setup();
    mockedUpdateStatus.mockResolvedValue(undefined as any);

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Collector')).toBeInTheDocument();
    });

    await user.click(screen.getAllByText('Deactivate')[0]);
    await user.click(screen.getByText('Deactivate')); // confirm button in modal

    await waitFor(() => {
      expect(mockedUpdateStatus).toHaveBeenCalledWith('u-2', false);
    });

    expect(screen.getByText(/has been deactivated/)).toBeInTheDocument();
  });

  it('filters by role', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const roleSelect = screen.getByDisplayValue('All Roles');
    await user.selectOptions(roleSelect, 'COLLECTOR');

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'COLLECTOR' }),
      );
    });
  });

  it('displays avgRating correctly for string values', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('4.5')).toBeInTheDocument(); // Number("4.50").toFixed(1)
      expect(screen.getByText('0.0')).toBeInTheDocument(); // Number("0.00").toFixed(1)
    });
  });

  it('shows error state with retry on API failure', async () => {
    mockedList.mockRejectedValue(new Error('Network error'));
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
