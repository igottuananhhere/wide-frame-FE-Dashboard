import { create } from "zustand";
import {
  ACTIVE_FLOOR_ID,
  BUILDING_LOCATIONS,
  DEMO_FLOOR_2_ID,
} from "../../data/mock/buildingLocations";
import { floor1Rooms } from "../../data/mock/floor1.mock";
import { floor1AirQualityByRoom, floor1EnvironmentThresholds } from "../../data/mock/floor1Environment.mock";
import { floor1DeviceEnergyReadings } from "../../data/mock/floor1EnergyDetail.mock";
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
  createFloor1SimulationAlerts,
  floor1SimulationDevices,
  floor1SimulationSensors,
} from "../../data/mock/twinSimulation.mock";
import { combineEnergyHistoryByFloor } from "../energy/energySelectors";
import type { FloorRoomSnapshot } from "../floor/types";
import type { OperationalStatus } from "../../types/models";
import type {
  NewTwinAlert,
  TwinAlert,
  TwinSimulationEvent,
  TwinStoreData,
  TwinStoreState,
} from "./types";

const SERVER_ROOM_ID = "room-server-01";
const TEMP_WARNING_THRESHOLD = 27;
const TEMP_CRITICAL_THRESHOLD = 29;
const TELEMETRY_SEQUENCE = [25.4, 26.1, 27.5, 29.1] as const;
const MAX_RECORDED_EVENTS = 50;
const ENERGY_INCREMENT_BY_ROOM: Record<string, number> = {
  "room-lobby-01": 0.01,
  "room-workspace-01": 0.01,
  "room-corridor-01": 0.005,
  "room-meeting-01": 0.01,
  "room-meeting-02": 0.015,
  "room-pantry-01": 0.005,
  "room-utility-01": 0.005,
};

function createInitialData(now: number): TwinStoreData {
  const activeLocation = BUILDING_LOCATIONS[0];
  if (!activeLocation) throw new Error("The Floor 1 mock location is not configured.");

  const rooms = [...floor1Rooms, ...floor2Rooms].map((room) => ({ ...room }));
  const energyHistoryByFloor = {
    [floor1Rooms[0]?.floorId ?? "ics-headquarters-floor-1"]: floor1EnergyToday.map((point) => ({ ...point })),
    [DEMO_FLOOR_2_ID]: floor2EnergyToday.map((point) => ({ ...point })),
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
      ? `Nhiệt độ ${room.name} đã vượt ngưỡng critical.`
      : `Nhiệt độ ${room.name} đang tiến gần ngưỡng critical.`,
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
    if (roomId === SERVER_ROOM_ID && updatedRoom.temperature >= TEMP_WARNING_THRESHOLD) {
      const result = upsertAlert(state, temperatureAlert(updatedRoom, updatedRoom.temperature), timestamp);
      alerts = result.alerts;
      alertSequence = result.alertSequence;
    } else if (roomId === SERVER_ROOM_ID && updatedRoom.temperature < TEMP_WARNING_THRESHOLD) {
      alerts = alerts.map((alert) => alert.correlationKey === "server-temperature-high" && alert.status !== "resolved"
        ? { ...alert, status: "resolved" as const }
        : alert);
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
    if (!state.alerts.some((alert) => alert.id === alertId && alert.status === "active")) return state;
    const timestamp = nextTimestamp(state.lastUpdated);
    return {
      alerts: state.alerts.map((alert) => alert.id === alertId
        ? { ...alert, status: "acknowledged" }
        : alert),
      lastUpdated: timestamp,
    };
  }),

  simulateScenario: (scenario) => {
    if (scenario === "server-temperature-high") {
      get().updateRoomTelemetry(SERVER_ROOM_ID, { temperature: 29.1 });
      set({ telemetryStep: TELEMETRY_SEQUENCE.length - 1 });
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

    const selectedRoomId = get().selectedRoomId;
    set({ ...createNormalData(nextTimestamp(get().lastUpdated)), selectedRoomId });
  },

  advanceTelemetry: () => {
    const state = get();
    const nextStep = Math.min(state.telemetryStep + 1, TELEMETRY_SEQUENCE.length - 1);
    const serverRoom = state.rooms.find((room) => room.id === SERVER_ROOM_ID);
    if (!serverRoom) return;
    get().updateRoomTelemetry(SERVER_ROOM_ID, {
      temperature: TELEMETRY_SEQUENCE[nextStep],
      energyConsumption: Number((serverRoom.energyConsumption + 0.03).toFixed(3)),
    });
    set({ telemetryStep: nextStep });
    set((current) => {
      const rooms = current.rooms.map((room) => {
        const increment = ENERGY_INCREMENT_BY_ROOM[room.id] ?? 0;
        if (!increment) return room;
        const updated = { ...room, energyConsumption: Number((room.energyConsumption + increment).toFixed(3)) };
        return { ...updated, status: roomStatus(updated, current.devices) };
      });
      const deviceIncrements: Record<string, number> = {
        "device-server-temp-01": 0.03,
        "device-temp-04": 0.015,
        "device-ac-03": 0.04,
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
