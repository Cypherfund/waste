import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfigPage from './ConfigPage';

const mockConfigs = [
  {
    id: 'c-1',
    key: 'assignment.max_radius_km',
    value: '10',
    category: 'assignment',
    dataType: 'number',
    description: 'Max radius (km) to search for eligible collectors',
    isFeatureFlag: false,
    updatedBy: null,
    updatedAt: '2026-04-20T10:00:00Z',
  },
  {
    id: 'c-2',
    key: 'earnings.base_rate',
    value: '500',
    category: 'earnings',
    dataType: 'number',
    description: 'Base earnings per job (XAF)',
    isFeatureFlag: false,
    updatedBy: null,
    updatedAt: '2026-04-20T10:00:00Z',
  },
  {
    id: 'c-3',
    key: 'feature.auto_assignment',
    value: 'true',
    category: 'feature',
    dataType: 'boolean',
    description: 'Enable automatic collector assignment',
    isFeatureFlag: true,
    updatedBy: null,
    updatedAt: '2026-04-20T10:00:00Z',
  },
];

vi.mock('../services/api/admin', () => ({
  configApi: {
    list: vi.fn(),
    update: vi.fn(),
  },
}));

import { configApi } from '../services/api/admin';
const mockedList = vi.mocked(configApi.list);
const mockedUpdate = vi.mocked(configApi.update);

describe('ConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedList.mockResolvedValue(mockConfigs as any);
  });

  it('renders config table after data loads', async () => {
    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('assignment.max_radius_km')).toBeInTheDocument();
    });

    expect(screen.getByText('earnings.base_rate')).toBeInTheDocument();
    expect(screen.getByText('feature.auto_assignment')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('shows empty state when no configs', async () => {
    mockedList.mockResolvedValue([]);
    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('No config values found.')).toBeInTheDocument();
    });
  });

  it('populates category filter dynamically', async () => {
    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('assignment.max_radius_km')).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue('All Categories');
    expect(select).toBeInTheDocument();

    // Check category options exist
    const options = select.querySelectorAll('option');
    const optionValues = Array.from(options).map((o) => o.textContent);
    expect(optionValues).toContain('assignment');
    expect(optionValues).toContain('earnings');
    expect(optionValues).toContain('feature');
  });

  it('enters edit mode on Edit click', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('assignment.max_radius_km')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    // Should show an input with current value
    const input = screen.getByDisplayValue('10');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('saves updated config value', async () => {
    const user = userEvent.setup();
    mockedUpdate.mockResolvedValue(undefined as any);

    render(<ConfigPage />);
    await waitFor(() => expect(screen.getByText('assignment.max_radius_km')).toBeInTheDocument());

    await user.click(screen.getAllByText('Edit')[0]);

    const input = screen.getByDisplayValue('10');
    await user.clear(input);
    await user.type(input, '15');
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('assignment.max_radius_km', '15');
    });

    expect(screen.getByText('"assignment.max_radius_km" updated successfully.')).toBeInTheDocument();
  });

  it('saves on Enter key', async () => {
    const user = userEvent.setup();
    mockedUpdate.mockResolvedValue(undefined as any);

    render(<ConfigPage />);
    await waitFor(() => expect(screen.getByText('earnings.base_rate')).toBeInTheDocument());

    await user.click(screen.getAllByText('Edit')[1]);

    const input = screen.getByDisplayValue('500');
    await user.clear(input);
    await user.type(input, '750{Enter}');

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('earnings.base_rate', '750');
    });
  });

  it('cancels edit on Escape key', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);

    await waitFor(() => expect(screen.getByText('assignment.max_radius_km')).toBeInTheDocument());

    await user.click(screen.getAllByText('Edit')[0]);
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    // Should exit edit mode — input gone, value text visible
    expect(screen.queryByDisplayValue('10')).not.toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('cancels edit on Cancel button click', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);

    await waitFor(() => expect(screen.getByText('assignment.max_radius_km')).toBeInTheDocument());

    await user.click(screen.getAllByText('Edit')[0]);
    await user.click(screen.getByText('Cancel'));

    expect(screen.queryByDisplayValue('10')).not.toBeInTheDocument();
  });

  it('filters by category', async () => {
    const user = userEvent.setup();
    render(<ConfigPage />);

    await waitFor(() => expect(screen.getByText('assignment.max_radius_km')).toBeInTheDocument());

    await user.selectOptions(screen.getByDisplayValue('All Categories'), 'earnings');

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalledWith('earnings');
    });
  });

  it('shows error on update failure', async () => {
    const user = userEvent.setup();
    mockedUpdate.mockRejectedValue({
      response: { data: { message: 'Invalid value' } },
    });

    render(<ConfigPage />);
    await waitFor(() => expect(screen.getByText('assignment.max_radius_km')).toBeInTheDocument());

    await user.click(screen.getAllByText('Edit')[0]);
    await user.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Error: Invalid value')).toBeInTheDocument();
    });
  });

  it('shows descriptions', async () => {
    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('Max radius (km) to search for eligible collectors')).toBeInTheDocument();
    });

    expect(screen.getByText('Base earnings per job (XAF)')).toBeInTheDocument();
  });

  it('shows error state with retry on load failure', async () => {
    mockedList.mockRejectedValue(new Error('DB down'));
    render(<ConfigPage />);

    await waitFor(() => {
      expect(screen.getByText('DB down')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
