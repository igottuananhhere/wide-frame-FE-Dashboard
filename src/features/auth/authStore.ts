import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authenticateMockUser } from "./authService";
import type { AppRole, LoginResult, UserProfile } from "./types";

export const AUTH_SESSION_STORAGE_KEY = "ics-digital-twin-mock-auth";

export interface AuthState {
  user: UserProfile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
}

const initialAuthState = {
  user: null,
  role: null,
  isAuthenticated: false,
};

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
      logout: () => {
        set(initialAuthState);
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
    },
  ),
);
