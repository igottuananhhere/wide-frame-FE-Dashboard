import { create } from "zustand";
import {
  ACTIVE_FLOOR_ID,
  BUILDING_LOCATIONS,
  DEMO_FLOOR_2_ID,
} from "../../data/mock/buildingLocations";
import { floor1Rooms } from "../../data/mock/floor1.mock";
import { floor1AirQualityByRoom, floor1EnvironmentThresholds } from "../../data/mock/floor1Environment.mock";
import {
  floor1DeviceEnergyReadings,
  floor1HourlyDeviceReadings,
  floor1SpikeEnergyHistory,
  floor1SpikeHourlyDeviceReadings,
} from "../../data/mock/floor1EnergyDetail.mock";
import { floor1EnergyToday } from "../../data/mock/floor1Overview";
import { floor2Rooms } from "../../data/mock/floor2.mock";
import { floor2AirQualityByRoom } from "../../data/mock/floor2Environment.mock";
import { floor2DeviceEnergyReadings } from "../../data/mock/floor2EnergyDetail.mock";
import { floor2EnergyToday } from "../../data/mock/floor2Overview";
import {
  createFloor2SimulationAlerts,
  floor2SimulationDevices,
  floor2SimulationSensors,
} from "../../data/mock/floor2Twin.mock";
import {
  buildInitialAcStates,
  buildInitialEnergySavingRules,
  buildInitialLightStates,
  buildInitialRoomOccupancy,
  calculateRoomPowerKw,
  findControllableAcById,
  findControllableLightById,
  ROOM_QUICK_CONTROLS,
  type AcControlState,
  type AcMode,
} from "../../data/mock/roomControls.mock";
import {
  createFloor1SimulationAlerts,
  floor1SimulationDevices,
  floor1SimulationSensors,
} from "../../data/mock/twinSimulation.mock";
import { useAuthStore } from "../auth/authStore";
import { canControlDevice } from "../auth/permissions";
import { combineEnergyHistoryByFloor } from "../energy/energySelectors";
import type { FloorRoomSnapshot } from "../floor/types";
import type { OperationalStatus } from "../../types/models";
import type {
  NewTwinAlert,
  OperatorActionLogEntry,
  OperatorCommandFeedback,
  TwinAlert,
  TwinSimulationEvent,
  TwinStoreData,
  TwinStoreState,
} from "./types";

function isAuthenticatedWithoutControlPermission(): boolean {
  const { isAuthenticated, role } = useAuthStore.getState();
  return isAuthenticated && !canControlDevice(role);
}

const SERVER_ROOM_ID = "room-server-01";
const TEMP_WARNING_THRESHOLD = 27;
const TEMP_CRITICAL_THRESHOLD = 29;
const TELEMETRY_SEQUENCE = [25.4, 26.1, 27.5, 29.1] as const;
const COOLING_RECOVERY_SEQUENCE = [27.8, 26.4, 25.4] as const;
const MAX_RECORDED_EVENTS = 50;
const MAX_ACTION_HISTORY = 40;

const MODE_LABELS: Record<AcMode, string> = {
  cool: "Làm lạnh (Cool)",
  eco: "Tiết kiệm (Eco)",
  fan: "Quạt gió (Fan)",
};

const ENERGY_INCREMENT_BY_ROOM: Record<string, number> = {
  "room-lobby-01": 0.01,
  "room-workspace-01": 0.01,
  "room-corridor-01": 0.005,
  "room-meeting-01": 0.01,
  "room-meeting-02": 0.015,
  "room-pantry-01": 0.005,
  "room-utility-01": 0.005,
};

function appendActionLog(
  history: readonly OperatorActionLogEntry[],
  entry: Omit<OperatorActionLogEntry, "id">,
): OperatorActionLogEntry[] {
  const nextEntry: OperatorActionLogEntry = {
    ...entry,
    id: `action-log-${entry.timestamp}-${history.length + 1}`,
  };
  return [nextEntry, ...history].slice(0, MAX_ACTION_HISTORY);
}

function createCommandFeedback(
  roomId: string,
  targetLabel: string,
  actionLabel: string,
  status: OperatorCommandFeedback["status"],
  message: string,
  timestamp: number,
): OperatorCommandFeedback {
  return {
    id: `cmd-feedback-${timestamp}`,
    roomId,
    targetLabel,
    actionLabel,
    status,
    message,
    timestamp,
  };
}

function hasActiveControllableDevicesInRoom(
  roomId: string,
  lightStates: Record<string, boolean>,
  acStates: Record<string, AcControlState>,
): boolean {
  const controls = ROOM_QUICK_CONTROLS[roomId];
  if (!controls) return false;
  const anyLightOn = controls.lights.some((l) => lightStates[l.id] ?? l.defaultOn);
  const anyAcOn = controls.acs.some((a) => (acStates[a.id]?.isOn ?? a.defaultOn));
  return anyLightOn || anyAcOn;
}

function createInitialData(now: number): TwinStoreData {
  const activeLocation = BUILDING_LOCATIONS[0];
  if (!activeLocation) throw new Error("The Floor 1 mock location is not configured.");

  const rooms = [...floor1Rooms, ...floor2Rooms].map((room) => ({ ...room }));
  const floor1Id = floor1Rooms[0]?.floorId ?? "ics-headquarters-floor-1";
  const energyHistoryByFloor = {
    [floor1Id]: floor1EnergyToday.map((point) => ({ ...point })),
    [DEMO_FLOOR_2_ID]: floor2EnergyToday.map((point) => ({ ...point })),
  };
  const hourlyDeviceReadingsByFloor = {
    [floor1Id]: floor1HourlyDeviceReadings.map((reading) => ({ ...reading })),
    [DEMO_FLOOR_2_ID]: [],
  };
  const initialAlerts = [...createFloor1SimulationAlerts(now), ...createFloor2SimulationAlerts(now)];
  const energyFloorIds = Object.keys(energyHistoryByFloor);

  return {
    building: { ...activeLocation.building, floorIds: [...activeLocation.building.floorIds] },
    floors: activeLocation.floors.map((floor) => ({
      ...floor,
      roomIds: rooms.filter((room) => room.floorId === floor.id).map((room) => room.id),
    })),
    rooms,
    devices: [...floor1SimulationDevices, ...floor2SimulationDevices].map(({ lastSeenMinutesAgo, ...device }) => ({
      ...device,
      sensorIds: [...device.sensorIds],
      lastSeenAt: new Date(now - lastSeenMinutesAgo * 60_000).toISOString(),
    })),
    sensors: [...floor1SimulationSensors, ...floor2SimulationSensors].map((sensor) => ({ ...sensor })),
    airQualityByRoom: [...floor1AirQualityByRoom, ...floor2AirQualityByRoom].map((reading) => ({ ...reading })),
    energyHistory: combineEnergyHistoryByFloor(energyHistoryByFloor, energyFloorIds),
    energyHistoryByFloor,
    hourlyDeviceReadingsByFloor,
    lastUpdatedByFloor: { [ACTIVE_FLOOR_ID]: now },
    energyDeviceReadings: [...floor1DeviceEnergyReadings, ...floor2DeviceEnergyReadings].map((reading) => ({ ...reading })),
    alerts: initialAlerts,
    selectedRoomId: null,
    lastUpdated: now,
    connectionStatus: "simulation-paused",
    automaticTelemetryRunning: false,
    telemetryStep: 0,
    events: [],
    alertSequence: initialAlerts.length,
    lightStates: buildInitialLightStates(),
    acStates: buildInitialAcStates(),
    serverCoolingBoostActive: false,
    roomOccupancyByRoom: buildInitialRoomOccupancy(),
    energySavingRulesByRoom: buildInitialEnergySavingRules(),
    lastCommandFeedback: null,
    actionHistory: [],
  };
}

function createNormalData(now: number): TwinStoreData {
  const baseline = createInitialData(now);
  return {
    ...baseline,
    rooms: baseline.rooms.map((room) => ({
      ...room,
      status: "normal",
      onlineDeviceCount: room.deviceCount,
      offlineDeviceCount: 0,
    })),
    devices: baseline.devices.map((device) => ({
      ...device,
      status: "normal",
      maintenanceHoursRemaining: device.id === "device-ac-03" ? 48 : device.maintenanceHoursRemaining,
    })),
    sensors: baseline.sensors.map((sensor) => ({
      ...sensor,
      status: "normal",
      value: sensor.id === "sensor-ac-03-runtime"
        ? 48
        : sensor.metric === "co2" && sensor.value > floor1EnvironmentThresholds.co2MaxPpm
          ? floor1EnvironmentThresholds.co2MaxPpm - 200
          : sensor.value,
    })),
    airQualityByRoom: baseline.airQualityByRoom.map((reading) => reading.co2Ppm > floor1EnvironmentThresholds.co2MaxPpm
      ? { ...reading, co2Ppm: floor1EnvironmentThresholds.co2MaxPpm - 200 }
      : reading),
    alerts: baseline.alerts.map((alert) => ({ ...alert, status: "resolved" })),
    connectionStatus: "simulation-paused",
    automaticTelemetryRunning: false,
    telemetryStep: 0,
    events: [],
    serverCoolingBoostActive: false,
  };
}

