import type {
  Alert,
  AlertSeverity,
  AlertStatus,
  Building,
  EntityId,
  Floor,
  OperationalStatus,
} from "../../types/models";
import type {
  AcControlState,
  AcMode,
  EnergySavingRuleState,
  RoomOccupancyState,
} from "../../data/mock/roomControls.mock";
import type { AttentionKind } from "../dashboard/types";
import type { FloorRoomSnapshot } from "../floor/types";
import type { EnergyPoint } from "../dashboard/types";
import type { DeviceEnergyReading, DeviceHourlyEnergyReading } from "../energy/types";
import type { RoomAirQualityReading } from "../environment/types";

export type SimulationScenario =
  | "server-temperature-high"
  | "meeting-room-unoccupied-power"
  | "ac-mt2-offline"
  | "temp-04-offline"
  | "ac-03-maintenance-due"
  | "meeting-room-02-co2-high"
  | "hourly-energy-spike"
  | "return-normal";

export type SimulationConnectionStatus = "simulation-live" | "simulation-paused";

export type OperatorCommandStatus = "executing" | "executed" | "failed";

export interface OperatorCommandFeedback {
  id: string;
  roomId: EntityId;
  targetLabel: string;
  actionLabel: string;
  status: OperatorCommandStatus;
  message: string;
  timestamp: number;
}

export interface OperatorActionLogEntry {
  id: string;
  roomId: EntityId;
  targetId?: string;
  targetLabel: string;
  actionLabel: string;
  actorLabel: string;
  resultLabel: string;
  status: OperatorCommandStatus;
  timestamp: number;
}

export interface TwinDevice {
  id: EntityId;
  roomId: EntityId;
  assetId?: EntityId;
  name: string;
  type: string;
  status: OperationalStatus;
  sensorIds: EntityId[];
  primaryMetric: string;
  lastSeenAt: string;
  maintenanceHoursRemaining?: number;
}

export type TwinDeviceSeed = Omit<TwinDevice, "lastSeenAt"> & { lastSeenMinutesAgo: number };

export interface TwinSensor {
  id: EntityId;
  roomId: EntityId;
  deviceId: EntityId;
  name: string;
  metric: string;
  unit: string;
  status: OperationalStatus;
  value: number;
}

export interface TwinAlert extends Alert {
  roomId: EntityId;
  location: string;
  kind: AttentionKind;
  occurredAt: number;
  reading?: string;
  correlationKey: string;
}

export type NewTwinAlert = Pick<
  TwinAlert,
  "title" | "message" | "severity" | "roomId" | "location" | "kind" | "correlationKey"
> & Pick<TwinAlert, "assetId" | "deviceId"> & { reading?: string };

export interface TelemetryUpdatedEvent {
  type: "TelemetryUpdated";
  roomId: EntityId;
  temperature: number;
  humidity: number;
  co2Ppm?: number;
  energyConsumption?: number;
  occurredAt: number;
}

export interface AirQualityThresholdExceededEvent {
  type: "AirQualityThresholdExceeded";
  roomId: EntityId;
  metric: "co2" | "pm25";
  value: number;
  occurredAt: number;
}

export interface DeviceOfflineEvent {
  type: "DeviceOffline";
  deviceId: EntityId;
  deviceName: string;
  roomId: EntityId;
  occurredAt: number;
}

export interface TemperatureThresholdExceededEvent {
  type: "TemperatureThresholdExceeded";
  roomId: EntityId;
  threshold: "warning" | "critical";
  temperature: number;
  occurredAt: number;
}

export interface MaintenanceDueEvent {
  type: "MaintenanceDue";
  deviceId: EntityId;
  deviceName: string;
  roomId: EntityId;
  occurredAt: number;
}

export type TwinSimulationEvent =
  | TelemetryUpdatedEvent
  | AirQualityThresholdExceededEvent
  | DeviceOfflineEvent
  | TemperatureThresholdExceededEvent
  | MaintenanceDueEvent;

export interface TwinStoreData {
  building: Building;
  floors: Floor[];
  rooms: FloorRoomSnapshot[];
  devices: TwinDevice[];
  sensors: TwinSensor[];
  airQualityByRoom: RoomAirQualityReading[];
  energyHistory: EnergyPoint[];
  energyHistoryByFloor: Record<EntityId, EnergyPoint[]>;
  hourlyDeviceReadingsByFloor: Record<EntityId, DeviceHourlyEnergyReading[]>;
  lastUpdatedByFloor: Partial<Record<EntityId, number>>;
  energyDeviceReadings: DeviceEnergyReading[];
  alerts: TwinAlert[];
  selectedRoomId: EntityId | null;
  lastUpdated: number;
  connectionStatus: SimulationConnectionStatus;
  automaticTelemetryRunning: boolean;
  telemetryStep: number;
  events: TwinSimulationEvent[];
  alertSequence: number;
  lightStates: Record<string, boolean>;
  acStates: Record<string, AcControlState>;
  serverCoolingBoostActive: boolean;
  roomOccupancyByRoom: Record<string, RoomOccupancyState>;
  energySavingRulesByRoom: Record<string, EnergySavingRuleState>;
  lastCommandFeedback: OperatorCommandFeedback | null;
  actionHistory: OperatorActionLogEntry[];
}

export interface TwinStoreActions {
  selectRoom: (roomId: EntityId | null) => void;
  updateRoomTelemetry: (roomId: EntityId, update: Partial<Pick<FloorRoomSnapshot, "temperature" | "humidity" | "energyConsumption">>) => void;
  updateAirQuality: (roomId: EntityId, update: Partial<Pick<RoomAirQualityReading, "co2Ppm" | "pm25Micrograms">>) => void;
  updateDeviceStatus: (deviceId: EntityId, status: OperationalStatus) => void;
  addAlert: (alert: NewTwinAlert) => void;
  acknowledgeAlert: (alertId: EntityId) => void;
  simulateScenario: (scenario: SimulationScenario) => void;
  advanceTelemetry: () => void;
  setAutomaticTelemetryRunning: (running: boolean) => void;
  resetSimulation: () => void;
  toggleLight: (lightId: string) => void;
  toggleAcPower: (acId: string) => void;
  setAcTemperature: (acId: string, targetTemp: number) => void;
  setAcMode: (acId: string, mode: AcMode) => void;
  activateServerCoolingBoost: () => void;
  setRoomOccupancy: (roomId: EntityId, isOccupied: boolean) => void;
  fastForwardOccupancyWait: (roomId: EntityId, minutes?: number) => void;
  setEnergySavingRule: (roomId: EntityId, update: Partial<Pick<EnergySavingRuleState, "enabled" | "autoExecute">>) => void;
  applyEnergySavingNow: (roomId: EntityId) => void;
  overrideEnergySavingRule: (roomId: EntityId, durationMinutes?: number) => void;
  disconnectDevice: (deviceId: EntityId) => void;
  restoreDeviceConnection: (deviceId: EntityId) => void;
}

export type TwinStoreState = TwinStoreData & TwinStoreActions;

export type { AlertSeverity, AlertStatus };
