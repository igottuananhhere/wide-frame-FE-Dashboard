import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authenticateMockUser } from "./authService";
import {
  DEFAULT_DEMO_ROLE,
  DEMO_ROLE_BYPASS_ENABLED,
  getDemoRoleProfile,
} from "./demoRoleMode";
import type { AppRole, LoginResult, UserProfile } from "./types";

export const AUTH_SESSION_STORAGE_KEY = "ics-digital-twin-mock-auth";

export interface AuthState {
  user: UserProfile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => LoginResult;
  selectDemoRole: (role: AppRole) => void;
  logout: () => void;
}

const unauthenticatedState = {
  user: null,
  role: null,
  isAuthenticated: false,
};

const defaultDemoState = {
  user: getDemoRoleProfile(DEFAULT_DEMO_ROLE),
  role: DEFAULT_DEMO_ROLE,
  isAuthenticated: true,
};

const initialAuthState = DEMO_ROLE_BYPASS_ENABLED
  ? defaultDemoState
  : unauthenticatedState;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialAuthState,
      login: (username, password) => {
        const user = authenticateMockUser(username, password);

        if (!user) {
          return { success: false, error: "invalid-credentials" };
        }

        set({ user, role: user.role, isAuthenticated: true });
        return { success: true };
      },
      selectDemoRole: (role) => {
        const user = getDemoRoleProfile(role);
        set({ user, role: user.role, isAuthenticated: true });
      },
      logout: () => {
        set(unauthenticatedState);
        sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      },
    }),
    {
      name: AUTH_SESSION_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState> | undefined;
        if (DEMO_ROLE_BYPASS_ENABLED && (!persisted?.isAuthenticated || !persisted?.role)) {
          return {
            ...currentState,
            ...defaultDemoState,
          };
        }
        return {
          ...currentState,
          ...persisted,
        };
      },
    },
  ),
);

