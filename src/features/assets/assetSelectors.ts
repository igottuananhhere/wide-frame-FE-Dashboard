import type { TwinDevice } from "../twin/types";
import type { AssetMaintenanceStatus } from "./types";

export function getAssetMaintenanceStatus(device: TwinDevice | undefined): AssetMaintenanceStatus {
  if (!device || device.maintenanceHoursRemaining === undefined) return "normal";
  if (device.maintenanceHoursRemaining <= 0) return "due";
  if (device.maintenanceHoursRemaining <= 12) return "due-soon";
  return "normal";
}
