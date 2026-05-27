import { useSyncExternalStore } from "react";

export type MatchStep = 0 | 1 | 2 | 3;

type MatchFormData = {
  subject: string;
  topic: string;
};

type MatchState = {
  isMatching: boolean;
  matchStep: MatchStep;
  timer: number;
  currentRequestId: string | null;
  formData: MatchFormData;
  aiFallbackTriggered: boolean;
  quoteIndex: number;
};

type MatchStore = MatchState & {
  setMatching: (isMatching: boolean) => void;
  setMatchStep: (step: MatchStep) => void;
  setTimer: (timer: number) => void;
  decrementTimer: () => void;
  setCurrentRequestId: (id: string | null) => void;
  setFormData: (data: MatchFormData) => void;
  setAiFallbackTriggered: (triggered: boolean) => void;
  setQuoteIndex: (index: number | ((prev: number) => number)) => void;
  reset: () => void;
};

const DEFAULT_FORM_DATA: MatchFormData = {
  subject: "",
  topic: "",
};

const listeners = new Set<() => void>();

let state: MatchState = {
  isMatching: false,
  matchStep: 0,
  timer: 90,
  currentRequestId: null,
  formData: DEFAULT_FORM_DATA,
  aiFallbackTriggered: false,
  quoteIndex: 0,
};

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(update: Partial<MatchState> | ((prev: MatchState) => Partial<MatchState>)) {
  const patch = typeof update === "function" ? update(state) : update;
  state = { ...state, ...patch };
  emit();
}

function createStoreSnapshot(): MatchStore {
  return {
    ...state,
    setMatching: (isMatching) => setState({ isMatching }),
    setMatchStep: (matchStep) => setState({ matchStep }),
    setTimer: (timer) => setState({ timer }),
    decrementTimer: () => setState((prev) => ({ timer: Math.max(0, prev.timer - 1) })),
    setCurrentRequestId: (currentRequestId) => setState({ currentRequestId }),
    setFormData: (formData) => setState({ formData }),
    setAiFallbackTriggered: (aiFallbackTriggered) => setState({ aiFallbackTriggered }),
    setQuoteIndex: (quoteIndex) =>
      setState((prev) => ({
        quoteIndex: typeof quoteIndex === "function" ? quoteIndex(prev.quoteIndex) : quoteIndex,
      })),
    reset: () =>
      setState({
        isMatching: false,
        matchStep: 0,
        timer: 90,
        currentRequestId: null,
        formData: DEFAULT_FORM_DATA,
        aiFallbackTriggered: false,
        quoteIndex: 0,
      }),
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMatchStore() {
  return useSyncExternalStore(subscribe, createStoreSnapshot, createStoreSnapshot);
}
