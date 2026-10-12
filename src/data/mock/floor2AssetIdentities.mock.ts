import type { AssetDigitalIdentity } from "../../features/assets/types";

/** Fictional asset records for Floor 2 assets. */
export const floor2AssetIdentities: readonly AssetDigitalIdentity[] = [
  {
    id: "asset-ac-07",
    deviceId: "device-ac-07",
    roomId: "room-workspace-02",
    name: "AC-07",
    manufacturer: "Daikin",
    model: "SkyAir · RZQ125",
    installationDate: "2023-02-11",
    runtimeHours: 3_416,
    maintenanceIntervalHours: 3_424,
    serialNumber: "ICS-HQ2-AC07-230211",
    category: "air-conditioner",
    hasMaintenancePlan: true,
  },
  {
    id: "asset-ahu-02",
    deviceId: "device-ahu-02",
    roomId: "room-workspace-02",
    name: "AHU-02",
    manufacturer: "Trane",
    model: "Climate Changer",
    installationDate: "2023-02-11",
    runtimeHours: 3_100,
    maintenanceIntervalHours: 0,
    serialNumber: "ICS-HQ2-AHU02-230211",
    category: "air-conditioner",
    hasMaintenancePlan: false,
  },
];
