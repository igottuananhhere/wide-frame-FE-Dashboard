import type {
  EnergyPoint,
  EnvironmentMetric,
} from "../../features/dashboard/types";

/** Static mock energy history, air quality readings and comparisons used beside live simulation state. */
export const floor1EnergyToday: readonly EnergyPoint[] = [
  { time: "08:00", kwh: 12.4 },
  { time: "09:00", kwh: 25.8 },
  { time: "10:00", kwh: 39.2 },
  { time: "11:00", kwh: 52.6 },
  { time: "12:00", kwh: 65.7 },
  { time: "13:00", kwh: 78.9 },
  { time: "14:00", kwh: 91.8 },
  { time: "15:00", kwh: 104.4 },
  { time: "16:00", kwh: 115.1 },
  { time: "17:00", kwh: 125.6 },
];

export const floor1EnergySummary = {
  total: "125.6 kWh",
  comparison: "+8.2%",
  highestArea: "Khu làm việc",
} as const;

export const floor1AirQualityMetrics = [
    { id: "co2", label: "CO₂", value: "620 ppm", icon: "co2" },
    { id: "pm25", label: "PM2.5", value: "18 µg/m³", icon: "pm25" },
] satisfies readonly EnvironmentMetric[];
