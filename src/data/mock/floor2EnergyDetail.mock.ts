import type { DeviceEnergyReading, EnergyComparison, MonthlyEnergyForecastConfig } from "../../features/energy/types";

export const floor2EnergyComparison: EnergyComparison = {
  yesterdayKwh: 132.4,
  changePercent: 6.5,
};

export const floor2AbnormalAreaThresholdKwh = 45;

export const floor2DeviceEnergyReadings: readonly DeviceEnergyReading[] = [
  { deviceId: "device-ac-07", energyKwh: 28.6, abnormalThresholdKwh: 24 },
  { deviceId: "device-temp-22", energyKwh: 0.8, abnormalThresholdKwh: 18 },
  { deviceId: "device-co2-meeting-03", energyKwh: 1.1, abnormalThresholdKwh: 18 },
  { deviceId: "device-light-lobby-02", energyKwh: 4.3, abnormalThresholdKwh: 18 },
  { deviceId: "device-utility-02", energyKwh: 3.7, abnormalThresholdKwh: 18 },
];

/** Fictional meter and bill history used only for the Floor 2 forecast demo. */
export const floor2MonthlyEnergyForecast: MonthlyEnergyForecastConfig = {
  meterId: "METER-02",
  currentPeriodLabel: "01/10–31/10/2026",
  readingDate: "2026-10-08",
  monthToDateKwh: 1_032,
  elapsedDays: 8,
  daysInBillingPeriod: 31,
  baselineTodayKwh: 141,
  averageRateVndPerKwh: 2_500,
  previousMonthLabel: "Tháng 09/2026",
  previousMonthActualKwh: 4_430,
  previousMonthActualCostVnd: 11_075_000,
};
