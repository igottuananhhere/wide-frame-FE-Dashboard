import type { EnergyPoint } from "../../features/dashboard/types";

/** Hourly cumulative energy readings for the fictional Floor 2 demo. */
export const floor2EnergyToday: readonly EnergyPoint[] = [
  { time: "08:00", kwh: 13.8 },
  { time: "09:00", kwh: 28.3 },
  { time: "10:00", kwh: 42.9 },
  { time: "11:00", kwh: 57.5 },
  { time: "12:00", kwh: 72.1 },
  { time: "13:00", kwh: 86.9 },
  { time: "14:00", kwh: 101.1 },
  { time: "15:00", kwh: 115.6 },
  { time: "16:00", kwh: 128.8 },
  { time: "17:00", kwh: 141.0 },
];
