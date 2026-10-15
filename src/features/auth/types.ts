export type AppRole = "Admin" | "Viewer";

export interface UserProfile {
  displayName: string;
  username: string;
  role: AppRole;
}

export type AuthPermission =
  | "canViewDashboard"
  | "canViewAssets"
  | "canControlDevice"
  | "canManageSettings";

export type LoginResult =
  | { success: true }
  | { success: false; error: "invalid-credentials" };
