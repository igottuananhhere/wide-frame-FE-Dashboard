import type { AppRole, AuthPermission } from "./types";

const rolePermissions: Record<AppRole, Record<AuthPermission, boolean>> = {
  Admin: {
    canViewDashboard: true,
    canViewAssets: true,
    canControlDevice: true,
  },
  Viewer: {
    canViewDashboard: true,
    canViewAssets: true,
    canControlDevice: false,
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