function nextTimestamp(previous: number): number {
  return Math.max(Date.now(), previous + 1);
}

function updateFloorTimestamp(
  timestamps: TwinStoreData["lastUpdatedByFloor"],
  floorId: string,
  timestamp: number,
): TwinStoreData["lastUpdatedByFloor"] {
  return { ...timestamps, [floorId]: timestamp };
}

function appendEvents(
  current: readonly TwinSimulationEvent[],
  next: readonly TwinSimulationEvent[],
): TwinSimulationEvent[] {
  return [...current, ...next].slice(-MAX_RECORDED_EVENTS);
}

function roomStatus(room: FloorRoomSnapshot, devices: TwinStoreData["devices"] = []): OperationalStatus {
  if (room.temperature >= TEMP_CRITICAL_THRESHOLD) return "critical";
  if (room.deviceCount > 0 && room.offlineDeviceCount >= room.deviceCount) return "offline";
  if (
    room.temperature >= TEMP_WARNING_THRESHOLD
    || room.offlineDeviceCount > 0
    || devices.some((device) => device.roomId === room.id && (device.status === "warning" || device.status === "critical"))
  ) return "warning";
  return "normal";
}

function energyTotal(rooms: readonly FloorRoomSnapshot[]): number {
  return rooms.reduce((total, room) => total + room.energyConsumption, 0);
}

function formatEnergyObservationTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function updateEnergyHistory(
  energyHistory: TwinStoreData["energyHistory"],
  total: number,
  timestamp: number,
) {
  const time = formatEnergyObservationTime(timestamp);
  const observedHistory = energyHistory.filter((point) => point.time <= time);
  const currentPointIndex = observedHistory.findIndex((point) => point.time === time);
  const currentPoint = { time, kwh: Number(total.toFixed(1)) };

  if (currentPointIndex === -1) return [...observedHistory, currentPoint];
  return observedHistory.map((point, index) => index === currentPointIndex ? currentPoint : point);
}

function updateFloorEnergyHistory(
  energyHistoryByFloor: TwinStoreData["energyHistoryByFloor"],
  floorId: string,
  floorTotal: number,
  timestamp: number,
) {
  const nextEnergyHistoryByFloor = {
    ...energyHistoryByFloor,
    [floorId]: updateEnergyHistory(energyHistoryByFloor[floorId] ?? [], floorTotal, timestamp),
  };
  return {
    energyHistoryByFloor: nextEnergyHistoryByFloor,
    energyHistory: combineEnergyHistoryByFloor(nextEnergyHistoryByFloor, Object.keys(nextEnergyHistoryByFloor)),
  };
}

function upsertAlert(
  state: Pick<TwinStoreData, "building" | "alerts" | "alertSequence" | "rooms">,
  input: NewTwinAlert,
  timestamp: number,
): Pick<TwinStoreData, "alerts" | "alertSequence"> {
  const existingIndex = state.alerts.findIndex(
    (alert) => alert.correlationKey === input.correlationKey
      && (alert.status === "active" || alert.status === "acknowledged"),
  );

  if (existingIndex >= 0) {
    return {
      alerts: state.alerts.map((alert, index) => index === existingIndex
        ? { ...alert, ...input, occurredAt: timestamp, createdAt: new Date(timestamp).toISOString() }
        : alert),
      alertSequence: state.alertSequence,
    };
  }

  const id = `simulation-alert-${state.alertSequence + 1}`;
  const nextAlert: TwinAlert = {
    ...input,
    id,
    buildingId: state.building.id,
    floorId: state.rooms.find((room) => room.id === input.roomId)?.floorId ?? "ics-headquarters-floor-1",
    status: "active",
    occurredAt: timestamp,
    createdAt: new Date(timestamp).toISOString(),
  };

  return { alerts: [nextAlert, ...state.alerts], alertSequence: state.alertSequence + 1 };
}

function temperatureAlert(room: FloorRoomSnapshot, temperature: number): NewTwinAlert {
  const critical = temperature >= TEMP_CRITICAL_THRESHOLD;
  const formatted = `${temperature.toFixed(1)}°C`;

  return {
    title: critical ? "Nhiệt độ phòng Server cao" : "Nhiệt độ phòng Server vượt ngưỡng cảnh báo",
    message: critical
      ? `Nhiệt độ ${room.name} đã vượt ngưỡng critical (${formatted} / ngưỡng 29.0°C).`
      : `Nhiệt độ ${room.name} đang vượt ngưỡng cảnh báo (${formatted} / ngưỡng 27.0°C).`,
    severity: critical ? "critical" : "warning",
    roomId: room.id,
    deviceId: "device-server-temp-01",
    location: room.name,
    kind: critical ? "critical" : "warning",
    reading: formatted,
    correlationKey: "server-temperature-high",
  };
}

