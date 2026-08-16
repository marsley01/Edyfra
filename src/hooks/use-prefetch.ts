"use client";

import { useCallback, useRef } from "react";
import { localDB } from "@/lib/local-db";

/**
 * usePrefetch — Layer 4: silently prefetch tutor profiles on hover.
 *
 * Usage:
 *   const prefetch = usePrefetch();
 *   <TutorCard onMouseEnter={prefetch(`/api/python/tutors/${tutorId}`)} />
 *
 * The fetched data is written to IndexedDB so when the user clicks through,
 * the profile page loads from RAM with zero network cost.
 */

const DEBOUNCE_MS = 150;

// Track in-flight fetches to avoid duplicate requests
const inflight = new Set<string>();

export function usePrefetch() {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /**
   * Returns an onMouseEnter handler for the given tutor ID.
   * On hover: waits 150ms (debounce), then silently fetches the tutor profile.
   */
  const prefetchTutor = useCallback(
    (tutorId: string) => () => {
      // Cancel any existing timer for this ID
      const existing = timers.current.get(tutorId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        timers.current.delete(tutorId);

        // Already cached and fresh? Skip.
        const cached = await localDB.get<unknown>("tutors", tutorId);
        if (cached) return;

        // Already fetching? Skip.
        if (inflight.has(tutorId)) return;
        inflight.add(tutorId);

        try {
          // Use requestIdleCallback if available so we never compete with
          // active user interactions
          const doFetch = async () => {
            try {
              const res = await fetch(`/api/python/bookings/tutors/${tutorId}`, {
                signal: AbortSignal.timeout(5_000),
              });
              if (res.ok) {
                const data = await res.json();
                await localDB.set("tutors", tutorId, data);
              }
            } finally {
              inflight.delete(tutorId);
            }
          };

          if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(() => void doFetch(), { timeout: 3000 });
          } else {
            void doFetch();
          }
        } catch {
          inflight.delete(tutorId);
        }
      }, DEBOUNCE_MS);

      timers.current.set(tutorId, timer);
    },
    [],
  );

  /**
   * Prefetch any arbitrary API URL and store the result by a custom cache key.
   */
  const prefetchUrl = useCallback(
    (url: string, cacheStore: "tutors" | "bookings", cacheKey: string) =>
      () => {
        const existing = timers.current.get(cacheKey);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(async () => {
          timers.current.delete(cacheKey);
          if (inflight.has(cacheKey)) return;
          inflight.add(cacheKey);

          const doFetch = async () => {
            try {
              const cached = await localDB.get<unknown>(cacheStore, cacheKey);
              if (cached) return;

              const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
              if (res.ok) {
                const data = await res.json();
                await localDB.set(cacheStore, cacheKey, data);
              }
            } finally {
              inflight.delete(cacheKey);
            }
          };

          if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(() => void doFetch(), { timeout: 3000 });
          } else {
            void doFetch();
          }
        }, DEBOUNCE_MS);

        timers.current.set(cacheKey, timer);
      },
    [],
  );

  return { prefetchTutor, prefetchUrl };
}
