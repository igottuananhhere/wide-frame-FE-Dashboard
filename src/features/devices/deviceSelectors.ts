import type { TwinDevice, TwinSensor } from "../twin/types";
import type { DeviceFilter } from "./types";

export function filterTwinDevices(devices: readonly TwinDevice[], filter: DeviceFilter): TwinDevice[] {
  if (filter === "all") return [...devices];
  if (filter === "offline") return devices.filter((device) => device.status === "offline");
  if (filter === "warning") return devices.filter((device) => device.status === "warning" || device.status === "critical");
  return devices.filter((device) => device.status === "normal");
}

export function getPrimaryMetricValue(device: TwinDevice, sensors: readonly TwinSensor[]): string {
  const sensor = sensors.find((item) => item.deviceId === device.id);
  if (!sensor || sensor.status === "offline") return `${device.primaryMetric} · Mất kết nối`;
  if (sensor.metric === "temperature") return `${device.primaryMetric} · ${sensor.value.toFixed(1)} ${sensor.unit}`;
  if (sensor.metric === "maintenance-hours-remaining") return `${device.primaryMetric} · ${sensor.value} ${sensor.unit}`;
  if (sensor.metric === "co2") return `${device.primaryMetric} · ${sensor.value.toLocaleString("en-US")} ${sensor.unit}`;
  if (sensor.metric === "humidity" || sensor.metric === "power") return `${device.primaryMetric} · ${sensor.value} ${sensor.unit}`;
  return `${device.primaryMetric} · Online`;
}

export function formatLastSeen(lastSeenAt: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(lastSeenAt).getTime()) / 60_000));
  if (minutes < 1) return "Vừa cập nhật";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}
