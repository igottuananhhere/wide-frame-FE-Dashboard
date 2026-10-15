import type { AppRole, AuthPermission } from "./types";

const rolePermissions: Record<AppRole, Record<AuthPermission, boolean>> = {
  Admin: {
    canViewDashboard: true,
    canViewAssets: true,
    canControlDevice: true,
    canManageSettings: true,
  },
  Viewer: {
    canViewDashboard: true,
    canViewAssets: true,
    canControlDevice: false,
    canManageSettings: false,
  },
};

export function hasPermission(
  role: AppRole | null,
  permission: AuthPermission,
): boolean {
  return role !== null && rolePermissions[role][permission];
}

export function canViewDashboard(role: AppRole | null): boolean {
  return hasPermission(role, "canViewDashboard");
}

export function canViewAssets(role: AppRole | null): boolean {
  return hasPermission(role, "canViewAssets");
}

export function canControlDevice(role: AppRole | null): boolean {
  return hasPermission(role, "canControlDevice");
}

export function canManageSettings(role: AppRole | null): boolean {
  return hasPermission(role, "canManageSettings");
}

export function getRolePermissions(role: AppRole | null): Record<AuthPermission, boolean> {
  if (!role) {
    return {
      canViewDashboard: false,
      canViewAssets: false,
      canControlDevice: false,
      canManageSettings: false,
    };
  }
  return { ...rolePermissions[role] };
}

export type AuthorizationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export function authorizeAction(
  role: AppRole | null,
  permission: AuthPermission,
): AuthorizationResult {
  if (!role) {
    return { allowed: false, reason: "Unauthenticated session cannot perform this action." };
  }
  if (!hasPermission(role, permission)) {
    return {
      allowed: false,
      reason: `Role "${role}" does not have "${permission}" permission.`,
    };
  }
  return { allowed: true };
}
