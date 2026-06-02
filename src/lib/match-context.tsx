"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type MatchStep = "idle" | "tutor" | "peer" | "ai" | "matched";

interface MatchState {
  step: MatchStep;
  matchRequestId: string | null;
  timer: number;
  sessionId: string | null;
}

interface MatchContextValue extends MatchState {
  startMatch: (requestId: string) => void;
  cancelMatch: () => void;
  setStep: (step: MatchStep) => void;
}

const MatchContext = createContext<MatchContextValue | null>(null);

const STORAGE_KEY = "edyfra_match_state";
const TOTAL_TIME = 60;

function loadState(): MatchState {
  if (typeof window === "undefined") return { step: "idle", matchRequestId: null, timer: TOTAL_TIME, sessionId: null };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { step: "idle", matchRequestId: null, timer: TOTAL_TIME, sessionId: null };
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
  const [state, setState] = useState<MatchState>(loadState);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Poll for match status
  useEffect(() => {
    if (!state.matchRequestId || state.step === "matched") return;

    pollingRef.current = setInterval(async () => {
      try {
        const { checkMatchStatus } = await import("@/app/actions/match");
        const res = await checkMatchStatus(state.matchRequestId!);
        if (res.success && res.sessionId) {
          setState(prev => ({ ...prev, step: "matched", sessionId: res.sessionId ?? null }));
          toast.success("Match found! Redirecting...");
          setTimeout(() => {
            router.push(`/study-room/${res.sessionId}`);
            clearState();
          }, 1500);
        }
      } catch {}
    }, 3000);

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [state.matchRequestId, state.step, router]);

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
    setState({ step: "tutor", matchRequestId: requestId, timer: TOTAL_TIME, sessionId: null });
  }, []);

  const cancelMatch = useCallback(() => {
    clearState();
    setState({ step: "idle", matchRequestId: null, timer: TOTAL_TIME, sessionId: null });
  }, []);

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
