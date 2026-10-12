import type {
  AssetException,
  AttentionEntry,
  DashboardStatus,
  EnvironmentMetric,
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

const getAttentionRank = (alert: TwinAlert): number => {
  const isCritical = alert.kind === "critical" || alert.severity === "critical";
  const isMaintenance = alert.kind === "maintenance";
  const isActive = alert.status === "active";

  if (isCritical) return isActive ? 0 : 1;
  if (isMaintenance) return isActive ? 4 : 5;
  return isActive ? 2 : 3;
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
      status: alert.status,
      title: alert.title,
      location: alert.location,
      reading: alert.reading,
      occurredAt: relativeTime(alert.occurredAt, now),
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
  const unresolvedAlerts = alerts.filter(isUnresolvedIncident);
  const unacknowledgedCount = unresolvedAlerts.filter((alert) => alert.status === "active").length;
  const acknowledgedCount = unresolvedAlerts.filter((alert) => alert.status === "acknowledged").length;
  const energyTotal = rooms.reduce((total, room) => total + room.energyConsumption, 0);
  const energyChangePercent = yesterdayKwh > 0 ? ((energyTotal / yesterdayKwh) - 1) * 100 : 0;

  const alertDetails: KpiDetail[] = [];
  if (unacknowledgedCount > 0) alertDetails.push({ label: `${unacknowledgedCount} chưa tiếp nhận`, tone: "warning" });
  if (acknowledgedCount > 0) alertDetails.push({ label: `${acknowledgedCount} đang xử lý`, tone: "warning" });

  return [
    {
      id: "energy-today",
      label: "Điện năng hôm nay",
      value: `${energyTotal.toFixed(1)} kWh`,
      icon: "energy",
      details: [{
        label: `${energyChangePercent > 0 ? "↑ " : energyChangePercent < 0 ? "↓ " : ""}${Math.abs(energyChangePercent).toFixed(1)}% so với hôm qua`,
        tone: energyChangePercent > 0 ? "warning" : "normal",
      }],
    },
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
      id: "alerts",
      label: "Sự cố chưa giải quyết",
      value: String(unresolvedAlerts.length),
      icon: "alerts",
      details: alertDetails,
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
