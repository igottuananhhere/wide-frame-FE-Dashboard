import type { MonthlyEnergyForecast, MonthlyEnergyForecastConfig } from "./types";

export function combineMonthlyEnergyForecastConfigs(
  configs: readonly MonthlyEnergyForecastConfig[],
  meterId: string,
): MonthlyEnergyForecastConfig | null {
  const first = configs[0];
  if (!first) return null;

  const previousMonthActualKwh = configs.reduce((total, config) => total + config.previousMonthActualKwh, 0);
  const previousMonthActualCostVnd = configs.reduce((total, config) => total + config.previousMonthActualCostVnd, 0);
  return {
    ...first,
    meterId,
    monthToDateKwh: configs.reduce((total, config) => total + config.monthToDateKwh, 0),
    baselineTodayKwh: configs.reduce((total, config) => total + config.baselineTodayKwh, 0),
    previousMonthActualKwh,
    previousMonthActualCostVnd,
    averageRateVndPerKwh: previousMonthActualKwh > 0
      ? previousMonthActualCostVnd / previousMonthActualKwh
      : first.averageRateVndPerKwh,
  };
}

export function calculateMonthlyEnergyForecast(
  config: MonthlyEnergyForecastConfig,
  currentTodayKwh: number,
): MonthlyEnergyForecast {
  const elapsedDays = Math.max(1, Math.min(config.elapsedDays, config.daysInBillingPeriod));
  const adjustedMonthToDateKwh = Math.max(
    0,
    config.monthToDateKwh + currentTodayKwh - config.baselineTodayKwh,
  );
  const projectedKwh = (adjustedMonthToDateKwh / elapsedDays) * config.daysInBillingPeriod;
  const projectedCostVnd = Math.round(projectedKwh * config.averageRateVndPerKwh);
  const changeVnd = projectedCostVnd - config.previousMonthActualCostVnd;
  const changePercent = config.previousMonthActualCostVnd > 0
    ? (changeVnd / config.previousMonthActualCostVnd) * 100
    : 0;

  return {
    meterId: config.meterId,
    currentPeriodLabel: config.currentPeriodLabel,
    readingDate: config.readingDate,
    adjustedMonthToDateKwh,
    projectedKwh,
    projectedCostVnd,
    averageRateVndPerKwh: config.averageRateVndPerKwh,
    previousMonthLabel: config.previousMonthLabel,
    previousMonthActualKwh: config.previousMonthActualKwh,
    previousMonthActualCostVnd: config.previousMonthActualCostVnd,
    changeVnd,
    changePercent,
  };
}
