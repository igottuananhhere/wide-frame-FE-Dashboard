import type { MonthlyEnergyForecastConfig } from "../../features/energy/types";

/** Demo-only meter and billing fixture. The flat rate is illustrative, not a utility tariff. */
export const floor1MonthlyEnergyForecast: MonthlyEnergyForecastConfig = {
  meterId: "METER-01",
  currentPeriodLabel: "01/10–31/10/2026",
  readingDate: "2026-10-08",
  monthToDateKwh: 982.4,
  elapsedDays: 8,
  daysInBillingPeriod: 31,
  baselineTodayKwh: 125.6,
  averageRateVndPerKwh: 2_500,
  previousMonthLabel: "Tháng 09/2026",
  previousMonthActualKwh: 4_050,
  previousMonthActualCostVnd: 10_125_000,
};
