import type {
  AssetException,
  AttentionEntry,
  AttentionPriority,
  DashboardStatus,
  EnvironmentMetric,
  IncidentCategory,
  KpiDetail,
  KpiSummary,
} from "../dashboard/types";
import type { FloorRoomSnapshot } from "../floor/types";
import type { AreaEnvironmentReading, EnvironmentThresholds } from "../environment/types";
import { isUnresolvedIncident } from "../alerts/alertSelectors";
import type { TwinAlert, TwinDevice } from "./types";

const relativeTime = (timestamp: number, now: number): string => {
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes === 0) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
};

export function resolveAlertCategory(alert: TwinAlert): IncidentCategory {
  if (alert.kind === "maintenance") {
    return "maintenance";
  }

  const titleLower = alert.title.toLowerCase();
  const readingLower = alert.reading?.toLowerCase() ?? "";
  const correlationLower = alert.correlationKey.toLowerCase();

  if (
    correlationLower.startsWith("air-quality-") ||
    correlationLower.includes("temperature") ||
    correlationLower.includes("humidity") ||
    titleLower.includes("co₂") ||
    titleLower.includes("co2") ||
    titleLower.includes("pm2.5") ||
    titleLower.includes("nhiệt độ") ||
    titleLower.includes("độ ẩm") ||
    readingLower.includes("ppm") ||
    readingLower.includes("µg/m³")
  ) {
    return "environment";
  }

  return "device";
}

export function resolveAlertPriority(alert: TwinAlert): AttentionPriority {
  if (alert.kind === "critical" || alert.severity === "critical") {
    return "high";
  }

  const titleLower = alert.title.toLowerCase();
  const readingLower = alert.reading?.toLowerCase() ?? "";
  const locationLower = alert.location.toLowerCase();
  const roomIdLower = alert.roomId.toLowerCase();
  const deviceIdLower = alert.deviceId?.toLowerCase() ?? "";
  const correlationLower = alert.correlationKey.toLowerCase();

  const isOffline =
    titleLower.includes("mất kết nối") ||
    readingLower.includes("offline") ||
    readingLower.includes("mất kết nối") ||
    correlationLower.includes("offline");

  const isControllerOrCriticalArea =
    titleLower.includes("controller") ||
    titleLower.includes("điều khiển") ||
    locationLower.includes("utility") ||
    locationLower.includes("server") ||
    roomIdLower.includes("utility") ||
    roomIdLower.includes("server") ||
    deviceIdLower.includes("utility") ||
    deviceIdLower.includes("server");

  if (isOffline && isControllerOrCriticalArea) {
    return "high";
  }

  const isMaintenanceDueNow =
    (titleLower.includes("đến hạn bảo trì") && !titleLower.includes("sắp đến hạn")) ||
    (readingLower.includes("đến hạn bảo trì") && !readingLower.includes("sắp đến hạn"));

  if (isMaintenanceDueNow) {
    return "high";
  }

  return "medium";
}

export function resolveAlertPriorityReason(alert: TwinAlert): string {
  const category = resolveAlertCategory(alert);
  const titleLower = alert.title.toLowerCase();
  const readingLower = alert.reading?.toLowerCase() ?? "";
  const locationLower = alert.location.toLowerCase();
  const roomIdLower = alert.roomId.toLowerCase();
  const deviceIdLower = alert.deviceId?.toLowerCase() ?? "";
  const correlationLower = alert.correlationKey.toLowerCase();

  if (alert.kind === "critical" || alert.severity === "critical") {
    return "Ưu tiên cao: Chỉ số vận hành vượt ngưỡng nguy cấp (Critical) tại khu vực trọng yếu.";
  }

  const isOffline =
    titleLower.includes("mất kết nối") ||
    readingLower.includes("offline") ||
    readingLower.includes("mất kết nối") ||
    correlationLower.includes("offline");

  const isControllerOrCriticalArea =
    titleLower.includes("controller") ||
    titleLower.includes("điều khiển") ||
    locationLower.includes("utility") ||
    locationLower.includes("server") ||
    roomIdLower.includes("utility") ||
    roomIdLower.includes("server") ||
    deviceIdLower.includes("utility") ||
    deviceIdLower.includes("server");

  if (isOffline && isControllerOrCriticalArea) {
    return "Ưu tiên cao: Bộ điều khiển (Controller) tại phòng kỹ thuật trọng yếu mất kết nối — mất giám sát toàn bộ khu vực (0/1 thiết bị online).";
  }

  const isMaintenanceDueNow =
    (titleLower.includes("đến hạn bảo trì") && !titleLower.includes("sắp đến hạn")) ||
    (readingLower.includes("đến hạn bảo trì") && !readingLower.includes("sắp đến hạn"));

  if (isMaintenanceDueNow) {
    return "Ưu tiên cao: Thiết bị đã chạm mốc 0 giờ vận hành còn lại, quá hạn cần bảo trì ngay.";
  }

  if (isOffline) {
    return "Ưu tiên trung bình: Cảm biến nhánh (Sensor) mất kết nối cục bộ — không phải bộ điều khiển chính, các thiết bị khác trong khu vực vẫn online.";
  }

  if (category === "maintenance") {
    return "Ưu tiên trung bình: Thiết bị sắp đến kỳ bảo trì (còn giờ vận hành dự phòng), hiện vẫn hoạt động bình thường.";
  }

  if (category === "environment") {
    return "Ưu tiên trung bình: Chỉ số môi trường vượt ngưỡng cảnh báo (> 1,000 ppm), chưa chạm mức nguy cấp (1,500 ppm); cảm biến đo vẫn hoạt động bình thường.";
  }

  return "Ưu tiên trung bình: Cảnh báo vận hành cần kiểm tra theo dõi.";
}

