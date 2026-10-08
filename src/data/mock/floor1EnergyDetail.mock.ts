import type { DeviceEnergyReading, EnergyComparison } from "../../features/energy/types";

export const floor1EnergyComparison: EnergyComparison = {
  yesterdayKwh: 116.1,
  changePercent: 8.2,
};

export const floor1AbnormalAreaThresholdKwh = 35;

/** Sampled device-level consumption; unlisted devices are included in their room aggregate. */
export const floor1DeviceEnergyReadings: readonly DeviceEnergyReading[] = [
  { deviceId: "device-server-temp-01", energyKwh: 9.8, abnormalThresholdKwh: 18 },
  { deviceId: "device-temp-04", energyKwh: 0.7, abnormalThresholdKwh: 18 },
  { deviceId: "device-ac-03", energyKwh: 22.4, abnormalThresholdKwh: 18 },
  { deviceId: "device-workspace-08", energyKwh: 0.6, abnormalThresholdKwh: 18 },
  { deviceId: "device-utility-01", energyKwh: 4.5, abnormalThresholdKwh: 18 },
];
