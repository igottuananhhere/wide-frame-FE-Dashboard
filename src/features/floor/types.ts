import type { EntityId, OperationalStatus } from "../../types/models";

/** Floor 1 room telemetry presented by the schematic map. IDs are stable Twin entity IDs. */
export interface FloorRoomSnapshot {
  id: EntityId;
  floorId: EntityId;
  name: string;
  status: OperationalStatus;
  temperature: number;
  humidity: number;
  energyConsumption: number;
  deviceCount: number;
  onlineDeviceCount: number;
  offlineDeviceCount: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

export type SchematicFixtureKind = "workstation" | "meeting-table" | "server-rack" | "counter";

export interface SchematicFixture {
  kind: SchematicFixtureKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Replace these display coordinates with surveyed/CAD geometry when it is available. */
export interface SchematicRoomGeometry {
  roomId: EntityId;
  boundary: readonly MapPoint[];
  label: MapPoint;
  fixtures?: readonly SchematicFixture[];
}
