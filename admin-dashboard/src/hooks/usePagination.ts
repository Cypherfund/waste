import { useState, useCallback } from 'react';

interface UsePaginationReturn {
  page: number;
  setPage: (page: number) => void;
  resetPage: () => void;
}

export function usePagination(initial = 1): UsePaginationReturn {
  const [page, setPage] = useState(initial);
  const resetPage = useCallback(() => setPage(1), []);
  return { page, setPage, resetPage };
}
