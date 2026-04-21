import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DisputesPage from './DisputesPage';

const mockDisputes = [
  {
    id: 'd-1',
    jobId: 'job-1',
    householdId: 'hh-1',
    reason: 'Collector did not show up',
    status: 'OPEN',
    adminNotes: null,
    resolvedBy: null,
    createdAt: '2026-04-18T10:00:00Z',
  },
  {
    id: 'd-2',
    jobId: 'job-2',
    householdId: 'hh-2',
    reason: 'Wrong waste collected',
    status: 'RESOLVED_ACCEPTED',
    adminNotes: 'Confirmed with household',
    resolvedBy: 'admin-1',
    createdAt: '2026-04-15T08:00:00Z',
  },
];

vi.mock('../services/api/admin', () => ({
  disputesApi: {
    list: vi.fn(),
    resolve: vi.fn(),
  },
}));

import { disputesApi } from '../services/api/admin';
const mockedList = vi.mocked(disputesApi.list);
const mockedResolve = vi.mocked(disputesApi.resolve);

describe('DisputesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue(mockDisputes as any);
  });

  it('renders dispute table after data loads', async () => {
    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('Collector did not show up')).toBeInTheDocument();
    });

    expect(screen.getByText('Wrong waste collected')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('RESOLVED_ACCEPTED')).toBeInTheDocument();
  });

  it('shows empty state when no disputes', async () => {
    mockedList.mockResolvedValue([]);
    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('No disputes found.')).toBeInTheDocument();
    });
  });

  it('shows Resolve button only for OPEN/UNDER_REVIEW disputes', async () => {
    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('Collector did not show up')).toBeInTheDocument();
    });

    const resolveButtons = screen.getAllByText('Resolve');
    expect(resolveButtons).toHaveLength(1); // only d-1 (OPEN)
  });

  it('shows admin notes for resolved disputes', async () => {
    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('"Confirmed with household"')).toBeInTheDocument();
    });
  });

  it('opens resolve modal on Resolve click', async () => {
    const user = userEvent.setup();
    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('Collector did not show up')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Resolve'));

    expect(screen.getByText('Resolve Dispute')).toBeInTheDocument();
    expect(screen.getByText(/Collector did not show up/)).toBeInTheDocument();
    expect(screen.getByText('Accept (Household is right)')).toBeInTheDocument();
    expect(screen.getByText('Reject (Collector is right)')).toBeInTheDocument();
  });

  it('calls resolve API and shows feedback', async () => {
    const user = userEvent.setup();
    mockedResolve.mockResolvedValue(undefined as any);

    render(<DisputesPage />);
    await waitFor(() => expect(screen.getByText('Collector did not show up')).toBeInTheDocument());

    await user.click(screen.getByText('Resolve'));
    await user.type(screen.getByPlaceholderText('Provide resolution notes...'), 'Verified with GPS data');

    // click the Resolve button in modal (not the table one)
    const modalButtons = screen.getAllByRole('button');
    const resolveBtn = modalButtons.find((b) => b.textContent === 'Resolve');
    await user.click(resolveBtn!);

    await waitFor(() => {
      expect(mockedResolve).toHaveBeenCalledWith('d-1', 'RESOLVED_ACCEPTED', 'Verified with GPS data');
    });

    expect(screen.getByText('Dispute resolved successfully.')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    render(<DisputesPage />);

    await waitFor(() => expect(screen.getByText('Disputes')).toBeInTheDocument());

    await user.selectOptions(screen.getByDisplayValue('All Statuses'), 'OPEN');

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalledWith('OPEN');
    });
  });

  it('shows error state with retry', async () => {
    mockedList.mockRejectedValue(new Error('Connection refused'));
    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('Connection refused')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
