export type EntityId = string;

export type OperationalStatus = "normal" | "warning" | "critical" | "offline";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface Building {
  id: EntityId;
  name: string;
  code: string;
  address?: string;
  floorIds: EntityId[];
}

export interface Floor {
  id: EntityId;
  buildingId: EntityId;
  name: string;
  level: number;
  dataAvailability: "simulation" | "not-configured";
  roomIds: EntityId[];
}

export interface Room {
  id: EntityId;
  floorId: EntityId;
  name: string;
  code: string;
  areaSqm?: number;
  assetIds: EntityId[];
}

export interface Asset {
  id: EntityId;
  roomId: EntityId;
  name: string;
  category?: string;
  status?: OperationalStatus;
  deviceIds: EntityId[];
  sensorIds: EntityId[];
}

export interface Sensor {
  id: EntityId;
  assetId: EntityId;
  deviceId?: EntityId;
  name: string;
  metric: string;
  unit?: string;
}

export interface Device {
  id: EntityId;
  assetId: EntityId;
  name: string;
  type: string;
  status: OperationalStatus;
  sensorIds: EntityId[];
  lastSeenAt?: string;
}

export interface Alert {
  id: EntityId;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  createdAt: string;
  buildingId: EntityId;
  floorId: EntityId;
  roomId?: EntityId;
  assetId?: EntityId;
  deviceId?: EntityId;
  sensorId?: EntityId;
}
