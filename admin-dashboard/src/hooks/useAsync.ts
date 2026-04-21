import { useState, useCallback, useEffect } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  run: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, immediate = true): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    fn()
      .then((result) => {
        setData(result);
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.message || err?.message || 'An error occurred';
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      })
      .finally(() => setLoading(false));
  }, [fn]);

  useEffect(() => {
    if (immediate) run();
  }, [immediate, run]);

  return { data, loading, error, run };
}
