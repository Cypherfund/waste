import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FraudFlagsPage from './FraudFlagsPage';

const mockFlags = [
  {
    id: 'f-1',
    jobId: 'job-1',
    collectorId: 'col-1',
    type: 'FAST_COMPLETION',
    severity: 'MEDIUM',
    status: 'OPEN',
    details: { durationMinutes: 2.5, thresholdMinutes: 5 },
    reviewNotes: null,
    reviewedBy: null,
    createdAt: '2026-04-19T10:00:00Z',
  },
  {
    id: 'f-2',
    jobId: 'job-2',
    collectorId: 'col-2',
    type: 'GPS_MISMATCH',
    severity: 'HIGH',
    status: 'CONFIRMED',
    details: { distanceKm: 1.2, thresholdKm: 0.5 },
    reviewNotes: 'Verified mismatch',
    reviewedBy: 'admin-1',
    createdAt: '2026-04-17T08:00:00Z',
  },
];

vi.mock('../services/api/admin', () => ({
  fraudApi: {
    list: vi.fn(),
    review: vi.fn(),
  },
}));

import { fraudApi } from '../services/api/admin';
const mockedList = vi.mocked(fraudApi.list);
const mockedReview = vi.mocked(fraudApi.review);

describe('FraudFlagsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue(mockFlags as any);
  });

  it('renders fraud flags table after data loads', async () => {
    render(<FraudFlagsPage />);

    await waitFor(() => {
      expect(screen.getByText('FAST COMPLETION')).toBeInTheDocument();
    });

    expect(screen.getByText('GPS MISMATCH')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('shows empty state when no flags', async () => {
    mockedList.mockResolvedValue([]);
    render(<FraudFlagsPage />);

    await waitFor(() => {
      expect(screen.getByText('No fraud flags found.')).toBeInTheDocument();
    });
  });

  it('shows Review button only for OPEN flags', async () => {
    render(<FraudFlagsPage />);

    await waitFor(() => {
      expect(screen.getByText('FAST COMPLETION')).toBeInTheDocument();
    });

    const reviewButtons = screen.getAllByText('Review');
    expect(reviewButtons).toHaveLength(1); // only f-1 (OPEN)
  });

  it('shows review notes for reviewed flags', async () => {
    render(<FraudFlagsPage />);

    await waitFor(() => {
      expect(screen.getByText('"Verified mismatch"')).toBeInTheDocument();
    });
  });

  it('opens review modal with flag details', async () => {
    const user = userEvent.setup();
    render(<FraudFlagsPage />);

    await waitFor(() => expect(screen.getByText('FAST COMPLETION')).toBeInTheDocument());

    await user.click(screen.getByText('Review'));

    expect(screen.getByText('Review Fraud Flag')).toBeInTheDocument();
    expect(screen.getByText('Confirm (Fraud is real)')).toBeInTheDocument();
    expect(screen.getByText('Dismiss (False positive)')).toBeInTheDocument();
    expect(screen.getByText('Details JSON')).toBeInTheDocument();
  });

  it('calls review API and shows feedback', async () => {
    const user = userEvent.setup();
    mockedReview.mockResolvedValue(undefined as any);

    render(<FraudFlagsPage />);
    await waitFor(() => expect(screen.getByText('FAST COMPLETION')).toBeInTheDocument());

    await user.click(screen.getByText('Review'));
    await user.type(screen.getByPlaceholderText('Provide review notes...'), 'Confirmed by inspection');
    await user.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(mockedReview).toHaveBeenCalledWith('f-1', 'CONFIRMED', 'Confirmed by inspection');
    });

    expect(screen.getByText('Fraud flag reviewed successfully.')).toBeInTheDocument();
  });

  it('can dismiss a flag', async () => {
    const user = userEvent.setup();
    mockedReview.mockResolvedValue(undefined as any);

    render(<FraudFlagsPage />);
    await waitFor(() => expect(screen.getByText('FAST COMPLETION')).toBeInTheDocument());

    await user.click(screen.getByText('Review'));

    // Change resolution to DISMISSED
    const select = screen.getByDisplayValue('Confirm (Fraud is real)');
    await user.selectOptions(select, 'DISMISSED');

    await user.click(screen.getByText('Submit Review'));

    await waitFor(() => {
      expect(mockedReview).toHaveBeenCalledWith('f-1', 'DISMISSED', '');
    });
  });

  it('filters by status and severity', async () => {
    const user = userEvent.setup();
    render(<FraudFlagsPage />);

    await waitFor(() => expect(screen.getByText('Fraud Flags')).toBeInTheDocument());

    await user.selectOptions(screen.getByDisplayValue('All Statuses'), 'OPEN');

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'OPEN' }),
      );
    });

    await user.selectOptions(screen.getByDisplayValue('All Severities'), 'HIGH');

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'HIGH' }),
      );
    });
  });

  it('shows error state with retry', async () => {
    mockedList.mockRejectedValue(new Error('Timeout'));
    render(<FraudFlagsPage />);

    await waitFor(() => {
      expect(screen.getByText('Timeout')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
