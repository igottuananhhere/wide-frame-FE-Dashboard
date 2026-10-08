import type { EntityId } from "../../types/models";

export interface AssetDigitalIdentity {
  id: EntityId;
  deviceId: EntityId;
  roomId: EntityId;
  name: string;
  manufacturer: string;
  model: string;
  installationDate: string;
  runtimeHours: number;
  maintenanceIntervalHours: number;
  serialNumber: string;
}

export type AssetMaintenanceStatus = "normal" | "due-soon" | "due";
