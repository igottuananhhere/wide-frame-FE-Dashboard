import type { EntityId } from "../../types/models";

export interface DeviceEnergyReading {
  deviceId: EntityId;
  energyKwh: number;
  abnormalThresholdKwh: number;
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