export function summarizeIncidentCategories(alerts: readonly TwinAlert[]) {
  const unresolved = alerts.filter(isUnresolvedIncident);
  let device = 0;
  let environment = 0;
  let maintenance = 0;

  for (const alert of unresolved) {
    const category = resolveAlertCategory(alert);
    if (category === "device") device += 1;
    else if (category === "environment") environment += 1;
    else maintenance += 1;
  }

  return {
    total: unresolved.length,
    device,
    environment,
    maintenance,
    unacknowledged: unresolved.filter((alert) => alert.status === "active").length,
    acknowledged: unresolved.filter((alert) => alert.status === "acknowledged").length,
  };
}

const getAttentionRank = (alert: TwinAlert): number => {
  const isCritical = alert.kind === "critical" || alert.severity === "critical";
  const priority = resolveAlertPriority(alert);
  const isMaintenance = alert.kind === "maintenance";
  const isActive = alert.status === "active";

  if (priority === "high") {
    if (isCritical) return isActive ? 0 : 2;
    return isActive ? 1 : 3;
  }

  if (isMaintenance) return isActive ? 6 : 7;
  return isActive ? 4 : 5;
};

export function buildAttentionQueue(alerts: readonly TwinAlert[], now = Date.now()): AttentionEntry[] {
  return [...alerts]
    .filter(isUnresolvedIncident)
    .sort((first, second) => {
      const rankDiff = getAttentionRank(first) - getAttentionRank(second);
      return rankDiff || second.occurredAt - first.occurredAt;
    })
    .map((alert) => ({
      id: alert.id,
      kind: alert.kind,
      priority: resolveAlertPriority(alert),
      priorityReason: resolveAlertPriorityReason(alert),
      category: resolveAlertCategory(alert),
      status: alert.status,
      title: alert.title,
      location: alert.location,
      reading: alert.reading,
      occurredAt: relativeTime(alert.occurredAt, now),
      occurredAtMs: alert.occurredAt,
      roomId: alert.roomId,
      deviceId: alert.deviceId,
      assetId: alert.assetId,
    }));
}

export function buildOverviewKpis(
  rooms: readonly FloorRoomSnapshot[],
  alerts: readonly TwinAlert[],
  environment: ReturnType<typeof buildEnvironmentSummary>,
  yesterdayKwh: number,
): KpiSummary[] {
  const deviceCount = rooms.reduce((total, room) => total + room.deviceCount, 0);
  const onlineCount = rooms.reduce((total, room) => total + room.onlineDeviceCount, 0);
  const offlineCount = rooms.reduce((total, room) => total + room.offlineDeviceCount, 0);
  const incidentSummary = summarizeIncidentCategories(alerts);
  const energyTotal = rooms.reduce((total, room) => total + room.energyConsumption, 0);
  const energyChangePercent = yesterdayKwh > 0 ? ((energyTotal / yesterdayKwh) - 1) * 100 : 0;

  const alertDetails: KpiDetail[] = [];
  if (incidentSummary.unacknowledged > 0) {
    alertDetails.push({ label: `${incidentSummary.unacknowledged} chưa tiếp nhận`, tone: "warning" });
  }
  if (incidentSummary.acknowledged > 0) {
    alertDetails.push({ label: `${incidentSummary.acknowledged} đang xử lý`, tone: "warning" });
  }
  if (incidentSummary.total > 0) {
    alertDetails.push({
      label: `${incidentSummary.device} thiết bị · ${incidentSummary.environment} môi trường · ${incidentSummary.maintenance} bảo trì`,
    });
  }

  return [
    {
      id: "device-health",
      label: "Tình trạng thiết bị",
      value: `${onlineCount} / ${deviceCount}`,
      icon: "devices",
      details: [
        { label: `${onlineCount} Online`, tone: "online" },
        { label: `${offlineCount} Offline`, tone: "offline" },
      ],
    },
    {
      id: "alerts",
      label: "Sự cố chưa giải quyết",
      value: String(incidentSummary.total),
      icon: "alerts",
      details: alertDetails,
    },
    {
      id: "environment",
      label: "Môi trường",
      value: environment.overall,
      icon: "environment",
      details: [
        {
          label: `${environment.areasToReview} khu vực vượt ngưỡng`,
          tone: environment.status,
        },
        ...environment.attentionAreas.slice(0, 1).map((area) => ({
          label: `${area.roomName} · ${area.issues[0]}`,
        })),
      ],
    },
    {
      id: "energy-today",
      label: "Điện năng hôm nay",
      value: `${energyTotal.toFixed(1)} kWh`,
      icon: "energy",
      details: [
        {
          label: `${energyChangePercent > 0 ? "+" : energyChangePercent < 0 ? "-" : ""}${Math.abs(energyChangePercent).toFixed(1)}% so với cả ngày hôm qua (${yesterdayKwh.toFixed(1)} kWh)`,
          tone: energyChangePercent > 0 ? "warning" : "normal",
        },
        {
          label: "Lũy kế trong ngày (00:00–17:00 · kWh)",
        },
      ],
    },
  ];
}

