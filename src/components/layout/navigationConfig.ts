import {
  AlertTriangle,
  BarChart3,
  Box,
  Cpu,
  LayoutDashboard,
  Package,
  Settings,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { hasPermission } from "../../features/auth/permissions";
import type { AppRole, AuthPermission } from "../../features/auth/types";

export type NavigationBadgeKey = "unresolvedAlerts";

export type NavigationItemId =
  | "overview"
  | "energy"
  | "environment"
  | "analytics"
  | "iot-devices"
  | "alerts"
  | "assets"
  | "settings"
  | "digital-twin-3d";

export interface NavigationItemConfig {
  id: NavigationItemId;
  label: string;
  englishLabel: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  preserveFloorScope?: boolean;
  requiredPermission?: AuthPermission;
  badgeKey?: NavigationBadgeKey;
}

export interface NavigationGroupConfig {
  id: string;
  title: string;
  items: readonly NavigationItemConfig[];
}

export const NAVIGATION_GROUPS: readonly NavigationGroupConfig[] = [
  {
    id: "overview-group",
    title: "OVERVIEW",
    items: [
      {
        id: "overview",
        label: "Tổng quan",
        englishLabel: "Overview",
        to: "/dashboard/overview",
        icon: LayoutDashboard,
        end: true,
        preserveFloorScope: false,
        requiredPermission: "canViewDashboard",
      },
    ],
  },
  {
    id: "monitoring-group",
    title: "MONITORING",
    items: [
      {
        id: "energy",
        label: "Năng lượng",
        englishLabel: "Energy",
        to: "/dashboard/energy",
        icon: Zap,
        preserveFloorScope: true,
        requiredPermission: "canViewDashboard",
      },
      {
        id: "environment",
        label: "Môi trường",
        englishLabel: "Environment",
        to: "/dashboard/environment",
        icon: Wind,
        preserveFloorScope: true,
        requiredPermission: "canViewDashboard",
      },
      {
        id: "analytics",
        label: "Phân tích",
        englishLabel: "Analytics",
        to: "/dashboard/analytics",
        icon: BarChart3,
        preserveFloorScope: true,
        requiredPermission: "canViewDashboard",
      },
      {
        id: "iot-devices",
        label: "Thiết bị",
        englishLabel: "IoT Devices",
        to: "/dashboard/devices",
        icon: Cpu,
        preserveFloorScope: true,
        requiredPermission: "canViewDashboard",
      },
    ],
  },
  {
    id: "operation-group",
    title: "OPERATION",
    items: [
      {
        id: "alerts",
        label: "Sự cố",
        englishLabel: "Alerts",
        to: "/dashboard/incidents",
        icon: AlertTriangle,
        preserveFloorScope: true,
        badgeKey: "unresolvedAlerts",
        requiredPermission: "canViewDashboard",
      },
      {
        id: "assets",
        label: "Tài sản & bảo trì",
        englishLabel: "Assets",
        to: "/dashboard/assets",
        icon: Package,
        preserveFloorScope: true,
        requiredPermission: "canViewAssets",
      },
      {
        id: "settings",
        label: "Cài đặt",
        englishLabel: "Settings",
        to: "/dashboard/settings",
        icon: Settings,
        preserveFloorScope: false,
        requiredPermission: "canManageSettings",
      },
    ],
  },
  {
    id: "digital-twin-group",
    title: "DIGITAL TWIN",
    items: [
      {
        id: "digital-twin-3d",
        label: "Mô hình 3D",
        englishLabel: "Digital Twin 3D",
        to: "/dashboard/digital-twin",
        icon: Box,
        preserveFloorScope: true,
        requiredPermission: "canViewDashboard",
      },
    ],
  },
];

export function getNavigationGroupsForRole(
  role: AppRole | null,
): NavigationGroupConfig[] {
  const effectiveRole: AppRole = role ?? "Viewer";
  return NAVIGATION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.requiredPermission || hasPermission(effectiveRole, item.requiredPermission),
    ),
  })).filter((group) => group.items.length > 0);
}

