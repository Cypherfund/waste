import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppUpdatesPage from './AppUpdatesPage';

const mockVersions = [
  {
    id: 1,
    platform: 'ANDROID',
    appType: 'HOUSEHOLD',
    versionName: '1.2.0',
    buildNumber: 50,
    minSupportedBuild: 40,
    latestBuild: 50,
    updateType: 'OPTIONAL',
    title: 'Update Available',
    message: 'Bug fixes and improvements.',
    storeUrl: 'https://play.google.com/store',
    releaseNotes: 'Bug fixes',
    isActive: true,
    publishedAt: '2026-05-01T10:00:00Z',
    createdAt: '2026-04-30T10:00:00Z',
  },
  {
    id: 2,
    platform: 'IOS',
    appType: 'COLLECTOR',
    versionName: '2.0.0',
    buildNumber: 100,
    minSupportedBuild: 90,
    latestBuild: 100,
    updateType: 'FORCE',
    title: 'Update Required',
    message: 'Critical security update.',
    storeUrl: 'https://apps.apple.com/app',
    releaseNotes: 'Security patch',
    isActive: false,
    publishedAt: null,
    createdAt: '2026-05-02T10:00:00Z',
  },
];

vi.mock('../services/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import client from '../services/api/client';
const mockedGet = vi.mocked(client.get);
const mockedPost = vi.mocked(client.post);
const mockedPatch = vi.mocked(client.patch);

describe('AppUpdatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue({ data: mockVersions } as any);
  });

  // ─── Rendering ─────────────────────────────────────────────────

  it('shows spinner while loading', () => {
    mockedGet.mockReturnValue(new Promise(() => {})); // never resolves
    render(<AppUpdatesPage />);
    // Spinner renders a spinning div — check it exists via class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('renders version list after load', async () => {
    render(<AppUpdatesPage />);

    // Version is rendered as "v1.2.0 (build 50) · min: 40"
    await waitFor(() => {
      expect(screen.getByText(/v1\.2\.0/)).toBeInTheDocument();
    });

    expect(screen.getByText(/v2\.0\.0/)).toBeInTheDocument();
    // Platform/AppType shown as "ANDROID / HOUSEHOLD"
    expect(screen.getByText('ANDROID / HOUSEHOLD')).toBeInTheDocument();
    expect(screen.getByText('IOS / COLLECTOR')).toBeInTheDocument();
  });

  it('shows empty state when no records', async () => {
    mockedGet.mockResolvedValue({ data: [] } as any);
    render(<AppUpdatesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no app update records yet/i)).toBeInTheDocument();
    });
  });

  it('shows error state on load failure', async () => {
    mockedGet.mockRejectedValue(new Error('Network error'));
    render(<AppUpdatesPage />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  // ─── Create form ────────────────────────────────────────────────

  it('opens create form on "New Update Record" click', async () => {
    const user = userEvent.setup();
    render(<AppUpdatesPage />);

    await waitFor(() => screen.getByText(/v1\.2\.0/));

    await user.click(screen.getByText('New Update Record'));

    expect(screen.getByText('Create Update Record')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. 1.1.0')).toBeInTheDocument();
  });

  it('creates a new record on form submit', async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue({ data: { ...mockVersions[0], id: 3 } } as any);

    render(<AppUpdatesPage />);
    await waitFor(() => screen.getByText(/v1\.2\.0/));

    await user.click(screen.getByText('New Update Record'));

    // Fill all required fields
    await user.type(screen.getByPlaceholderText('e.g. 1.1.0'), '3.0.0');
    await user.type(screen.getByPlaceholderText('e.g. Update Required'), 'New Release');
    await user.type(
      screen.getByPlaceholderText('Shown to users in the update prompt'),
      'Please update to get the latest features.',
    );

    // Submit button text is 'Create' when creating new
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith(
        '/app-updates',
        expect.objectContaining({ versionName: '3.0.0' }),
      );
    });

    expect(screen.getByText('Record created.')).toBeInTheDocument();
  });

  it('shows error feedback on save failure', async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue({
      response: { data: { message: 'Validation failed' } },
    });

    render(<AppUpdatesPage />);
    await waitFor(() => screen.getByText(/v1\.2\.0/));

    await user.click(screen.getByText('New Update Record'));

    // Fill required fields so the form actually submits
    await user.type(screen.getByPlaceholderText('e.g. 1.1.0'), '1.0.0');
    await user.type(screen.getByPlaceholderText('e.g. Update Required'), 'Title');
    await user.type(
      screen.getByPlaceholderText('Shown to users in the update prompt'),
      'Message',
    );

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(screen.getByText('Validation failed')).toBeInTheDocument();
    });
  });

  // ─── Send Notification (requires expanding row first) ──────────

  it('sends notification and shows success feedback', async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue({ data: { sent: 42, failed: 1 } } as any);

    render(<AppUpdatesPage />);
    await waitFor(() => screen.getByText(/v1\.2\.0/));

    // Expand the first row to reveal action buttons
    const expandBtns = document.querySelectorAll('button[class*="text-gray-400"]');
    await user.click(expandBtns[0] as HTMLElement);

    await waitFor(() => screen.getByText('Send Notification'));
    await user.click(screen.getAllByText('Send Notification')[0]);

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/app-updates/1/send-notification');
    });

    expect(screen.getByText(/42 users/i)).toBeInTheDocument();
  });

  it('shows error feedback when send notification fails', async () => {
    const user = userEvent.setup();
    mockedPost.mockRejectedValue(new Error('FCM error'));

    render(<AppUpdatesPage />);
    await waitFor(() => screen.getByText(/v1\.2\.0/));

    const expandBtns = document.querySelectorAll('button[class*="text-gray-400"]');
    await user.click(expandBtns[0] as HTMLElement);

    await waitFor(() => screen.getByText('Send Notification'));
    await user.click(screen.getAllByText('Send Notification')[0]);

    await waitFor(() => {
      expect(screen.getByText('Failed to send notification.')).toBeInTheDocument();
    });
  });

  // ─── Publish / Deactivate ──────────────────────────────────────

  it('publishes an inactive record and shows success feedback', async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValue({ data: { ...mockVersions[1], isActive: true } } as any);

    render(<AppUpdatesPage />);
    await waitFor(() => screen.getByText(/v2\.0\.0/));

    // Expand the second row (id=2, isActive=false) to reveal Publish button
    const expandBtns = document.querySelectorAll('button[class*="text-gray-400"]');
    await user.click(expandBtns[1] as HTMLElement);

    await waitFor(() => screen.getByText('Publish'));
    await user.click(screen.getByText('Publish'));

    await waitFor(() => {
      expect(mockedPost).toHaveBeenCalledWith('/app-updates/2/publish');
    });

    expect(screen.getByText('Published and activated.')).toBeInTheDocument();
  });

  // ─── Edit form ──────────────────────────────────────────────────

  it('populates form with existing record on edit', async () => {
    const user = userEvent.setup();
    render(<AppUpdatesPage />);

    await waitFor(() => screen.getByText(/v1\.2\.0/));

    // Expand the first row to reveal Edit button
    const expandBtns = document.querySelectorAll('button[class*="text-gray-400"]');
    await user.click(expandBtns[0] as HTMLElement);

    await waitFor(() => screen.getByText('Edit'));
    await user.click(screen.getAllByText('Edit')[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('1.2.0')).toBeInTheDocument();
    });
  });

  it('submits PATCH on edit form save', async () => {
    const user = userEvent.setup();
    mockedPatch.mockResolvedValue({ data: mockVersions[0] } as any);

    render(<AppUpdatesPage />);
    await waitFor(() => screen.getByText(/v1\.2\.0/));

    // Expand row 1 and click Edit
    const expandBtns = document.querySelectorAll('button[class*="text-gray-400"]');
    await user.click(expandBtns[0] as HTMLElement);
    await waitFor(() => screen.getByText('Edit'));
    await user.click(screen.getAllByText('Edit')[0]);

    await waitFor(() => screen.getByDisplayValue('1.2.0'));

    const versionInput = screen.getByDisplayValue('1.2.0');
    await user.clear(versionInput);
    await user.type(versionInput, '1.3.0');

    // Submit button text is 'Save Changes' when editing
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith(
        '/app-updates/1',
        expect.objectContaining({ versionName: '1.3.0' }),
      );
    });

    expect(screen.getByText('Record updated.')).toBeInTheDocument();
  });
});
