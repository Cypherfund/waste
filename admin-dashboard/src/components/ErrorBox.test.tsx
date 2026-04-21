import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ErrorBox from './ErrorBox';

describe('ErrorBox', () => {
  it('displays the error message', () => {
    render(<ErrorBox message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows Retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorBox message="Error" onRetry={onRetry} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('does not show Retry button when onRetry is not provided', () => {
    render(<ErrorBox message="Error" />);
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('calls onRetry when Retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorBox message="Error" onRetry={onRetry} />);

    await user.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
