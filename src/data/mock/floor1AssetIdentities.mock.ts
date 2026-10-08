import type { AssetDigitalIdentity } from "../../features/assets/types";

/** Digital identity demo record linked to the AC-03 Twin Store device. */
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
  },
];
