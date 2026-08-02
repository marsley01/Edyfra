import { create } from 'zustand';

export type MatchStep = 0 | 1 | 2 | 3;
// 0: Idle, 1: Tutor, 2: Peer, 3: AI

interface MatchState {
  isMatching: boolean;
  matchStep: MatchStep;
  timer: number;
  currentRequestId: string | null;
  formData: {
    subject: string;
    topic: string;
  };
  aiFallbackTriggered: boolean;

  setMatching: (isMatching: boolean) => void;
  setMatchStep: (step: MatchStep) => void;
  setTimer: (timer: number) => void;
  decrementTimer: () => void;
  setCurrentRequestId: (id: string | null) => void;
  setFormData: (data: { subject: string; topic: string }) => void;
  setAiFallbackTriggered: (triggered: boolean) => void;
  reset: () => void;
}

export const useMatchStore = create<MatchState>((set) => ({
  isMatching: false,
  matchStep: 0,
  timer: 90,
  currentRequestId: null,
  formData: { subject: "", topic: "" },
  aiFallbackTriggered: false,

  setMatching: (isMatching) => set({ isMatching }),
  setMatchStep: (step) => set({ matchStep: step }),
  setTimer: (timer) => set({ timer }),
  decrementTimer: () => set((state) => ({ timer: Math.max(0, state.timer - 1) })),
  setCurrentRequestId: (id) => set({ currentRequestId: id }),
  setFormData: (data) => set({ formData: data }),
  setAiFallbackTriggered: (triggered) => set({ aiFallbackTriggered: triggered }),
  reset: () => set({
    isMatching: false,
    matchStep: 0,
    timer: 90,
    currentRequestId: null,
    aiFallbackTriggered: false,
  }),
}));
