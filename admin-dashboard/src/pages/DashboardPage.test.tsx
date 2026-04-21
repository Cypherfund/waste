import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from './DashboardPage';

const mockStats = {
  totalUsers: 100,
  totalHouseholds: 70,
  totalCollectors: 25,
  totalJobs: 300,
  activeJobs: 15,
  completedJobs: 250,
  cancelledJobs: 10,
  flaggedCollectors: 2,
  totalDisputes: 8,
  openDisputes: 3,
  avgRating: 4.2,
  avgCompletionTimeMinutes: 35,
  earningsTotal: 150000,
  earningsPending: 25000,
  jobsByStatus: { REQUESTED: 5, ASSIGNED: 4, IN_PROGRESS: 6, COMPLETED: 250 },
};

vi.mock('../services/api/admin', () => ({
  statsApi: {
    get: vi.fn(),
  },
}));

import { statsApi } from '../services/api/admin';
const mockedGet = vi.mocked(statsApi.get);

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows spinner while loading', () => {
    mockedGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<DashboardPage />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('displays stats cards after data loads', async () => {
    mockedGet.mockResolvedValue(mockStats);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('100')).toBeInTheDocument(); // totalUsers
    expect(screen.getByText('25')).toBeInTheDocument(); // totalCollectors
    expect(screen.getByText('300')).toBeInTheDocument(); // totalJobs
    expect(screen.getByText('15')).toBeInTheDocument(); // activeJobs
    expect(screen.getByText('250')).toBeInTheDocument(); // completedJobs
    expect(screen.getByText('3 / 8')).toBeInTheDocument(); // open/total disputes
    expect(screen.getByText('4.2')).toBeInTheDocument(); // avgRating
    expect(screen.getByText('35')).toBeInTheDocument(); // avgCompletionTime
  });

  it('displays jobs by status breakdown', async () => {
    mockedGet.mockResolvedValue(mockStats);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Jobs by Status')).toBeInTheDocument();
    });

    expect(screen.getByText('REQUESTED')).toBeInTheDocument();
    expect(screen.getByText('ASSIGNED')).toBeInTheDocument();
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
  });

  it('shows error with retry on failure', async () => {
    mockedGet.mockRejectedValue(new Error('Server error'));
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
