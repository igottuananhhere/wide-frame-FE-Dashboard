import type { AssetException } from "../dashboard/types";
import type { TwinAlert, TwinDevice } from "../twin/types";

export type AssetPriority = "high" | "medium" | "low" | "unclassified";

export interface PriorityResolutionContext {
  alerts?: readonly TwinAlert[];
  devices?: readonly TwinDevice[];
}

export interface PriorityGroupConfig {
  key: AssetPriority;
  label: string;
  tone: "critical" | "blue" | "normal" | "neutral";
  dotColor: string;
  barColor: string;
}

export const PRIORITY_CONFIGS: Record<AssetPriority, PriorityGroupConfig> = {
  high: {
    key: "high",
    label: "Ưu tiên cao",
    tone: "critical",
    dotColor: "#f87171",
    barColor: "#f87171",
  },
  medium: {
    key: "medium",
    label: "Ưu tiên trung bình",
    tone: "blue",
    dotColor: "#60a5fa",
    barColor: "#60a5fa",
  },
  low: {
    key: "low",
    label: "Ưu tiên thấp",
    tone: "normal",
    dotColor: "#34d399",
    barColor: "#34d399",
  },
  unclassified: {
    key: "unclassified",
    label: "Chưa phân loại",
    tone: "neutral",
    dotColor: "#9cafbf",
    barColor: "#9cafbf",
  },
};

/**
 * Resolves the priority level of an asset exception following project business rules:
 * 1. Explicit `priority` field on item or associated device if provided.
 * 2. Business rules:
 *    - High: Critical status, operational limit exceeded, maintenance overdue,
 *            critical equipment (Controllers, Server/Utility infrastructure), or critical alerts.
 *    - Medium: Maintenance due soon, inspection needed, warning status, or non-critical sensors offline.
 *    - Low: Routine maintenance or informational tasks.
 * 3. Fallback: "unclassified" if unknown or unmapped.
 */
export function resolveAssetPriority(
  item: AssetException,
  context?: PriorityResolutionContext,
): AssetPriority {
  // Step 1: Explicit priority provided by backend or data
  if (item.priority) {
    return item.priority;
  }

  const matchingDevice = context?.devices?.find((d) => d.id === item.deviceId);
  // If device had an explicit priority property
  if (matchingDevice && "priority" in matchingDevice && typeof (matchingDevice as Record<string, unknown>).priority === "string") {
    const devPriority = (matchingDevice as Record<string, unknown>).priority as string;
    if (devPriority === "high" || devPriority === "medium" || devPriority === "low") {
      return devPriority;
    }
  }

  // Step 2: Business rules
  const matchingAlerts = context?.alerts?.filter(
    (a) => a.deviceId === item.deviceId || (item.assetId && a.assetId === item.assetId),
  ) ?? [];

  const hasCriticalAlert = matchingAlerts.some(
    (a) => a.severity === "critical" || a.kind === "critical",
  );

  const isController = item.type.toLowerCase().includes("controller") || item.type.toLowerCase().includes("điều khiển");
  const isCriticalArea = item.area.toLowerCase().includes("utility") || item.area.toLowerCase().includes("server");

  // Rule: High priority
  if (
    item.status === "critical" ||
    item.issue === "Vượt ngưỡng vận hành" ||
    item.issue === "Đến hạn bảo trì" ||
    hasCriticalAlert ||
    (item.status === "offline" && (isController || isCriticalArea))
  ) {
    return "high";
  }

  // Rule: Low priority (routine / non-urgent)
  if (
    item.issue.toLowerCase().includes("định kỳ") ||
    item.issue.toLowerCase().includes("thấp") ||
    matchingAlerts.some((a) => a.severity === "info")
  ) {
    return "low";
  }

  // Rule: Medium priority (needs inspection, due soon, or warning)
  if (
    item.issue === "Sắp đến hạn bảo trì" ||
    item.issue === "Cần kiểm tra" ||
    item.status === "warning" ||
    item.status === "offline" // Non-critical sensor offline
  ) {
    return "medium";
  }

  // Step 3: Unclassified fallback
  return "unclassified";
}

export function resolveAssetPriorityReason(
  item: AssetException,
  context?: PriorityResolutionContext,
): string {
  const priority = resolveAssetPriority(item, context);
  const isController = item.type.toLowerCase().includes("controller") || item.type.toLowerCase().includes("điều khiển");
  const isCriticalArea = item.area.toLowerCase().includes("utility") || item.area.toLowerCase().includes("server");

  if (priority === "high") {
    if (item.status === "offline" && (isController || isCriticalArea)) {
      return "Bộ điều khiển (Controller) tại phòng kỹ thuật trọng yếu mất kết nối — ảnh hưởng giám sát toàn khu vực.";
    }
    if (item.issue === "Đến hạn bảo trì" || item.maintenanceHoursRemaining === 0) {
      return "Thiết bị đã hết giờ vận hành định mức (0h còn lại), cần bảo trì ngay.";
    }
    return "Trạng thái nguy cấp hoặc vượt giới hạn vận hành an toàn.";
  }

  if (priority === "medium") {
    if (item.status === "offline") {
      return "Cảm biến nhánh (Sensor) mất kết nối cục bộ — các thiết bị khác trong khu vực vẫn hoạt động.";
    }
    if (item.issue === "Sắp đến hạn bảo trì") {
      return "Sắp đến kỳ bảo trì định kỳ, thiết bị vẫn đang hoạt động ổn định.";
    }
    return "Cần kiểm tra theo dõi định kỳ.";
  }

  if (priority === "low") {
    return "Hạng mục kiểm tra định kỳ mức độ thấp.";
  }

  return "Chưa đủ thông tin phân loại ưu tiên.";
}

export interface GroupedAssets {
  high: AssetException[];
  medium: AssetException[];
  low: AssetException[];
  unclassified: AssetException[];
}

export function groupAssetsByPriority(
  items: readonly AssetException[],
  context?: PriorityResolutionContext,
): GroupedAssets {
  const groups: GroupedAssets = {
    high: [],
    medium: [],
    low: [],
    unclassified: [],
  };

  for (const item of items) {
    const priority = resolveAssetPriority(item, context);
    const priorityReason = item.priorityReason ?? resolveAssetPriorityReason(item, context);
    groups[priority].push({
      ...item,
      priority,
      priorityReason,
    });
  }

  return groups;
}

/**
 * Returns formatted time information if real data exists; otherwise null.
 * Never mocks current time as incident discovery time.
 */
export function getAssetTimeInfo(item: AssetException): string | null {
  if (item.maintenanceHoursRemaining !== undefined) {
    if (item.maintenanceHoursRemaining === 0) {
      return "Đến hạn bảo trì";
    }
    return `Còn ${item.maintenanceHoursRemaining}h vận hành`;
  }
  return null;
}

