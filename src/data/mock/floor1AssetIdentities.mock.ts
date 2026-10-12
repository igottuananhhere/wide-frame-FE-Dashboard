import type { AssetDigitalIdentity } from "../../features/assets/types";

/** Digital identity demo records for Floor 1 assets. */
export const floor1AssetIdentities: readonly AssetDigitalIdentity[] = [
  {
    id: "asset-ac-03",
    deviceId: "device-ac-03",
    roomId: "room-workspace-01",
    name: "AC-03",
    manufacturer: "Daikin",
    model: "VRV IV · RXQ12T",
    installationDate: "2022-05-18",
    runtimeHours: 4862,
    maintenanceIntervalHours: 4874,
    serialNumber: "ICS-HQ1-AC03-220518",
    category: "air-conditioner",
    hasMaintenancePlan: true,
  },
  {
    id: "asset-ahu-01",
    deviceId: "device-ahu-01",
    roomId: "room-workspace-01",
    name: "AHU-01",
    manufacturer: "Trane",
    model: "Climate Changer",
    installationDate: "2022-05-18",
    runtimeHours: 4200,
    maintenanceIntervalHours: 0,
    serialNumber: "ICS-HQ1-AHU01-220518",
    category: "air-conditioner",
    hasMaintenancePlan: false,
  },
];
