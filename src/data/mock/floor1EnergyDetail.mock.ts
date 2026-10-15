import type { EnergyPoint } from "../../features/dashboard/types";
import type {
  DeviceEnergyReading,
  DeviceHourlyEnergyReading,
  EnergyComparison,
  HourlyEnergyThresholdConfig,
} from "../../features/energy/types";

export const floor1EnergyComparison: EnergyComparison = {
  yesterdayKwh: 116.1,
  changePercent: 8.2,
};

export const floor1AbnormalAreaThresholdKwh = 35;

/** Ngưỡng cảnh báo tiêu thụ theo giờ giả định cho POC (có thể thay đổi trong cấu hình). */
export const floor1HourlyEnergyThresholdConfig: HourlyEnergyThresholdConfig = {
  thresholdKwh: 15,
  label: "Ngưỡng cảnh báo mô phỏng · 15 kWh/giờ",
};

/** Sampled device-level consumption; unlisted devices are included in their room aggregate. */
export const floor1DeviceEnergyReadings: readonly DeviceEnergyReading[] = [
  { deviceId: "device-server-temp-01", energyKwh: 9.8, abnormalThresholdKwh: 18 },
  { deviceId: "device-temp-04", energyKwh: 0.7, abnormalThresholdKwh: 18 },
  { deviceId: "device-ac-03", energyKwh: 22.4, abnormalThresholdKwh: 18 },
  { deviceId: "device-workspace-08", energyKwh: 0.6, abnormalThresholdKwh: 18 },
  { deviceId: "device-utility-01", energyKwh: 4.5, abnormalThresholdKwh: 18 },
];

/** Dữ liệu điện năng theo giờ của các thiết bị có đo đếm riêng tại Floor 1 ở trạng thái bình thường (dưới ngưỡng 15 kWh/giờ). */
export const floor1HourlyDeviceReadings: readonly DeviceHourlyEnergyReading[] = [
  { deviceId: "device-ac-03", interval: "08:00–09:00", hourlyKwh: 2.2, baselineHourlyKwh: 2.2, isSimulated: true },
  { deviceId: "device-server-temp-01", interval: "08:00–09:00", hourlyKwh: 1.1, baselineHourlyKwh: 1.1, isSimulated: true },
  { deviceId: "device-temp-04", interval: "08:00–09:00", hourlyKwh: 0.1, baselineHourlyKwh: 0.1, isSimulated: true },
  { deviceId: "device-ac-03", interval: "09:00–10:00", hourlyKwh: 2.2, baselineHourlyKwh: 2.2, isSimulated: true },
  { deviceId: "device-server-temp-01", interval: "09:00–10:00", hourlyKwh: 1.1, baselineHourlyKwh: 1.1, isSimulated: true },
  { deviceId: "device-temp-04", interval: "09:00–10:00", hourlyKwh: 0.1, baselineHourlyKwh: 0.1, isSimulated: true },
];

/** Kịch bản mô phỏng vượt ngưỡng theo giờ: khung giờ 09:00–10:00 đạt 16.5 kWh (42.3 - 25.8 = 16.5 kWh, vượt ngưỡng 15 kWh là +1.5 kWh). */
export const floor1SpikeEnergyHistory: readonly EnergyPoint[] = [
  { time: "08:00", kwh: 12.4 },
  { time: "09:00", kwh: 25.8 },
  { time: "10:00", kwh: 42.3 },
  { time: "11:00", kwh: 55.7 },
  { time: "12:00", kwh: 68.8 },
  { time: "13:00", kwh: 82.0 },
  { time: "14:00", kwh: 94.9 },
  { time: "15:00", kwh: 107.5 },
  { time: "16:00", kwh: 118.2 },
  { time: "17:00", kwh: 128.7 },
];

/** Dữ liệu mô phỏng thiết bị theo giờ khi kích hoạt kịch bản vượt ngưỡng 16.5 kWh tại khung giờ 09:00–10:00. */
export const floor1SpikeHourlyDeviceReadings: readonly DeviceHourlyEnergyReading[] = [
  { deviceId: "device-ac-03", interval: "08:00–09:00", hourlyKwh: 2.2, baselineHourlyKwh: 2.2, isSimulated: true },
  { deviceId: "device-server-temp-01", interval: "08:00–09:00", hourlyKwh: 1.1, baselineHourlyKwh: 1.1, isSimulated: true },
  { deviceId: "device-temp-04", interval: "08:00–09:00", hourlyKwh: 0.1, baselineHourlyKwh: 0.1, isSimulated: true },
  { deviceId: "device-ac-03", interval: "09:00–10:00", hourlyKwh: 5.3, baselineHourlyKwh: 2.2, isSimulated: true },
  { deviceId: "device-server-temp-01", interval: "09:00–10:00", hourlyKwh: 1.3, baselineHourlyKwh: 1.1, isSimulated: true },
  { deviceId: "device-temp-04", interval: "09:00–10:00", hourlyKwh: 0.1, baselineHourlyKwh: 0.1, isSimulated: true },
];
