import { MOCK_AUTH_USERS } from "../../data/mock/authUsers";
import type { AppRole, UserProfile } from "./types";

/**
 * TEMPORARY DEMO ROLE ACCESS MODE (UI/UX REVIEW ONLY)
 * -----------------------------------------------------------------------------
 * Replaces the username/password login screen with instant 2-button role
 * selection (Admin / Viewer) and an in-header role switcher during UI/UX review.
 *
 * ARCHITECTURAL & SECURITY WARNING:
 * - Do NOT use client-selected demo roles to authorize real backend APIs or
 *   physical IoT device actuation.
 * - To restore the formal LoginPage with credential authentication, set
 *   `DEMO_ROLE_BYPASS_ENABLED = false` and remove `<DemoRoleSwitcher />`.
 */
export const DEMO_ROLE_BYPASS_ENABLED = true;
export const DEFAULT_DEMO_ROLE: AppRole = "Admin";

export const DEMO_ROLE_PROFILES: Readonly<Record<AppRole, UserProfile>> = {
  Admin: {
    displayName:
      MOCK_AUTH_USERS.find((account) => account.role === "Admin")?.displayName
      ?? "ICS Platform Administrator",
    username:
      MOCK_AUTH_USERS.find((account) => account.role === "Admin")?.username
      ?? "admin",
    role: "Admin",
  },
  Viewer: {
    displayName:
      MOCK_AUTH_USERS.find((account) => account.role === "Viewer")?.displayName
      ?? "ICS Dashboard Viewer",
    username:
      MOCK_AUTH_USERS.find((account) => account.role === "Viewer")?.username
      ?? "viewer",
    role: "Viewer",
  },
};

export function getDemoRoleProfile(role: AppRole): UserProfile {
  return DEMO_ROLE_PROFILES[role];
}

