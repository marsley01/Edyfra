"use client";

import { useState, useCallback, useMemo } from "react";

interface UsePaginationReturn {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setTotal: (total: number) => void;
  setLimit: (limit: number) => void;
  reset: () => void;
  isFirstPage: boolean;
  isLastPage: boolean;
}

export function usePagination(initialPage = 1, initialLimit = 20): UsePaginationReturn {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [total, setTotalState] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback(
    (newPage: number) => {
      setPage(Math.max(1, Math.min(newPage, totalPages)));
    },
    [totalPages],
  );

  const setTotal = useCallback((newTotal: number) => {
    setTotalState(newTotal);
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setPage(1);
    setTotalState(0);
  }, []);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    goToPage,
    setTotal,
    setLimit,
    reset,
    isFirstPage,
    isLastPage,
  };
}
