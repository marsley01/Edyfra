"use client";

import { useState, useCallback, useRef } from "react";

type OptimisticState<T> = {
  data: T;
  pending: boolean;
  error: string | null;
};

type OptimisticAction<T> = (currentData: T) => T;

export function useOptimistic<T>(
  initialData: T,
): [OptimisticState<T>, (action: OptimisticAction<T>, commit: () => Promise<void>) => Promise<void>, () => void] {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    pending: false,
    error: null,
  });
  const rollbackRef = useRef<T>(initialData);

  const execute = useCallback(
    async (action: OptimisticAction<T>, commit: () => Promise<void>) => {
      rollbackRef.current = state.data;
      const optimisticData = action(state.data);
      setState({ data: optimisticData, pending: true, error: null });

      try {
        await commit();
        setState({ data: optimisticData, pending: false, error: null });
      } catch (err) {
        setState({
          data: rollbackRef.current,
          pending: false,
          error: err instanceof Error ? err.message : "An error occurred",
        });
      }
    },
    [state.data],
  );

  const reset = useCallback(() => {
    setState({ data: initialData, pending: false, error: null });
  }, [initialData]);

  return [state, execute, reset];
}
