"use client";

import { useRef, useCallback, useEffect, useState } from "react";

export interface StudentContext {
  subject?: string;
  educationLevel?: string;
}

export interface TutorCandidate {
  id: string;
  subjects?: string[];
  rating?: number;
  currentActiveSessions?: number;
  maxConcurrentSessions?: number;
  educationLevels?: string[];
  responseRate?: number;
  hourlyRate?: number;
  [key: string]: unknown;
}

export interface MatchFilters {
  subject?: string;
  educationLevel?: string;
  maxPrice?: number;
  minRating?: number;
}

interface WorkerState {
  isRunning: boolean;
  error: string | null;
}

/**
 * useMatchingWorker — Layer 3: off-main-thread tutor ranking.
 *
 * Usage:
 *   const { rankTutors, filterTutors, isRunning } = useMatchingWorker();
 *   const ranked = await rankTutors(candidates, { subject: "Mathematics" });
 */
export function useMatchingWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<WorkerState>({
    isRunning: false,
    error: null,
  });

  // Lazy-init the worker on first use
  const getWorker = useCallback((): Worker | null => {
    if (typeof window === "undefined") return null;
    if (!window.Worker) return null;

    if (!workerRef.current) {
      try {
        workerRef.current = new Worker("/workers/matching.worker.js");
      } catch {
        console.warn("[useMatchingWorker] Failed to create worker");
        return null;
      }
    }
    return workerRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  /**
   * Rank tutor candidates off the main thread.
   * Falls back to synchronous sort if Worker is unavailable.
   */
  const rankTutors = useCallback(
    (
      candidates: TutorCandidate[],
      student: StudentContext,
    ): Promise<TutorCandidate[]> => {
      const worker = getWorker();

      if (!worker) {
        // Fallback: sort by rating on the main thread
        return Promise.resolve(
          [...candidates].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
        );
      }

      return new Promise((resolve, reject) => {
        setState({ isRunning: true, error: null });

        const handler = (event: MessageEvent) => {
          if (event.data.type === "RESULT") {
            worker.removeEventListener("message", handler);
            setState({ isRunning: false, error: null });
            resolve(event.data.payload.ranked);
          } else if (event.data.type === "ERROR") {
            worker.removeEventListener("message", handler);
            setState({ isRunning: false, error: event.data.payload.message });
            // Fall back to client-side sort on error
            resolve(
              [...candidates].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
            );
          }
        };

        worker.addEventListener("message", handler);
        worker.postMessage({ type: "RANK", payload: { candidates, student } });
      });
    },
    [getWorker],
  );

  /**
   * Filter tutor candidates off the main thread.
   */
  const filterTutors = useCallback(
    (
      candidates: TutorCandidate[],
      filters: MatchFilters,
    ): Promise<TutorCandidate[]> => {
      const worker = getWorker();

      if (!worker) {
        // Fallback: filter synchronously
        return Promise.resolve(
          candidates.filter((c) => {
            if (filters.subject && c.subjects) {
              return c.subjects.some((s) =>
                s.toLowerCase().includes((filters.subject ?? "").toLowerCase()),
              );
            }
            return true;
          }),
        );
      }

      return new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
          if (event.data.type === "FILTER_RESULT") {
            worker.removeEventListener("message", handler);
            resolve(event.data.payload.filtered);
          } else if (event.data.type === "ERROR") {
            worker.removeEventListener("message", handler);
            resolve(candidates); // fail open
          }
        };

        worker.addEventListener("message", handler);
        worker.postMessage({ type: "FILTER", payload: { candidates, filters } });
      });
    },
    [getWorker],
  );

  return {
    rankTutors,
    filterTutors,
    isRunning: state.isRunning,
    error: state.error,
  };
}
