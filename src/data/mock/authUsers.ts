import type { UserProfile } from "../../features/auth/types";

export interface MockAuthUser extends UserProfile {
  password: string;
}

/** Development-only accounts. Never use these credentials in production. */
export const MOCK_AUTH_USERS: readonly MockAuthUser[] = [
  {
    displayName: "ICS Platform Administrator",
    username: "admin",
    password: "admin123",
    role: "Admin",
  },
  {
    displayName: "ICS Dashboard Viewer",
    username: "viewer",
    password: "viewer123",
    role: "Viewer",
  },
];
