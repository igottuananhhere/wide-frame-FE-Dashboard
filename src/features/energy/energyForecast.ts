import type { MonthlyEnergyForecast, MonthlyEnergyForecastConfig } from "./types";

export interface ForecastSyncOptions {
  latestReadingDate?: string;
  lastUpdatedTimeLabel?: string;
  scopeSummaryLabel?: string;
}

function diffDaysSameMonth(baseIso: string, targetIso: string): number {
  const [by, bm, bd] = baseIso.split("-").map(Number);
  const [ty, tm, td] = targetIso.split("-").map(Number);
  if (!by || !bm || !bd || !ty || !tm || !td) return 0;
  if (by === ty && bm === tm) {
    return Math.max(0, td - bd);
  }
  const baseUtc = Date.UTC(by, bm - 1, bd);
  const targetUtc = Date.UTC(ty, tm - 1, td);
  const diff = Math.round((targetUtc - baseUtc) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function combineMonthlyEnergyForecastConfigs(
  configs: readonly MonthlyEnergyForecastConfig[],
  meterId: string,
): MonthlyEnergyForecastConfig | null {
  const first = configs[0];
  if (!first) return null;

  const previousMonthActualKwh = configs.reduce((total, config) => total + config.previousMonthActualKwh, 0);
  const previousMonthActualCostVnd = configs.reduce((total, config) => total + config.previousMonthActualCostVnd, 0);
  const latestConfigDate = configs.reduce(
    (latest, config) => (config.readingDate > latest ? config.readingDate : latest),
    first.readingDate,
  );

  return {
    ...first,
    meterId,
    readingDate: latestConfigDate,
    monthToDateKwh: Number(configs.reduce((total, config) => total + config.monthToDateKwh, 0).toFixed(1)),
    baselineTodayKwh: Number(configs.reduce((total, config) => total + config.baselineTodayKwh, 0).toFixed(1)),
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
  options?: ForecastSyncOptions,
): MonthlyEnergyForecast {
  const effectiveReadingDate =
    options?.latestReadingDate && options.latestReadingDate > config.readingDate
      ? options.latestReadingDate
      : config.readingDate;

  const additionalElapsedDays = diffDaysSameMonth(config.readingDate, effectiveReadingDate);
  const elapsedDays = Math.max(
    1,
    Math.min(config.daysInBillingPeriod, config.elapsedDays + additionalElapsedDays),
  );

  const extraDaysBaselineKwh = Math.max(0, elapsedDays - config.elapsedDays) * config.baselineTodayKwh;
  const adjustedMonthToDateKwh = Number(
    Math.max(
      0,
      config.monthToDateKwh + extraDaysBaselineKwh + currentTodayKwh - config.baselineTodayKwh,
    ).toFixed(1),
  );

  const dailyAverageKwh = Number((adjustedMonthToDateKwh / elapsedDays).toFixed(1));
  const projectedKwh = Number(((adjustedMonthToDateKwh / elapsedDays) * config.daysInBillingPeriod).toFixed(1));
  const projectedCostVnd = Math.round(projectedKwh * config.averageRateVndPerKwh);
  const changeVnd = projectedCostVnd - config.previousMonthActualCostVnd;
  const changePercent = config.previousMonthActualCostVnd > 0
    ? (changeVnd / config.previousMonthActualCostVnd) * 100
    : 0;

  return {
    meterId: config.meterId,
    currentPeriodLabel: config.currentPeriodLabel,
    readingDate: effectiveReadingDate,
    lastUpdatedTimeLabel: options?.lastUpdatedTimeLabel,
    scopeSummaryLabel: options?.scopeSummaryLabel,
    elapsedDays,
    daysInBillingPeriod: config.daysInBillingPeriod,
    dailyAverageKwh,
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
