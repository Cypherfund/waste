import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsync } from './useAsync';

describe('useAsync', () => {
  it('starts with loading=false, data=null, error=null when immediate=false', () => {
    const fn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsync(fn, false));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it('fetches data immediately by default', async () => {
    const fn = vi.fn().mockResolvedValue({ count: 42 });
    const { result } = renderHook(() => useAsync(fn));

    expect(fn).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ count: 42 });
    expect(result.current.error).toBeNull();
  });

  it('sets error on rejection', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useAsync(fn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Network error');
  });

  it('extracts error from axios response shape', async () => {
    const fn = vi.fn().mockRejectedValue({
      response: { data: { message: 'Unauthorized' } },
    });
    const { result } = renderHook(() => useAsync(fn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Unauthorized');
  });

  it('handles array error messages from axios', async () => {
    const fn = vi.fn().mockRejectedValue({
      response: { data: { message: ['Field is required', 'Invalid value'] } },
    });
    const { result } = renderHook(() => useAsync(fn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain('Field is required');
  });

  it('re-fetches data on run()', async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve(`result-${callCount}`);
    });

    const { result } = renderHook(() => useAsync(fn));
    await waitFor(() => expect(result.current.data).toBe('result-1'));

    act(() => result.current.run());
    await waitFor(() => expect(result.current.data).toBe('result-2'));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('clears previous error on re-run', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    const { result } = renderHook(() => useAsync(fn));
    await waitFor(() => expect(result.current.error).toBe('fail'));

    act(() => result.current.run());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.data).toBe('ok');
  });

  it('provides fallback error message', async () => {
    const fn = vi.fn().mockRejectedValue({});
    const { result } = renderHook(() => useAsync(fn));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('An error occurred');
  });
});