export const useTwinStore = create<TwinStoreState>((set, get) => ({
  ...createInitialData(Date.now()),

  selectRoom: (roomId) => set({ selectedRoomId: roomId }),

  updateRoomTelemetry: (roomId, update) => set((state) => {
    const currentRoom = state.rooms.find((room) => room.id === roomId);
    if (!currentRoom) return state;

    const updatedRoom: FloorRoomSnapshot = {
      ...currentRoom,
      ...update,
      temperature: update.temperature ?? currentRoom.temperature,
      humidity: update.humidity ?? currentRoom.humidity,
      energyConsumption: update.energyConsumption ?? currentRoom.energyConsumption,
    };
    updatedRoom.status = roomStatus(updatedRoom, state.devices);

    const timestamp = nextTimestamp(state.lastUpdated);
    const events: TwinSimulationEvent[] = [{
      type: "TelemetryUpdated",
      roomId,
      temperature: updatedRoom.temperature,
      humidity: updatedRoom.humidity,
      co2Ppm: state.airQualityByRoom.find((reading) => reading.roomId === roomId)?.co2Ppm,
      energyConsumption: updatedRoom.energyConsumption,
      occurredAt: timestamp,
    }];

    if (currentRoom.temperature < TEMP_WARNING_THRESHOLD && updatedRoom.temperature >= TEMP_WARNING_THRESHOLD) {
      events.push({
        type: "TemperatureThresholdExceeded",
        roomId,
        threshold: "warning",
        temperature: updatedRoom.temperature,
        occurredAt: timestamp,
      });
    }
    if (currentRoom.temperature < TEMP_CRITICAL_THRESHOLD && updatedRoom.temperature >= TEMP_CRITICAL_THRESHOLD) {
      events.push({
        type: "TemperatureThresholdExceeded",
        roomId,
        threshold: "critical",
        temperature: updatedRoom.temperature,
        occurredAt: timestamp,
      });
    }

    const sensors = state.sensors.map((sensor) => {
      if (sensor.roomId !== roomId || sensor.status === "offline") return sensor;
      if (sensor.metric === "temperature") {
        return {
          ...sensor,
          value: updatedRoom.temperature,
          status: updatedRoom.temperature >= TEMP_CRITICAL_THRESHOLD
            ? "critical" as const
            : updatedRoom.temperature >= TEMP_WARNING_THRESHOLD ? "warning" as const : "normal" as const,
        };
      }
      if (sensor.metric === "humidity") return { ...sensor, value: updatedRoom.humidity };
      return sensor;
    });

    const rooms = state.rooms.map((room) => room.id === roomId ? updatedRoom : room);
    const updatedFloorEnergy = updateFloorEnergyHistory(
      state.energyHistoryByFloor,
      currentRoom.floorId,
      energyTotal(rooms.filter((room) => room.floorId === currentRoom.floorId)),
      timestamp,
    );

    let alerts = state.alerts;
    let alertSequence = state.alertSequence;
    let actionHistory = state.actionHistory;
    if (roomId === SERVER_ROOM_ID && updatedRoom.temperature >= TEMP_WARNING_THRESHOLD) {
      const result = upsertAlert(state, temperatureAlert(updatedRoom, updatedRoom.temperature), timestamp);
      alerts = result.alerts;
      alertSequence = result.alertSequence;
    } else if (roomId === SERVER_ROOM_ID && updatedRoom.temperature < TEMP_WARNING_THRESHOLD) {
      const hadUnresolvedTempAlert = alerts.some(
        (alert) => alert.correlationKey === "server-temperature-high" && alert.status !== "resolved",
      );
      alerts = alerts.map((alert) => alert.correlationKey === "server-temperature-high" && alert.status !== "resolved"
        ? { ...alert, status: "resolved" as const }
        : alert);
      if (hadUnresolvedTempAlert) {
        actionHistory = appendActionLog(actionHistory, {
          roomId: SERVER_ROOM_ID,
          targetId: "device-server-temp-01",
          targetLabel: "Server Room · TEMP-SRV-01",
          actionLabel: "Tự động đóng sự cố quá nhiệt",
          actorLabel: "Hệ thống giám sát",
          resultLabel: `Đã giải quyết khi nhiệt độ hạ xuống ${updatedRoom.temperature.toFixed(1)}°C (< ${TEMP_WARNING_THRESHOLD.toFixed(1)}°C)`,
          status: "executed",
          timestamp,
        });
      }
    }

    return {
      rooms,
      devices: state.devices.map((device) => device.roomId === roomId && device.status !== "offline"
        ? { ...device, lastSeenAt: new Date(timestamp).toISOString() }
        : device),
      sensors,
      ...updatedFloorEnergy,
      alerts,
      alertSequence,
      actionHistory,
      events: appendEvents(state.events, events),
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, currentRoom.floorId, timestamp),
    };
  }),

  updateAirQuality: (roomId, update) => set((state) => {
    const currentReading = state.airQualityByRoom.find((reading) => reading.roomId === roomId);
    const room = state.rooms.find((item) => item.id === roomId);
    if (!currentReading || !room) return state;

    const updatedReading = { ...currentReading, ...update };
    const timestamp = nextTimestamp(state.lastUpdated);
    const events: TwinSimulationEvent[] = [];
    const nextValues = [
      { metric: "co2" as const, value: updatedReading.co2Ppm, previous: currentReading.co2Ppm, threshold: floor1EnvironmentThresholds.co2MaxPpm },
      { metric: "pm25" as const, value: updatedReading.pm25Micrograms, previous: currentReading.pm25Micrograms, threshold: floor1EnvironmentThresholds.pm25MaxMicrograms },
    ];
    let alerts = state.alerts;
    let alertSequence = state.alertSequence;
    const co2Sensor = state.sensors.find((sensor) => sensor.roomId === roomId && sensor.metric === "co2");

    for (const item of nextValues) {
      const correlationKey = `air-quality-${item.metric}-${roomId}`;
      const criticalThreshold = item.metric === "co2" ? floor1EnvironmentThresholds.co2CriticalPpm : undefined;
      const crossedWarning = item.previous <= item.threshold && item.value > item.threshold;
      const crossedCritical = criticalThreshold !== undefined && item.previous < criticalThreshold && item.value >= criticalThreshold;
      if (crossedWarning || crossedCritical) {
        events.push({
          type: "AirQualityThresholdExceeded",
          roomId,
          metric: item.metric,
          value: item.value,
          occurredAt: timestamp,
        });
      }

      if (item.value > item.threshold) {
        const critical = item.metric === "co2"
          && item.value >= (floor1EnvironmentThresholds.co2CriticalPpm ?? Number.POSITIVE_INFINITY);
        const result = upsertAlert({ ...state, alerts, alertSequence }, {
          title: item.metric === "co2" ? `CO₂ ${room.name} vượt ngưỡng` : `PM2.5 ${room.name} vượt ngưỡng`,
          message: `${item.metric === "co2" ? "CO₂" : "PM2.5"} tại ${room.name} vượt ngưỡng vận hành ${item.threshold}.`,
          severity: critical ? "critical" : "warning",
          roomId,
          deviceId: state.devices.find((device) => device.roomId === roomId)?.id,
          location: room.name,
          kind: critical ? "critical" : "warning",
          reading: item.metric === "co2" ? `${item.value.toLocaleString("en-US")} ppm` : `${item.value} µg/m³`,
          correlationKey,
        }, timestamp);
        alerts = result.alerts;
        alertSequence = result.alertSequence;
      } else {
        alerts = alerts.map((alert) => alert.correlationKey === correlationKey && alert.status !== "resolved"
          ? { ...alert, status: "resolved" as const }
          : alert);
      }
    }

    return {
      airQualityByRoom: state.airQualityByRoom.map((reading) => reading.roomId === roomId ? updatedReading : reading),
      devices: co2Sensor ? state.devices.map((device) => device.id === co2Sensor.deviceId && device.status !== "offline"
        ? { ...device, lastSeenAt: new Date(timestamp).toISOString() }
        : device) : state.devices,
      sensors: state.sensors.map((sensor) => sensor.roomId === roomId && sensor.metric === "co2"
        ? {
            ...sensor,
            value: updatedReading.co2Ppm,
            status: updatedReading.co2Ppm >= (floor1EnvironmentThresholds.co2CriticalPpm ?? Number.POSITIVE_INFINITY)
              ? "critical" as const
              : updatedReading.co2Ppm > floor1EnvironmentThresholds.co2MaxPpm ? "warning" as const : "normal" as const,
          }
        : sensor),
      alerts,
      alertSequence,
      events: appendEvents(state.events, events),
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, room.floorId, timestamp),
    };
  }),

  updateDeviceStatus: (deviceId, status) => set((state) => {
    const device = state.devices.find((item) => item.id === deviceId);
    if (!device || device.status === status) return state;

    const timestamp = nextTimestamp(state.lastUpdated);
    const wasOffline = device.status === "offline";
    const isOffline = status === "offline";
    const rooms = state.rooms.map((room) => {
      if (room.id !== device.roomId) return room;
      const offlineDeviceCount = Math.max(0, room.offlineDeviceCount + Number(isOffline) - Number(wasOffline));
      const updatedRoom = {
        ...room,
        offlineDeviceCount,
        onlineDeviceCount: Math.max(0, room.deviceCount - offlineDeviceCount),
      };
      return { ...updatedRoom, status: roomStatus(updatedRoom) };
    });
    const event: TwinSimulationEvent[] = isOffline ? [{
      type: "DeviceOffline",
      deviceId,
      deviceName: device.name,
      roomId: device.roomId,
      occurredAt: timestamp,
    }] : [];

    const devices = state.devices.map((item) => item.id === deviceId
      ? { ...item, status, lastSeenAt: status === "offline" ? item.lastSeenAt : new Date(timestamp).toISOString() }
      : item);
    const nextRooms = rooms.map((room) => ({ ...room, status: roomStatus(room, devices) }));
    const deviceRoom = state.rooms.find((room) => room.id === device.roomId);

    return {
      devices,
      sensors: state.sensors.map((sensor) => sensor.deviceId === deviceId ? { ...sensor, status } : sensor),
      rooms: nextRooms,
      events: appendEvents(state.events, event),
      lastUpdated: timestamp,
      ...(deviceRoom
        ? { lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, deviceRoom.floorId, timestamp) }
        : {}),
    };
  }),

  addAlert: (input) => set((state) => {
    const timestamp = nextTimestamp(state.lastUpdated);
    const updated = upsertAlert(state, input, timestamp);
    const room = state.rooms.find((item) => item.id === input.roomId);
    return {
      ...updated,
      lastUpdated: timestamp,
      ...(room ? { lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, room.floorId, timestamp) } : {}),
    };
  }),

  acknowledgeAlert: (alertId) => set((state) => {
    if (isAuthenticatedWithoutControlPermission()) return state;
    const targetAlert = state.alerts.find((alert) => alert.id === alertId && alert.status === "active");
    if (!targetAlert) return state;
    const timestamp = nextTimestamp(state.lastUpdated);
    return {
      alerts: state.alerts.map((alert) => alert.id === alertId
        ? { ...alert, status: "acknowledged" }
        : alert),
      lastCommandFeedback: createCommandFeedback(
        targetAlert.roomId,
        targetAlert.title,
        "Tiếp nhận sự cố",
        "executed",
        `Đã tiếp nhận sự cố "${targetAlert.title}". Trạng thái chuyển sang Đang xử lý.`,
        timestamp,
      ),
      actionHistory: appendActionLog(state.actionHistory, {
        roomId: targetAlert.roomId,
        targetId: targetAlert.deviceId ?? targetAlert.id,
        targetLabel: `${targetAlert.location} · ${targetAlert.title}`,
        actionLabel: "Tiếp nhận sự cố",
        actorLabel: "Người vận hành (Admin)",
        resultLabel: "Đã tiếp nhận (Đang xử lý — chờ thông số về ngưỡng an toàn)",
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
    };
  }),

  toggleLight: (lightId) => set((state) => {
    if (isAuthenticatedWithoutControlPermission()) return state;
    const light = findControllableLightById(lightId);
    if (!light) return state;

    const timestamp = nextTimestamp(state.lastUpdated);
    const isOffline = light.twinDeviceId
      ? state.devices.some((d) => d.id === light.twinDeviceId && d.status === "offline")
      : light.defaultStatus === "offline";

    if (isOffline) {
      return {
        lastCommandFeedback: createCommandFeedback(
          light.roomId,
          `${light.name} (${light.code})`,
          "Chuyển trạng thái đèn",
          "failed",
          `Không thể điều khiển ${light.code}: Thiết bị mất kết nối.`,
          timestamp,
        ),
        actionHistory: appendActionLog(state.actionHistory, {
          roomId: light.roomId,
          targetId: light.twinDeviceId ?? light.id,
          targetLabel: `${light.name} (${light.code})`,
          actionLabel: "Gửi lệnh bật/tắt đèn",
          actorLabel: "Người vận hành (Admin)",
          resultLabel: "Không thể thực hiện — Thiết bị mất kết nối",
          status: "failed",
          timestamp,
        }),
        lastUpdated: timestamp,
      };
    }

    const currentOn = state.lightStates[lightId] ?? light.defaultOn;
    const nextOn = !currentOn;
    const nextLightStates = { ...state.lightStates, [lightId]: nextOn };
    const nextKw = calculateRoomPowerKw(
      light.roomId,
      nextLightStates,
      state.acStates,
      state.devices,
      state.serverCoolingBoostActive,
    );

    const sensors = light.twinDeviceId
      ? state.sensors.map((s) => s.deviceId === light.twinDeviceId && s.metric === "power"
        ? { ...s, value: nextOn ? light.powerKw : 0 }
        : s)
      : state.sensors;

    const devices = light.twinDeviceId
      ? state.devices.map((d) => d.id === light.twinDeviceId
        ? { ...d, lastSeenAt: new Date(timestamp).toISOString() }
        : d)
      : state.devices;

    const hasRemainingActive = hasActiveControllableDevicesInRoom(light.roomId, nextLightStates, state.acStates);
    const alerts = !hasRemainingActive
      ? state.alerts.map((alert) => alert.correlationKey === `unoccupied-power-${light.roomId}` && alert.status !== "resolved"
        ? { ...alert, status: "resolved" as const }
        : alert)
      : state.alerts;

    return {
      lightStates: nextLightStates,
      sensors,
      devices,
      alerts,
      lastCommandFeedback: createCommandFeedback(
        light.roomId,
        `${light.name} (${light.code})`,
        nextOn ? "Bật đèn" : "Tắt đèn",
        "executed",
        `Đã thực hiện: ${nextOn ? "Bật" : "Tắt"} ${light.code} · Công suất phòng hiện tại ${nextKw.toFixed(2)} kW.`,
        timestamp,
      ),
      actionHistory: appendActionLog(state.actionHistory, {
        roomId: light.roomId,
        targetId: light.twinDeviceId ?? light.id,
        targetLabel: `${light.name} (${light.code})`,
        actionLabel: nextOn ? "Bật đèn chiếu sáng" : "Tắt đèn chiếu sáng",
        actorLabel: "Người vận hành (Admin)",
        resultLabel: `Đã thực hiện · ${nextOn ? "Đang bật" : "Đang tắt (Chủ động)"} · Công suất phòng ${nextKw.toFixed(2)} kW`,
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, ACTIVE_FLOOR_ID, timestamp),
    };
  }),

  toggleAcPower: (acId) => set((state) => {
    if (isAuthenticatedWithoutControlPermission()) return state;
    const ac = findControllableAcById(acId);
    if (!ac) return state;

    const timestamp = nextTimestamp(state.lastUpdated);
    const isOffline = ac.twinDeviceId
      ? state.devices.some((d) => d.id === ac.twinDeviceId && d.status === "offline")
      : ac.defaultStatus === "offline";

    if (isOffline) {
      return {
        lastCommandFeedback: createCommandFeedback(
          ac.roomId,
          `${ac.name} (${ac.code})`,
          "Bật/tắt điều hòa",
          "failed",
          `Không thể điều khiển ${ac.code}: Thiết bị mất kết nối.`,
          timestamp,
        ),
        actionHistory: appendActionLog(state.actionHistory, {
          roomId: ac.roomId,
          targetId: ac.twinDeviceId ?? ac.id,
          targetLabel: `${ac.name} (${ac.code})`,
          actionLabel: "Gửi lệnh nguồn điều hòa",
          actorLabel: "Người vận hành (Admin)",
          resultLabel: "Không thể thực hiện — Thiết bị mất kết nối",
          status: "failed",
          timestamp,
        }),
        lastUpdated: timestamp,
      };
    }

    const currentAc = state.acStates[acId] ?? {
      isOn: ac.defaultOn,
      targetTemp: ac.defaultTemp,
      mode: ac.defaultMode,
    };
    const nextOn = !currentAc.isOn;
    const nextAcStates = {
      ...state.acStates,
      [acId]: { ...currentAc, isOn: nextOn },
    };
    const nextKw = calculateRoomPowerKw(
      ac.roomId,
      state.lightStates,
      nextAcStates,
      state.devices,
      state.serverCoolingBoostActive,
    );

    const unitKw = nextOn ? (ac.powerKwByMode[currentAc.mode] ?? ac.powerKwByMode.cool) : 0;
    const sensors = ac.twinDeviceId
      ? state.sensors.map((s) => s.deviceId === ac.twinDeviceId && s.metric === "power"
        ? { ...s, value: Number(unitKw.toFixed(2)) }
        : s)
      : state.sensors;

    const devices = ac.twinDeviceId
      ? state.devices.map((d) => d.id === ac.twinDeviceId
        ? { ...d, lastSeenAt: new Date(timestamp).toISOString() }
        : d)
      : state.devices;

    const hasRemainingActive = hasActiveControllableDevicesInRoom(ac.roomId, state.lightStates, nextAcStates);
    const alerts = !hasRemainingActive
      ? state.alerts.map((alert) => alert.correlationKey === `unoccupied-power-${ac.roomId}` && alert.status !== "resolved"
        ? { ...alert, status: "resolved" as const }
        : alert)
      : state.alerts;

    return {
      acStates: nextAcStates,
      sensors,
      devices,
      alerts,
      lastCommandFeedback: createCommandFeedback(
        ac.roomId,
        `${ac.name} (${ac.code})`,
        nextOn ? "Bật điều hòa" : "Tắt điều hòa",
        "executed",
        `Đã thực hiện: ${nextOn ? "Bật" : "Tắt"} ${ac.code} · Công suất phòng hiện tại ${nextKw.toFixed(2)} kW.`,
        timestamp,
      ),
      actionHistory: appendActionLog(state.actionHistory, {
        roomId: ac.roomId,
        targetId: ac.twinDeviceId ?? ac.id,
        targetLabel: `${ac.name} (${ac.code})`,
        actionLabel: nextOn ? "Bật điều hòa" : "Tắt điều hòa",
        actorLabel: "Người vận hành (Admin)",
        resultLabel: `Đã thực hiện · ${nextOn ? `Đang bật (${currentAc.targetTemp}°C)` : "Đang tắt (Chủ động)"} · Công suất phòng ${nextKw.toFixed(2)} kW`,
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, ACTIVE_FLOOR_ID, timestamp),
    };
  }),

  setAcTemperature: (acId, targetTemp) => set((state) => {
    if (isAuthenticatedWithoutControlPermission()) return state;
    const ac = findControllableAcById(acId);
    if (!ac) return state;

    const isOffline = ac.twinDeviceId
      ? state.devices.some((d) => d.id === ac.twinDeviceId && d.status === "offline")
      : ac.defaultStatus === "offline";
    if (isOffline) return state;

    const clamped = Math.min(28, Math.max(18, targetTemp));
    const currentAc = state.acStates[acId] ?? {
      isOn: ac.defaultOn,
      targetTemp: ac.defaultTemp,
      mode: ac.defaultMode,
    };
    if (currentAc.targetTemp === clamped) return state;

    const timestamp = nextTimestamp(state.lastUpdated);
    const nextAcStates = {
      ...state.acStates,
      [acId]: { ...currentAc, targetTemp: clamped },
    };
    const nextKw = calculateRoomPowerKw(
      ac.roomId,
      state.lightStates,
      nextAcStates,
      state.devices,
      state.serverCoolingBoostActive,
    );

    return {
      acStates: nextAcStates,
      lastCommandFeedback: createCommandFeedback(
        ac.roomId,
        `${ac.name} (${ac.code})`,
        `Đặt nhiệt độ ${clamped}°C`,
        "executed",
        `Đã thực hiện: Đặt nhiệt độ mục tiêu ${ac.code} ở mức ${clamped}°C · Công suất phòng ${nextKw.toFixed(2)} kW.`,
        timestamp,
      ),
      actionHistory: appendActionLog(state.actionHistory, {
        roomId: ac.roomId,
        targetId: ac.twinDeviceId ?? ac.id,
        targetLabel: `${ac.name} (${ac.code})`,
        actionLabel: `Điều chỉnh nhiệt độ cài đặt → ${clamped}°C`,
        actorLabel: "Người vận hành (Admin)",
        resultLabel: `Đã thực hiện · Mục tiêu ${clamped}°C · Công suất phòng ${nextKw.toFixed(2)} kW`,
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, ACTIVE_FLOOR_ID, timestamp),
    };
  }),

  setAcMode: (acId, mode) => set((state) => {
    if (isAuthenticatedWithoutControlPermission()) return state;
    const ac = findControllableAcById(acId);
    if (!ac) return state;

    const isOffline = ac.twinDeviceId
      ? state.devices.some((d) => d.id === ac.twinDeviceId && d.status === "offline")
      : ac.defaultStatus === "offline";
    if (isOffline) return state;

    const currentAc = state.acStates[acId] ?? {
      isOn: ac.defaultOn,
      targetTemp: ac.defaultTemp,
      mode: ac.defaultMode,
    };
    if (currentAc.mode === mode) return state;

    const timestamp = nextTimestamp(state.lastUpdated);
    const nextAcStates = {
      ...state.acStates,
      [acId]: { ...currentAc, mode },
    };
    const nextKw = calculateRoomPowerKw(
      ac.roomId,
      state.lightStates,
      nextAcStates,
      state.devices,
      state.serverCoolingBoostActive,
    );

    const unitKw = currentAc.isOn ? (ac.powerKwByMode[mode] ?? ac.powerKwByMode.cool) : 0;
    const sensors = ac.twinDeviceId
      ? state.sensors.map((s) => s.deviceId === ac.twinDeviceId && s.metric === "power"
        ? { ...s, value: Number(unitKw.toFixed(2)) }
        : s)
      : state.sensors;

    return {
      acStates: nextAcStates,
      sensors,
      lastCommandFeedback: createCommandFeedback(
        ac.roomId,
        `${ac.name} (${ac.code})`,
        `Chế độ ${MODE_LABELS[mode]}`,
        "executed",
        `Đã thực hiện: Chuyển ${ac.code} sang chế độ ${MODE_LABELS[mode]} · Công suất phòng ${nextKw.toFixed(2)} kW.`,
        timestamp,
      ),
      actionHistory: appendActionLog(state.actionHistory, {
        roomId: ac.roomId,
        targetId: ac.twinDeviceId ?? ac.id,
        targetLabel: `${ac.name} (${ac.code})`,
        actionLabel: `Chuyển chế độ vận hành → ${MODE_LABELS[mode]}`,
        actorLabel: "Người vận hành (Admin)",
        resultLabel: `Đã thực hiện · ${MODE_LABELS[mode]} · Công suất phòng ${nextKw.toFixed(2)} kW`,
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, ACTIVE_FLOOR_ID, timestamp),
    };
  }),

  activateServerCoolingBoost: () => set((state) => {
    if (isAuthenticatedWithoutControlPermission()) return state;
    const timestamp = nextTimestamp(state.lastUpdated);
    const nextAcStates: Record<string, AcControlState> = {
      ...state.acStates,
      "ac-srv-01": { isOn: true, targetTemp: 18, mode: "cool" },
      "ac-srv-02": { isOn: true, targetTemp: 18, mode: "cool" },
    };
    const nextKw = calculateRoomPowerKw(
      SERVER_ROOM_ID,
      state.lightStates,
      nextAcStates,
      state.devices,
      true,
    );

    const sensors = state.sensors.map((s) => {
      if (s.id === "sensor-crac-01-power") return { ...s, value: 2.98 };
      if (s.id === "sensor-crac-02-power") return { ...s, value: 2.73 };
      return s;
    });

    const alerts = state.alerts.map((alert) =>
      alert.correlationKey === "server-temperature-high" && alert.status === "active"
        ? { ...alert, status: "acknowledged" as const }
        : alert,
    );

    return {
      acStates: nextAcStates,
      serverCoolingBoostActive: true,
      sensors,
      alerts,
      lastCommandFeedback: createCommandFeedback(
        SERVER_ROOM_ID,
        "CRAC-01 & CRAC-02",
        "Tăng cường làm mát phòng Server",
        "executed",
        `Đã thực hiện: CRAC-01 & CRAC-02 chuyển sang 18°C (Cool). Nhiệt độ sẽ giảm dần qua từng bước mô phỏng (${nextKw.toFixed(2)} kW).`,
        timestamp,
      ),
      actionHistory: appendActionLog(state.actionHistory, {
        roomId: SERVER_ROOM_ID,
        targetId: "device-crac-01",
        targetLabel: "Server Room · CRAC-01 & CRAC-02",
        actionLabel: "Kích hoạt tăng cường làm mát (18°C · Cool)",
        actorLabel: "Người vận hành (Admin)",
        resultLabel: `Đã thực hiện · Đang hạ nhiệt dần về mức ổn định (Công suất ${nextKw.toFixed(2)} kW)`,
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, ACTIVE_FLOOR_ID, timestamp),
    };
  }),

  setRoomOccupancy: (roomId, isOccupied) => set((state) => {
    if (isAuthenticatedWithoutControlPermission()) return state;
    const current = state.roomOccupancyByRoom[roomId];
    const room = state.rooms.find((r) => r.id === roomId);
    if (!current || !room) return state;

    const timestamp = nextTimestamp(state.lastUpdated);
    const nextOccupancy = {
      ...current,
      isOccupied,
      occupantCount: isOccupied ? 6 : 0,
      unoccupiedMinutes: 0,
    };

    const alerts = isOccupied
      ? state.alerts.map((alert) => alert.correlationKey === `unoccupied-power-${roomId}` && alert.status !== "resolved"
        ? { ...alert, status: "resolved" as const }
        : alert)
      : state.alerts;

    return {
      roomOccupancyByRoom: {
        ...state.roomOccupancyByRoom,
        [roomId]: nextOccupancy,
      },
      alerts,
      lastCommandFeedback: createCommandFeedback(
        roomId,
        room.name,
        isOccupied ? "Chuyển trạng thái: Có người" : "Chuyển trạng thái: Không có người",
        "executed",
        isOccupied
          ? `${room.name} đang có người sử dụng (bộ đếm phòng trống đặt về 0 phút).`
          : `${room.name} đã chuyển sang trạng thái Không có người (bắt đầu tính thời gian chờ ${current.thresholdMinutes} phút).`,
        timestamp,
      ),
      actionHistory: appendActionLog(state.actionHistory, {
        roomId,
        targetLabel: `${room.name} · Cảm biến hiện diện`,
        actionLabel: isOccupied ? "Cập nhật hiện diện: Có người" : "Cập nhật hiện diện: Không có người",
        actorLabel: "Người vận hành (Admin)",
        resultLabel: isOccupied ? "Có người trong phòng (0 phút trống)" : `Phòng trống · Chờ đủ ${current.thresholdMinutes} phút để kiểm tra tiết kiệm điện`,
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, room.floorId, timestamp),
    };
  }),

  fastForwardOccupancyWait: (roomId, minutes = 15) => {
    if (isAuthenticatedWithoutControlPermission()) return;
    const state = get();
    const current = state.roomOccupancyByRoom[roomId];
    const room = state.rooms.find((r) => r.id === roomId);
    if (!current || !room) return;

    const timestamp = nextTimestamp(state.lastUpdated);
    const nextUnoccupiedMinutes = (current.isOccupied ? 0 : current.unoccupiedMinutes) + minutes;
    const rule = state.energySavingRulesByRoom[roomId] ?? {
      roomId,
      enabled: true,
      autoExecute: false,
      overrideActive: false,
      overrideRemainingMinutes: 0,
    };

    const hasActiveDevices = hasActiveControllableDevicesInRoom(roomId, state.lightStates, state.acStates);

    set((prev) => ({
      roomOccupancyByRoom: {
        ...prev.roomOccupancyByRoom,
        [roomId]: {
          ...current,
          isOccupied: false,
          occupantCount: 0,
          unoccupiedMinutes: nextUnoccupiedMinutes,
        },
      },
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(prev.lastUpdatedByFloor, room.floorId, timestamp),
    }));

    if (nextUnoccupiedMinutes >= current.thresholdMinutes && hasActiveDevices && rule.enabled) {
      if (rule.autoExecute && !rule.overrideActive) {
        // Auto-turn off lights and ACs in the unoccupied meeting room
        const controls = ROOM_QUICK_CONTROLS[roomId];
        if (!controls) return;
        const nextLightStates = { ...get().lightStates };
        for (const l of controls.lights) {
          nextLightStates[l.id] = false;
        }
        const nextAcStates = { ...get().acStates };
        for (const a of controls.acs) {
          const prevAc = nextAcStates[a.id] ?? { isOn: a.defaultOn, targetTemp: a.defaultTemp, mode: a.defaultMode };
          nextAcStates[a.id] = { ...prevAc, isOn: false };
        }
        const nextKw = calculateRoomPowerKw(roomId, nextLightStates, nextAcStates, get().devices, get().serverCoolingBoostActive);

        set((prev) => ({
          lightStates: nextLightStates,
          acStates: nextAcStates,
          sensors: prev.sensors.map((s) => s.roomId === roomId && s.metric === "power" ? { ...s, value: 0 } : s),
          alerts: prev.alerts.map((alert) => alert.correlationKey === `unoccupied-power-${roomId}` && alert.status !== "resolved"
            ? { ...alert, status: "resolved" as const }
            : alert),
          lastCommandFeedback: createCommandFeedback(
            roomId,
            room.name,
            "Tự động tắt thiết bị khi phòng trống",
            "executed",
            `Đã thực hiện tự động: Tắt đèn & điều hòa tại ${room.name} sau ${nextUnoccupiedMinutes} phút không có người · Công suất giảm còn ${nextKw.toFixed(2)} kW.`,
            timestamp,
          ),
          actionHistory: appendActionLog(prev.actionHistory, {
            roomId,
            targetLabel: `${room.name} · Đèn & Điều hòa`,
            actionLabel: `Tự động tắt thiết bị sau ${nextUnoccupiedMinutes} phút trống`,
            actorLabel: "Quy tắc tự động (Tiết kiệm năng lượng)",
            resultLabel: `Đã tắt LT-MT2-01, LT-MT2-02 & AC-MT2 · Công suất giảm còn ${nextKw.toFixed(2)} kW`,
            status: "executed",
            timestamp,
          }),
        }));
      } else {
        const currentKw = calculateRoomPowerKw(roomId, get().lightStates, get().acStates, get().devices, get().serverCoolingBoostActive);
        get().addAlert({
          title: `Đề xuất tiết kiệm điện: ${room.name} trống quá ${current.thresholdMinutes} phút`,
          message: `${room.name} không có người trong ${nextUnoccupiedMinutes} phút nhưng đèn LT-MT2-01 và điều hòa AC-MT2 vẫn đang bật (${currentKw.toFixed(2)} kW).`,
          severity: "warning",
          roomId,
          deviceId: "device-ac-mt2-01",
          location: room.name,
          kind: "warning",
          reading: `Trống ${nextUnoccupiedMinutes} phút · ${currentKw.toFixed(2)} kW`,
          correlationKey: `unoccupied-power-${roomId}`,
        });
        set((prev) => ({
          lastCommandFeedback: createCommandFeedback(
            roomId,
            room.name,
            `Tăng tốc thời gian chờ (+${minutes} phút mô phỏng)`,
            "executed",
            `Phát hiện ${room.name} trống ${nextUnoccupiedMinutes} phút nhưng đèn và điều hòa còn bật (${currentKw.toFixed(2)} kW). Đã tạo đề xuất tiết kiệm điện.`,
            timestamp,
          ),
          actionHistory: appendActionLog(prev.actionHistory, {
            roomId,
            targetLabel: `${room.name} · LT-MT2-01 & AC-MT2`,
            actionLabel: `Phát hiện phòng trống ${nextUnoccupiedMinutes} phút còn bật thiết bị`,
            actorLabel: "Quy tắc tự động (Giám sát hiện diện)",
            resultLabel: rule.overrideActive
              ? "Đang trong thời gian ghi đè giữ bật của người vận hành"
              : `Đề xuất tắt thiết bị để giảm tải từ ${currentKw.toFixed(2)} kW về 0.25 kW`,
            status: "executed",
            timestamp,
          }),
        }));
      }
    }
  },

  setEnergySavingRule: (roomId, update) => {
    if (isAuthenticatedWithoutControlPermission()) return;
    const state = get();
    const currentRule = state.energySavingRulesByRoom[roomId];
    const room = state.rooms.find((r) => r.id === roomId);
    if (!currentRule || !room) return;

    const timestamp = nextTimestamp(state.lastUpdated);
    const nextRule = {
      ...currentRule,
      ...update,
      overrideActive: update.autoExecute ? false : currentRule.overrideActive,
    };

    set((prev) => ({
      energySavingRulesByRoom: {
        ...prev.energySavingRulesByRoom,
        [roomId]: nextRule,
      },
      lastCommandFeedback: createCommandFeedback(
        roomId,
        room.name,
        "Cập nhật quy tắc tiết kiệm điện",
        "executed",
        `Quy tắc tại ${room.name}: ${nextRule.enabled ? "Đang bật" : "Đã tắt"} · Chế độ: ${nextRule.autoExecute ? "Tự động tắt sau 15 phút trống" : "Đề xuất để người vận hành xác nhận"}.`,
        timestamp,
      ),
      actionHistory: appendActionLog(prev.actionHistory, {
        roomId,
        targetLabel: `${room.name} · Quy tắc tiết kiệm điện`,
        actionLabel: "Cập nhật chế độ quy tắc phòng trống",
        actorLabel: "Người vận hành (Admin)",
        resultLabel: nextRule.autoExecute
          ? "Chế độ Tự động tắt thiết bị khi phòng trống quá 15 phút"
          : "Chế độ Đề xuất xác nhận thủ công",
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
    }));

    const occupancy = get().roomOccupancyByRoom[roomId];
    if (
      nextRule.enabled
      && nextRule.autoExecute
      && !nextRule.overrideActive
      && occupancy
      && !occupancy.isOccupied
      && occupancy.unoccupiedMinutes >= occupancy.thresholdMinutes
      && hasActiveControllableDevicesInRoom(roomId, get().lightStates, get().acStates)
    ) {
      get().applyEnergySavingNow(roomId);
    }
  },

  applyEnergySavingNow: (roomId) => set((state) => {
    if (isAuthenticatedWithoutControlPermission()) return state;
    const controls = ROOM_QUICK_CONTROLS[roomId];
    const room = state.rooms.find((r) => r.id === roomId);
    if (!controls || !room) return state;

    const timestamp = nextTimestamp(state.lastUpdated);
    const beforeKw = calculateRoomPowerKw(roomId, state.lightStates, state.acStates, state.devices, state.serverCoolingBoostActive);

    const nextLightStates = { ...state.lightStates };
    for (const light of controls.lights) {
      nextLightStates[light.id] = false;
    }

    const nextAcStates = { ...state.acStates };
    for (const ac of controls.acs) {
      const currentAc = nextAcStates[ac.id] ?? { isOn: ac.defaultOn, targetTemp: ac.defaultTemp, mode: ac.defaultMode };
      nextAcStates[ac.id] = { ...currentAc, isOn: false };
    }

    const afterKw = calculateRoomPowerKw(roomId, nextLightStates, nextAcStates, state.devices, state.serverCoolingBoostActive);
    const savedKw = Math.max(0, Number((beforeKw - afterKw).toFixed(2)));

    const sensors = state.sensors.map((s) => s.roomId === roomId && s.metric === "power" ? { ...s, value: 0 } : s);
    const alerts = state.alerts.map((alert) => alert.correlationKey === `unoccupied-power-${roomId}` && alert.status !== "resolved"
      ? { ...alert, status: "resolved" as const }
      : alert);

    const currentRule = state.energySavingRulesByRoom[roomId];
    const actorLabel = currentRule?.autoExecute
      ? "Quy tắc tự động / Người vận hành"
      : "Người vận hành (Admin)";

    return {
      lightStates: nextLightStates,
      acStates: nextAcStates,
      sensors,
      alerts,
      lastCommandFeedback: createCommandFeedback(
        roomId,
        `${room.name} (Đèn & Điều hòa)`,
        "Thực hiện tiết kiệm điện",
        "executed",
        `Đã thực hiện: Tắt toàn bộ đèn và điều hòa tại ${room.name}. Công suất tức thời giảm ${savedKw.toFixed(2)} kW (${beforeKw.toFixed(2)} kW → ${afterKw.toFixed(2)} kW).`,
        timestamp,
      ),
      actionHistory: appendActionLog(state.actionHistory, {
        roomId,
        targetId: "device-ac-mt2-01",
        targetLabel: `${room.name} · LT-MT2-01, LT-MT2-02 & AC-MT2`,
        actionLabel: "Tắt thiết bị phòng trống để tiết kiệm điện",
        actorLabel,
        resultLabel: `Đã thực hiện · Công suất giảm từ ${beforeKw.toFixed(2)} kW xuống ${afterKw.toFixed(2)} kW (-${savedKw.toFixed(2)} kW)`,
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, room.floorId, timestamp),
    };
  }),

  overrideEnergySavingRule: (roomId, durationMinutes = 30) => set((state) => {
    if (isAuthenticatedWithoutControlPermission()) return state;
    const currentRule = state.energySavingRulesByRoom[roomId];
    const room = state.rooms.find((r) => r.id === roomId);
    if (!currentRule || !room) return state;

    const timestamp = nextTimestamp(state.lastUpdated);
    const alerts = state.alerts.map((alert) => alert.correlationKey === `unoccupied-power-${roomId}` && alert.status !== "resolved"
      ? { ...alert, status: "resolved" as const }
      : alert);

    return {
      energySavingRulesByRoom: {
        ...state.energySavingRulesByRoom,
        [roomId]: {
          ...currentRule,
          overrideActive: true,
          overrideRemainingMinutes: durationMinutes,
        },
      },
      alerts,
      lastCommandFeedback: createCommandFeedback(
        roomId,
        room.name,
        `Ghi đè giữ bật (${durationMinutes} phút)`,
        "executed",
        `Đã thực hiện: Ghi đè quy tắc tiết kiệm điện tại ${room.name} trong ${durationMinutes} phút để phục vụ chuẩn bị cuộc họp.`,
        timestamp,
      ),
      actionHistory: appendActionLog(state.actionHistory, {
        roomId,
        targetLabel: `${room.name} · Quy tắc tiết kiệm điện`,
        actionLabel: `Ghi đè giữ bật thiết bị (${durationMinutes} phút)`,
        actorLabel: "Người vận hành (Admin)",
        resultLabel: `Đã ghi đè · Giữ bật đèn & điều hòa trong ${durationMinutes} phút`,
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
      lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, room.floorId, timestamp),
    };
  }),

  disconnectDevice: (deviceId) => {
    if (isAuthenticatedWithoutControlPermission()) return;
    const state = get();
    const device = state.devices.find((d) => d.id === deviceId);
    if (!device) return;
    const room = state.rooms.find((r) => r.id === device.roomId);
    const location = room?.name ?? "Tầng 1";

    get().updateDeviceStatus(deviceId, "offline");
    const correlationKey = deviceId === "device-temp-04"
      ? "temp-04-offline"
      : deviceId === "device-ac-mt2-01"
        ? "ac-mt2-offline"
        : deviceId === "device-workspace-08"
          ? "workspace-sensor-offline"
          : deviceId === "device-utility-01"
            ? "utility-controller-offline"
            : `${deviceId}-offline`;

    get().addAlert({
      title: `${device.type} ${device.name} mất kết nối`,
      message: `${device.name} tại ${location} không phản hồi tín hiệu truyền thông. Điều khiển từ xa tạm khóa; mất kết nối không đồng nghĩa thiết bị đã tắt nguồn vật lý.`,
      severity: "warning",
      roomId: device.roomId,
      deviceId: device.id,
      location,
      kind: "warning",
      reading: `${device.name} · Mất kết nối`,
      correlationKey,
    });

    const timestamp = nextTimestamp(get().lastUpdated);
    set((prev) => ({
      lastCommandFeedback: createCommandFeedback(
        device.roomId,
        `${device.name} (${device.type})`,
        "Mô phỏng mất kết nối",
        "executed",
        `Thiết bị ${device.name} tại ${location} đã chuyển sang trạng thái Mất kết nối (Offline). Đã khóa điều khiển từ xa.`,
        timestamp,
      ),
      actionHistory: appendActionLog(prev.actionHistory, {
        roomId: device.roomId,
        targetId: device.id,
        targetLabel: `${location} · ${device.name}`,
        actionLabel: "Mất kết nối truyền thông",
        actorLabel: "Hệ thống mô phỏng",
        resultLabel: "Offline · Khóa điều khiển từ xa & tạo cảnh báo",
        status: "executed",
        timestamp,
      }),
    }));
  },

  restoreDeviceConnection: (deviceId) => {
    if (isAuthenticatedWithoutControlPermission()) return;
    const state = get();
    const device = state.devices.find((d) => d.id === deviceId);
    if (!device) return;
    const room = state.rooms.find((r) => r.id === device.roomId);
    const location = room?.name ?? "Tầng 1";

    get().updateDeviceStatus(deviceId, "normal");
    const timestamp = nextTimestamp(get().lastUpdated);

    set((prev) => ({
      alerts: prev.alerts.map((alert) => {
        const isMatchingOfflineAlert = alert.deviceId === deviceId
          && alert.status !== "resolved"
          && (
            alert.correlationKey.includes("offline")
            || alert.title.toLowerCase().includes("mất kết nối")
            || alert.reading?.toLowerCase().includes("offline")
            || alert.reading?.toLowerCase().includes("mất kết nối")
          );
        return isMatchingOfflineAlert ? { ...alert, status: "resolved" as const } : alert;
      }),
      lastCommandFeedback: createCommandFeedback(
        device.roomId,
        `${device.name} (${device.type})`,
        "Khôi phục kết nối mô phỏng",
        "executed",
        `Đã thực hiện: Thiết bị ${device.name} tại ${location} đã kết nối lại (Online). Đã mở khóa điều khiển và đóng sự cố mất kết nối.`,
        timestamp,
      ),
      actionHistory: appendActionLog(prev.actionHistory, {
        roomId: device.roomId,
        targetId: device.id,
        targetLabel: `${location} · ${device.name}`,
        actionLabel: "Khôi phục kết nối thiết bị",
        actorLabel: "Người vận hành (Admin)",
        resultLabel: `Đã thực hiện · ${device.name} Online trở lại & tự động đóng cảnh báo`,
        status: "executed",
        timestamp,
      }),
      lastUpdated: timestamp,
    }));
  },

  simulateScenario: (scenario) => {
    if (scenario === "server-temperature-high") {
      set({ serverCoolingBoostActive: false });
      get().updateRoomTelemetry(SERVER_ROOM_ID, { temperature: 29.1 });
      const timestamp = nextTimestamp(get().lastUpdated);
      set((state) => ({
        telemetryStep: TELEMETRY_SEQUENCE.length - 1,
        lastCommandFeedback: createCommandFeedback(
          SERVER_ROOM_ID,
          "Server Room · TEMP-SRV-01",
          "Kịch bản A: Phòng Server tăng nhiệt",
          "executed",
          "Nhiệt độ Server Room tăng lên 29.1°C (vượt ngưỡng Critical 29.0°C). Sự cố khẩn cấp đã xuất hiện trên sơ đồ và hàng đợi.",
          timestamp,
        ),
        actionHistory: appendActionLog(state.actionHistory, {
          roomId: SERVER_ROOM_ID,
          targetId: "device-server-temp-01",
          targetLabel: "Server Room · TEMP-SRV-01",
          actionLabel: "Kịch bản A: Nhiệt độ tăng vượt ngưỡng (29.1°C)",
          actorLabel: "Trình mô phỏng kịch bản",
          resultLabel: "Trạng thái phòng → Critical · Tạo sự cố Nhiệt độ phòng Server cao",
          status: "executed",
          timestamp,
        }),
      }));
      return;
    }

    if (scenario === "meeting-room-unoccupied-power") {
      const roomId = "room-meeting-02";
      const timestamp = nextTimestamp(get().lastUpdated);
      set((state) => ({
        lightStates: {
          ...state.lightStates,
          "light-mt2-01": true,
          "light-mt2-02": true,
        },
        acStates: {
          ...state.acStates,
          "ac-mt2-01": { isOn: true, targetTemp: 24, mode: "cool" },
        },
        roomOccupancyByRoom: {
          ...state.roomOccupancyByRoom,
          [roomId]: {
            roomId,
            isOccupied: false,
            occupantCount: 0,
            unoccupiedMinutes: 0,
            thresholdMinutes: 15,
          },
        },
        energySavingRulesByRoom: {
          ...state.energySavingRulesByRoom,
          [roomId]: {
            roomId,
            enabled: true,
            autoExecute: state.energySavingRulesByRoom[roomId]?.autoExecute ?? false,
            overrideActive: false,
            overrideRemainingMinutes: 0,
          },
        },
        lastUpdated: timestamp,
      }));
      get().fastForwardOccupancyWait(roomId, 15);
      return;
    }

    if (scenario === "ac-mt2-offline") {
      get().disconnectDevice("device-ac-mt2-01");
      return;
    }

    if (scenario === "temp-04-offline") {
      get().updateDeviceStatus("device-temp-04", "offline");
      get().addAlert({
        title: "Sensor TEMP-04 mất kết nối",
        message: "TEMP-04 không gửi dữ liệu từ Meeting Room 02.",
        severity: "warning",
        roomId: "room-meeting-02",
        deviceId: "device-temp-04",
        location: "Meeting Room 02",
        kind: "warning",
        reading: "Mất kết nối",
        correlationKey: "temp-04-offline",
      });
      const timestamp = nextTimestamp(get().lastUpdated);
      set((state) => ({
        lastCommandFeedback: createCommandFeedback(
          "room-meeting-02",
          "TEMP-04 (Sensor)",
          "Kịch bản C: Thiết bị mất kết nối",
          "executed",
          "Cảm biến TEMP-04 tại Meeting Room 02 đã mất kết nối.",
          timestamp,
        ),
        actionHistory: appendActionLog(state.actionHistory, {
          roomId: "room-meeting-02",
          targetId: "device-temp-04",
          targetLabel: "Meeting Room 02 · TEMP-04",
          actionLabel: "Kịch bản C: Thiết bị mất kết nối",
          actorLabel: "Trình mô phỏng kịch bản",
          resultLabel: "TEMP-04 chuyển sang Offline · Tạo cảnh báo mất kết nối",
          status: "executed",
          timestamp,
        }),
      }));
      return;
    }

    if (scenario === "ac-03-maintenance-due") {
      const timestamp = nextTimestamp(get().lastUpdated);
      set((state) => {
        const devices = state.devices.map((device) => device.id === "device-ac-03"
          ? { ...device, status: "warning" as const, maintenanceHoursRemaining: 0 }
          : device);
        const rooms = state.rooms.map((room) => ({ ...room, status: roomStatus(room, devices) }));
        return {
          devices,
          rooms,
          sensors: state.sensors.map((sensor) => sensor.id === "sensor-ac-03-runtime"
            ? { ...sensor, value: 0, status: "warning" }
            : sensor),
          events: appendEvents(state.events, [{
            type: "MaintenanceDue",
            deviceId: "device-ac-03",
            deviceName: "AC-03",
            roomId: "room-workspace-01",
            occurredAt: timestamp,
          }]),
          lastUpdated: timestamp,
          lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, ACTIVE_FLOOR_ID, timestamp),
        };
      });
      get().addAlert({
        title: "AC-03 đến hạn bảo trì",
        message: "AC-03 đã đạt ngưỡng bảo trì theo giờ vận hành.",
        severity: "warning",
        roomId: "room-workspace-01",
        assetId: "asset-ac-03",
        deviceId: "device-ac-03",
        location: "Khu làm việc",
        kind: "maintenance",
        reading: "Đến hạn bảo trì",
        correlationKey: "ac-03-maintenance-due",
      });
      return;
    }

    if (scenario === "meeting-room-02-co2-high") {
      get().updateAirQuality("room-meeting-02", { co2Ppm: 1_600 });
      return;
    }

    if (scenario === "hourly-energy-spike") {
      const timestamp = nextTimestamp(get().lastUpdated);
      set((state) => {
        const nextEnergyHistoryByFloor = {
          ...state.energyHistoryByFloor,
          [ACTIVE_FLOOR_ID]: floor1SpikeEnergyHistory.map((point) => ({ ...point })),
        };
        const nextHourlyDeviceReadingsByFloor = {
          ...state.hourlyDeviceReadingsByFloor,
          [ACTIVE_FLOOR_ID]: floor1SpikeHourlyDeviceReadings.map((reading) => ({ ...reading })),
        };
        const rooms = state.rooms.map((room) => room.id === "room-workspace-01"
          ? { ...room, energyConsumption: Number((room.energyConsumption + 3.1).toFixed(1)) }
          : room);
        const energyDeviceReadings = state.energyDeviceReadings.map((reading) => reading.deviceId === "device-ac-03"
          ? { ...reading, energyKwh: Number((reading.energyKwh + 3.1).toFixed(1)) }
          : reading);

        return {
          rooms,
          energyDeviceReadings,
          energyHistoryByFloor: nextEnergyHistoryByFloor,
          energyHistory: combineEnergyHistoryByFloor(nextEnergyHistoryByFloor, Object.keys(nextEnergyHistoryByFloor)),
          hourlyDeviceReadingsByFloor: nextHourlyDeviceReadingsByFloor,
          lastUpdated: timestamp,
          lastUpdatedByFloor: updateFloorTimestamp(state.lastUpdatedByFloor, ACTIVE_FLOOR_ID, timestamp),
        };
      });
      return;
    }

    const selectedRoomId = get().selectedRoomId;
    set({ ...createNormalData(nextTimestamp(get().lastUpdated)), selectedRoomId });
  },

  advanceTelemetry: () => {
    const state = get();
    const serverRoom = state.rooms.find((room) => room.id === SERVER_ROOM_ID);
    if (!serverRoom) return;

    let nextServerTemp: number;
    let nextStep = state.telemetryStep;
    let nextBoostActive = state.serverCoolingBoostActive;

    if (state.serverCoolingBoostActive) {
      // Gradual cooling recovery: 29.1 -> 27.8 -> 26.4 -> 25.4
      const higherThanStep = COOLING_RECOVERY_SEQUENCE.find((temp) => temp < serverRoom.temperature - 0.05);
      nextServerTemp = higherThanStep ?? 25.4;
      if (nextServerTemp <= 25.4) {
        nextBoostActive = false;
        nextStep = 0;
      }
    } else {
      nextStep = Math.min(state.telemetryStep + 1, TELEMETRY_SEQUENCE.length - 1);
      nextServerTemp = TELEMETRY_SEQUENCE[nextStep];
    }

    get().updateRoomTelemetry(SERVER_ROOM_ID, {
      temperature: nextServerTemp,
      energyConsumption: Number((serverRoom.energyConsumption + 0.03).toFixed(3)),
    });
    set({ telemetryStep: nextStep, serverCoolingBoostActive: nextBoostActive });

    set((current) => {
      const rooms = current.rooms.map((room) => {
        const baseIncrement = ENERGY_INCREMENT_BY_ROOM[room.id] ?? 0;
        if (!baseIncrement) return room;
        // Scale energy accumulation by active room power load so turning off devices reduces kWh growth rate
        const roomKw = calculateRoomPowerKw(
          room.id,
          current.lightStates,
          current.acStates,
          current.devices,
          current.serverCoolingBoostActive,
        );
        const defaultKw = calculateRoomPowerKw(
          room.id,
          buildInitialLightStates(),
          buildInitialAcStates(),
          current.devices,
          false,
        );
        const loadRatio = defaultKw > 0 ? Math.max(0.15, roomKw / defaultKw) : 1;
        const increment = Number((baseIncrement * loadRatio).toFixed(4));
        const updated = { ...room, energyConsumption: Number((room.energyConsumption + increment).toFixed(3)) };
        return { ...updated, status: roomStatus(updated, current.devices) };
      });
      const deviceIncrements: Record<string, number> = {
        "device-server-temp-01": 0.03,
        "device-temp-04": 0.015,
        "device-ac-03": (current.acStates["ac-ws-03"]?.isOn ?? true) ? 0.04 : 0,
      };
      const energyDeviceReadings = current.energyDeviceReadings.map((reading) => {
        const device = current.devices.find((item) => item.id === reading.deviceId);
        const increment = device?.status === "offline" ? 0 : deviceIncrements[reading.deviceId] ?? 0;
        return { ...reading, energyKwh: Number((reading.energyKwh + increment).toFixed(3)) };
      });
      return {
        rooms,
        energyDeviceReadings,
        ...updateFloorEnergyHistory(
          current.energyHistoryByFloor,
          floor1Rooms[0]?.floorId ?? "ics-headquarters-floor-1",
          energyTotal(rooms.filter((room) => room.floorId === (floor1Rooms[0]?.floorId ?? "ics-headquarters-floor-1"))),
          current.lastUpdated,
        ),
      };
    });
  },

  setAutomaticTelemetryRunning: (running) => set((state) => ({
    automaticTelemetryRunning: running,
    connectionStatus: running ? "simulation-live" : "simulation-paused",
    lastUpdated: running ? nextTimestamp(state.lastUpdated) : state.lastUpdated,
  })),

  resetSimulation: () => set((state) => ({
    ...createInitialData(nextTimestamp(state.lastUpdated)),
    selectedRoomId: state.selectedRoomId,
  })),
}));
