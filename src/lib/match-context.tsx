"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast";

export type MatchStep = "idle" | "tutor" | "peer" | "ai" | "matched";

interface MatchState {
  step: MatchStep;
  matchRequestId: string | null;
  timer: number;
  sessionId: string | null;
  /** A tutor holds an exclusive offer for this request until this time. */
  offerExpiresAt?: string | null;
}

interface MatchContextValue extends MatchState {
  startMatch: (requestId: string) => void;
  cancelMatch: () => void;
  setStep: (step: MatchStep) => void;
}

const MatchContext = createContext<MatchContextValue | null>(null);

const STORAGE_KEY = "edyfra_match_state";
const TOTAL_TIME = 60;

const IDLE_STATE: MatchState = { step: "idle", matchRequestId: null, timer: TOTAL_TIME, sessionId: null };
const STEPS: readonly MatchStep[] = ["idle", "tutor", "peer", "ai", "matched"];

/** Saved state from localStorage, or null. Client-only: call from an effect. */
function loadSavedState(): MatchState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const s = JSON.parse(saved) as Partial<MatchState> | null;
    if (!s || !STEPS.includes(s.step as MatchStep) || s.step === "idle" || typeof s.matchRequestId !== "string") {
      return null;
    }
    return {
      step: s.step as MatchStep,
      matchRequestId: s.matchRequestId,
      timer: typeof s.timer === "number" ? s.timer : TOTAL_TIME,
      sessionId: typeof s.sessionId === "string" ? s.sessionId : null,
      offerExpiresAt: typeof s.offerExpiresAt === "string" ? s.offerExpiresAt : null,
    };
  } catch {
    return null;
  }
}

function saveState(state: MatchState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function MatchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Always start idle so the server render and the first client render agree
  // (reading localStorage in the initializer caused a hydration mismatch after
  // a reload mid-match); a saved search is restored right after mount.
  const [state, setState] = useState<MatchState>(IDLE_STATE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = loadSavedState();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore after hydration
    if (saved) setState(saved);
  }, []);

  // Persist state changes
  useEffect(() => {
    if (state.step !== "idle") saveState(state);
  }, [state]);

  // Timer countdown
  useEffect(() => {
    if (state.step === "idle" || state.step === "matched") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timer <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return prev;
        }
        return { ...prev, timer: prev.timer - 1 };
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.step]);

  // Poll for match status and advance matchmaking. The server is the source
  // of truth for the phase (tutor offer -> peer -> Mash AI) and for expiry;
  // the local countdown only drives the display between polls.
  useEffect(() => {
    if (!state.matchRequestId || state.step === "matched" || state.step === "idle") return;
    const requestId = state.matchRequestId;
    let cancelled = false;
    let inFlight = false;

    const poll = async () => {
      // STRICT RESOURCE MANAGEMENT: Pause polling if tab is hidden/inactive
      if (typeof document !== "undefined" && document.hidden) return;
      if (inFlight) return;
      inFlight = true;
      try {
        const { initiateAutoMatch } = await import("@/app/actions/match");
        const res = await initiateAutoMatch(requestId);
        if (cancelled) return;
        if (res.success && res.sessionId) {
          setState(prev => ({ ...prev, step: "matched", sessionId: res.sessionId ?? null, offerExpiresAt: null }));
          showSuccess("Match found!", { description: "Taking you there now." });
          setTimeout(() => {
            router.push(`/study-room/${res.sessionId}`);
            clearState();
          }, 1500);
          return;
        }
        if (!res.success && "gone" in res && res.gone) {
          clearState();
          setState({ step: "idle", matchRequestId: null, timer: TOTAL_TIME, sessionId: null, offerExpiresAt: null });
          showError({
            title: "Your match request ended",
            cause: res.error || "It expired or was cancelled.",
            fix: "Start a new search.",
          });
          return;
        }
        if (!res.success && "phase" in res && res.phase) {
          const phase = res.phase;
          const offerExpiresAt = "offerExpiresAt" in res ? (res.offerExpiresAt ?? null) : null;
          setState(prev => {
            if (prev.step === "matched" || prev.step === "idle") return prev;
            const step: MatchStep = phase === "tutor" ? "tutor" : phase === "peer" ? "peer" : "ai";
            if (prev.step === step && prev.offerExpiresAt === offerExpiresAt) return prev;
            return { ...prev, step, offerExpiresAt };
          });
        }
      } catch (err) {
        console.error("Polling matchmaking error:", err);
      } finally {
        inFlight = false;
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
    // Re-run only when the request changes or it gets matched — not on every
    // step change, which used to restart the interval and skip polls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.matchRequestId, state.step === "matched" || state.step === "idle", router]);

  // Auto-advance steps
  useEffect(() => {
    if (state.step !== "tutor" && state.step !== "peer") return;
    if (state.timer === 30 && state.step === "tutor") {
      setState(prev => ({ ...prev, step: "peer" }));
    }
    if (state.timer === 5 && state.step === "peer") {
      setState(prev => ({ ...prev, step: "ai" }));
    }
  }, [state.timer, state.step]);

  const startMatch = useCallback((requestId: string) => {
    setState({ step: "tutor", matchRequestId: requestId, timer: TOTAL_TIME, sessionId: null, offerExpiresAt: null });
  }, []);

  const cancelMatch = useCallback(() => {
    const requestId = state.matchRequestId;
    clearState();
    setState({ step: "idle", matchRequestId: null, timer: TOTAL_TIME, sessionId: null, offerExpiresAt: null });

    if (requestId) {
      import("@/app/actions/match").then(({ cancelMatchRequest }) => {
        cancelMatchRequest(requestId);
      }).catch(err => {
        console.error("Failed to cancel match request on server:", err);
      });
    }
  }, [state.matchRequestId]);

  const setStep = useCallback((step: MatchStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  return (
    <MatchContext.Provider value={{ ...state, startMatch, cancelMatch, setStep }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatch must be used within a MatchProvider");
  return ctx;
}
