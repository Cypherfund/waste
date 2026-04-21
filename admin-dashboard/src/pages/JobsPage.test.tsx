import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobsPage from './JobsPage';

const mockJobs = {
  data: [
    {
      id: 'job-1',
      householdId: 'hh-1',
      collectorId: null,
      status: 'REQUESTED',
      wasteType: 'ORGANIC',
      scheduledDate: '2026-04-25',
      scheduledTime: '09:00-11:00',
      address: '123 Main St',
      notes: 'Ring bell',
      locationLat: 4.04,
      locationLng: 9.69,
      createdAt: '2026-04-20T10:00:00Z',
    },
    {
      id: 'job-2',
      householdId: 'hh-2',
      collectorId: 'col-1',
      status: 'ASSIGNED',
      wasteType: 'RECYCLABLE',
      scheduledDate: '2026-04-26',
      scheduledTime: '14:00-16:00',
      address: null,
      notes: null,
      locationLat: null,
      locationLng: null,
      createdAt: '2026-04-20T12:00:00Z',
    },
  ],
  meta: { page: 1, limit: 20, total: 2, pages: 1 },
};

const mockCollectors = [
  { id: 'col-1', name: 'Collector A', phone: '+237611111111', role: 'COLLECTOR', isActive: true, avgRating: '4.0', totalCompleted: 5, createdAt: '', updatedAt: '' },
  { id: 'col-2', name: 'Collector B', phone: '+237622222222', role: 'COLLECTOR', isActive: true, avgRating: '3.5', totalCompleted: 3, createdAt: '', updatedAt: '' },
];

vi.mock('../services/api/admin', () => ({
  jobsApi: {
    list: vi.fn(),
    manualAssign: vi.fn(),
  },
  usersApi: {
    list: vi.fn(),
  },
}));

import { jobsApi, usersApi } from '../services/api/admin';
const mockedJobsList = vi.mocked(jobsApi.list);
const mockedManualAssign = vi.mocked(jobsApi.manualAssign);
const mockedUsersList = vi.mocked(usersApi.list);

describe('JobsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedJobsList.mockResolvedValue(mockJobs as any);
    mockedUsersList.mockResolvedValue(mockCollectors as any);
  });

  it('renders job table after data loads', async () => {
    render(<JobsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORGANIC')).toBeInTheDocument();
    });

    expect(screen.getByText('RECYCLABLE')).toBeInTheDocument();
    expect(screen.getByText('REQUESTED')).toBeInTheDocument();
    expect(screen.getByText('ASSIGNED')).toBeInTheDocument();
  });

  it('shows empty state when no jobs', async () => {
    mockedJobsList.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, pages: 0 } } as any);
    render(<JobsPage />);

    await waitFor(() => {
      expect(screen.getByText('No jobs found.')).toBeInTheDocument();
    });
  });

  it('opens job detail modal on Details click', async () => {
    const user = userEvent.setup();
    render(<JobsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORGANIC')).toBeInTheDocument();
    });

    const detailBtns = screen.getAllByText('Details');
    await user.click(detailBtns[0]);

    expect(screen.getByText('Job Details')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Ring bell')).toBeInTheDocument();
  });

  it('shows manual assignment section for REQUESTED jobs', async () => {
    const user = userEvent.setup();
    render(<JobsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORGANIC')).toBeInTheDocument();
    });

    await user.click(screen.getAllByText('Details')[0]); // job-1 is REQUESTED

    expect(screen.getByText('Manual Assignment')).toBeInTheDocument();
    expect(screen.getByText('Collector A (+237611111111)')).toBeInTheDocument();
    expect(screen.getByText('Collector B (+237622222222)')).toBeInTheDocument();
  });

  it('does NOT show manual assignment for non-REQUESTED jobs', async () => {
    const user = userEvent.setup();
    render(<JobsPage />);

    await waitFor(() => {
      expect(screen.getByText('RECYCLABLE')).toBeInTheDocument();
    });

    await user.click(screen.getAllByText('Details')[1]); // job-2 is ASSIGNED

    expect(screen.getByText('Job Details')).toBeInTheDocument();
    expect(screen.queryByText('Manual Assignment')).not.toBeInTheDocument();
  });

  it('calls manualAssign and shows feedback', async () => {
    const user = userEvent.setup();
    mockedManualAssign.mockResolvedValue(undefined as any);

    render(<JobsPage />);
    await waitFor(() => expect(screen.getByText('ORGANIC')).toBeInTheDocument());

    await user.click(screen.getAllByText('Details')[0]);
    await user.selectOptions(screen.getByRole('combobox'), 'col-2');
    await user.click(screen.getByText('Assign'));

    await waitFor(() => {
      expect(mockedManualAssign).toHaveBeenCalledWith('job-1', 'col-2');
    });

    expect(screen.getByText('Job assigned successfully.')).toBeInTheDocument();
  });

  it('shows error on failed assignment', async () => {
    const user = userEvent.setup();
    mockedManualAssign.mockRejectedValue({
      response: { data: { message: 'Collector not available' } },
    });

    render(<JobsPage />);
    await waitFor(() => expect(screen.getByText('ORGANIC')).toBeInTheDocument());

    await user.click(screen.getAllByText('Details')[0]);
    await user.selectOptions(screen.getByRole('combobox'), 'col-1');
    await user.click(screen.getByText('Assign'));

    await waitFor(() => {
      expect(screen.getByText('Collector not available')).toBeInTheDocument();
    });
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    render(<JobsPage />);

    await waitFor(() => expect(screen.getByText('ORGANIC')).toBeInTheDocument());

    const statusSelect = screen.getByDisplayValue('All Statuses');
    await user.selectOptions(statusSelect, 'REQUESTED');

    await waitFor(() => {
      expect(mockedJobsList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'REQUESTED' }),
      );
    });
  });

  it('shows error state with retry', async () => {
    mockedJobsList.mockRejectedValue(new Error('Server down'));
    render(<JobsPage />);

    await waitFor(() => {
      expect(screen.getByText('Server down')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