export function buildEnvironmentSummary(
  readings: readonly AreaEnvironmentReading[],
  thresholds: EnvironmentThresholds,
) {
  const roomCount = Math.max(readings.length, 1);
  const average = (select: (reading: AreaEnvironmentReading) => number) =>
    readings.reduce((total, reading) => total + select(reading), 0) / roomCount;
  const attentionAreas = readings.flatMap((reading) => {
    const issues: string[] = [];
    if (reading.temperatureStatus === "warning" || reading.temperatureStatus === "critical") {
      issues.push(`Nhiệt độ ${reading.temperatureC.toFixed(1)}°C`);
    }
    if (reading.humidityStatus === "warning" || reading.humidityStatus === "critical") {
      issues.push(`Độ ẩm ${reading.humidityPercent.toFixed(0)}%`);
    }
    if (reading.co2Status === "warning" || reading.co2Status === "critical") {
      issues.push(`CO₂ ${reading.co2Ppm.toLocaleString("en-US")} ppm (≤ ${thresholds.co2MaxPpm})`);
    }
    if (reading.pm25Status === "warning" || reading.pm25Status === "critical") {
      issues.push(`PM2.5 ${reading.pm25Micrograms} µg/m³ (≤ ${thresholds.pm25MaxMicrograms})`);
    }
    return issues.length ? [{ roomId: reading.roomId, roomName: reading.roomName, issues }] : [];
  });
  const areasToReview = attentionAreas.length;
  const criticalCount = attentionAreas.filter(({ roomId }) =>
    readings.find((reading) => reading.roomId === roomId)?.status === "critical",
  ).length;
  const status: DashboardStatus = criticalCount > 0 ? "critical" : areasToReview > 0 ? "warning" : "normal";

  return {
    status,
    overall: status === "critical" ? "Critical" : status === "warning" ? "Cần chú ý" : "Bình thường",
    areasToReview,
    attentionAreas,
    metrics: [
      { id: "temperature", label: "Nhiệt độ trung bình", value: `${average((reading) => reading.temperatureC).toFixed(1)}°C`, icon: "temperature" },
      { id: "humidity", label: "Độ ẩm trung bình", value: `${Math.round(average((reading) => reading.humidityPercent))}%`, icon: "humidity" },
      { id: "co2", label: "CO₂ trung bình", value: `${Math.round(average((reading) => reading.co2Ppm)).toLocaleString("en-US")} ppm`, icon: "co2" },
      { id: "pm25", label: "PM2.5 trung bình", value: `${Math.round(average((reading) => reading.pm25Micrograms))} µg/m³`, icon: "pm25" },
    ] satisfies readonly EnvironmentMetric[],
  };
}

export function buildAssetExceptions(
  devices: readonly TwinDevice[],
  rooms: readonly FloorRoomSnapshot[],
): AssetException[] {
  return devices.flatMap((device) => {
    const room = rooms.find((item) => item.id === device.roomId);
    const dueHours = device.maintenanceHoursRemaining;
    const requiresMaintenance = dueHours !== undefined && dueHours <= 12;
    const status = device.status === "offline" || device.status === "critical"
      ? device.status
      : device.status === "warning" || requiresMaintenance ? "warning" : null;
    if (!status) return [];

    const issue = device.status === "offline"
      ? "Mất kết nối"
      : dueHours === 0 ? "Đến hạn bảo trì"
        : requiresMaintenance ? "Sắp đến hạn bảo trì"
          : device.status === "critical" ? "Vượt ngưỡng vận hành" : "Cần kiểm tra";

    return [{
      id: device.name,
      deviceId: device.id,
      assetId: device.assetId,
      type: device.type,
      area: room?.name ?? "—",
      status,
      issue,
      actionLabel: device.assetId ? "Xem hồ sơ tài sản" : "Xem thiết bị",
      maintenanceHoursRemaining: device.maintenanceHoursRemaining,
      lastSeenAt: device.lastSeenAt,
    }];
  });
}
