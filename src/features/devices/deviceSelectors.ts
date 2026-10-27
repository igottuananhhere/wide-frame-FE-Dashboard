import {
  findControllableByTwinDeviceId,
  type AcControlState,
  type AcMode,
} from "../../data/mock/roomControls.mock";
import type { TwinDevice, TwinSensor } from "../twin/types";
import type { DeviceFilter } from "./types";

const MODE_LABELS: Record<AcMode, string> = {
  cool: "Cool",
  eco: "Eco",
  fan: "Fan",
};

export function filterTwinDevices(devices: readonly TwinDevice[], filter: DeviceFilter): TwinDevice[] {
  if (filter === "all") return [...devices];
  if (filter === "offline") return devices.filter((device) => device.status === "offline");
  if (filter === "warning") return devices.filter((device) => device.status === "warning" || device.status === "critical");
  return devices.filter((device) => device.status === "normal");
}

export function getPrimaryMetricValue(
  device: TwinDevice,
  sensors: readonly TwinSensor[],
  controlContext?: {
    lightStates?: Record<string, boolean>;
    acStates?: Record<string, AcControlState>;
  },
): string {
  if (device.status === "offline") {
    return `${device.primaryMetric} · Mất kết nối`;
  }

  const controllable = findControllableByTwinDeviceId(device.id);
  const sensor = sensors.find((item) => item.deviceId === device.id);

  if (controllable?.kind === "light") {
    const isOn = controlContext?.lightStates
      ? (controlContext.lightStates[controllable.config.id] ?? controllable.config.defaultOn)
      : controllable.config.defaultOn;
    if (!isOn) {
      return `${device.primaryMetric} · Đang tắt (Chủ động) · 0.00 kW`;
    }
    return `${device.primaryMetric} · Đang bật · ${controllable.config.powerKw.toFixed(2)} kW`;
  }

  if (controllable?.kind === "ac") {
    const acState = controlContext?.acStates?.[controllable.config.id] ?? {
      isOn: controllable.config.defaultOn,
      targetTemp: controllable.config.defaultTemp,
      mode: controllable.config.defaultMode,
    };
    const stateDesc = acState.isOn
      ? `Đang bật (${acState.targetTemp}°C · ${MODE_LABELS[acState.mode]})`
      : "Đang tắt (Chủ động)";
    if (sensor?.metric === "maintenance-hours-remaining") {
      return `${device.primaryMetric} · ${sensor.value} ${sensor.unit} · ${stateDesc}`;
    }
    const modeKw = controllable.config.powerKwByMode[acState.mode] ?? controllable.config.powerKwByMode.cool;
    const kw = acState.isOn ? modeKw : 0;
    return `${device.primaryMetric} · ${stateDesc} · ${kw.toFixed(2)} kW`;
  }

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
