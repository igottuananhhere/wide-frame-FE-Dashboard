import type { EntityId } from "../../types/models";

export interface DeviceEnergyReading {
  deviceId: EntityId;
  energyKwh: number;
  abnormalThresholdKwh: number;
}

export interface DeviceHourlyEnergyReading {
  deviceId: EntityId;
  /** Khung giờ hoàn chỉnh (HH:00–HH:00), ví dụ "09:00–10:00" */
  interval: string;
  /** Điện năng tiêu thụ thực tế của thiết bị trong giờ đó (kWh) */
  hourlyKwh: number;
  /** Mức tiêu thụ thông thường trong 1 giờ của chính thiết bị đó (kWh/giờ) */
  baselineHourlyKwh: number;
  /** Đánh dấu dữ liệu mô phỏng */
  isSimulated?: boolean;
}

export interface HourlyEnergyThresholdConfig {
  thresholdKwh: number;
  label: string;
}

export interface SuspectDeviceHourlyRow {
  deviceId: EntityId;
  assetId?: EntityId;
  name: string;
  type: string;
  roomName: string;
  interval: string;
  hourlyKwh: number;
  baselineHourlyKwh: number;
  excessKwh: number;
  excessPercent: number;
  isSimulated: boolean;
}

export interface EnergyComparison {
  yesterdayKwh: number;
  changePercent: number;
}

export interface EnergyAreaRow {
  roomId: EntityId;
  floorId: EntityId;
  name: string;
  energyKwh: number;
  abnormal: boolean;
}

export interface EnergyDeviceRow {
  deviceId: EntityId;
  name: string;
  type: string;
  roomName: string;
  energyKwh: number;
  abnormal: boolean;
}

export interface MonthlyEnergyForecastConfig {
  meterId: EntityId;
  currentPeriodLabel: string;
  readingDate: string;
  monthToDateKwh: number;
  elapsedDays: number;
  daysInBillingPeriod: number;
  baselineTodayKwh: number;
  averageRateVndPerKwh: number;
  previousMonthLabel: string;
  previousMonthActualKwh: number;
  previousMonthActualCostVnd: number;
}

export interface MonthlyEnergyForecast {
  meterId: EntityId;
  currentPeriodLabel: string;
  readingDate: string;
  adjustedMonthToDateKwh: number;
  projectedKwh: number;
  projectedCostVnd: number;
  averageRateVndPerKwh: number;
  previousMonthLabel: string;
  previousMonthActualKwh: number;
  previousMonthActualCostVnd: number;
  changeVnd: number;
  changePercent: number;
}
