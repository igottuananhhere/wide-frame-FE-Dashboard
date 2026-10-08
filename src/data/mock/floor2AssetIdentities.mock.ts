import type { AssetDigitalIdentity } from "../../features/assets/types";

/** Fictional asset record linked to the Floor 2 AC-07 mock device. */
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
  },
];
