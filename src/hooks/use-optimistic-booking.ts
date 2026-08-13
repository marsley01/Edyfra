"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export type BookingStatus =
  | "idle"
  | "pending"     // local optimistic update applied
  | "confirmed"   // server confirmed
  | "failed";     // rolled back

export interface OptimisticBooking {
  id: string;
  tutorId: string;
  subject: string;
  topic?: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  status: "pending";
  createdAt: string;
  _optimistic: true;
}

export interface BookingParams {
  tutorId: string;
  subject: string;
  topic?: string;
  educationLevel?: string;
  date: string;
  startTime: string;
  durationMinutes: number;
}

interface UseOptimisticBookingResult {
  createBooking: (params: BookingParams) => Promise<{ bookingId: string } | null>;
  optimisticBookings: OptimisticBooking[];
  bookingStatus: BookingStatus;
}

/**
 * useOptimisticBooking — Layer 4: optimistic UI for booking creation.
 *
 * When a student submits a booking:
 *   1. Immediately adds an optimistic booking entry to the local list (feels instant)
 *   2. Fires the real API request in the background
 *   3. On success: replaces the optimistic entry with the real one from the server
 *   4. On failure: removes the optimistic entry and shows a rollback toast
 *
 * Usage:
 *   const { createBooking, optimisticBookings, bookingStatus } = useOptimisticBooking();
 */
export function useOptimisticBooking(): UseOptimisticBookingResult {
  const [optimisticBookings, setOptimisticBookings] = useState<OptimisticBooking[]>([]);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const createBooking = useCallback(
    async (params: BookingParams): Promise<{ bookingId: string } | null> => {
      // ── 1. Apply optimistic update immediately ───────────────────────────────
      const tempId = `optimistic-${Date.now()}`;
      const optimistic: OptimisticBooking = {
        id: tempId,
        tutorId: params.tutorId,
        subject: params.subject,
        topic: params.topic,
        date: params.date,
        startTime: params.startTime,
        durationMinutes: params.durationMinutes,
        status: "pending",
        createdAt: new Date().toISOString(),
        _optimistic: true,
      };

      setOptimisticBookings((prev) => [optimistic, ...prev]);
      setBookingStatus("pending");

      // ── 2. Fire real API request ─────────────────────────────────────────────
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/python/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || "Booking failed");
        }

        const data = await res.json() as { bookingId: string };

        // ── 3. Success: remove optimistic placeholder ───────────────────────────
        setOptimisticBookings((prev) => prev.filter((b) => b.id !== tempId));
        setBookingStatus("confirmed");

        return { bookingId: data.bookingId };
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return null;

        // ── 4. Failure: rollback optimistic update ──────────────────────────────
        setOptimisticBookings((prev) => prev.filter((b) => b.id !== tempId));
        setBookingStatus("failed");

        toast.error("Booking failed — please try again", {
          description: err instanceof Error ? err.message : "Network error",
          action: {
            label: "Retry",
            onClick: () => void createBooking(params),
          },
        });

        return null;
      }
    },
    [],
  );

  return { createBooking, optimisticBookings, bookingStatus };
}
