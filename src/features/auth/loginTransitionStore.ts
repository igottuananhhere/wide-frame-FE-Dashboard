import { create } from "zustand";

interface LoginTransitionState {
  isTransitioning: boolean;
  begin: () => void;
  finish: () => void;
}

export const useLoginTransitionStore = create<LoginTransitionState>((set) => ({
  isTransitioning: false,
  begin: () => set({ isTransitioning: true }),
  finish: () => set({ isTransitioning: false }),
}));
