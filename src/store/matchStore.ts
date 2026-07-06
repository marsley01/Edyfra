import { create } from 'zustand';

interface MatchState {
  isMatching: boolean;
  matchStep: number;
  timer: number;
  formData: { subject: string; topic: string };
  currentRequestId: string | null;
  setMatching: (isMatching: boolean) => void;
  setMatchStep: (step: number) => void;
  setTimer: (timer: number) => void;
  setFormData: (data: { subject: string; topic: string }) => void;
  setCurrentRequestId: (id: string | null) => void;
  reset: () => void;
}

const initialState = {
  isMatching: false,
  matchStep: 0,
  timer: 0,
  formData: { subject: "", topic: "" },
  currentRequestId: null,
};

export const useMatchStore = create<MatchState>((set) => ({
  ...initialState,
  setMatching: (isMatching) => set({ isMatching }),
  setMatchStep: (matchStep) => set({ matchStep }),
  setTimer: (timer) => set({ timer }),
  setFormData: (formData) => set({ formData }),
  setCurrentRequestId: (currentRequestId) => set({ currentRequestId }),
  reset: () => set(initialState),
}));
