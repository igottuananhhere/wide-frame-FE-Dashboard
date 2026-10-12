import { describe, expect, it } from "vitest";
import type { EnergyPoint } from "../dashboard/types";
import * as selectors from "./energySelectors";

type EnergyChartSource = "current-day" | "dated-sample";
type Selector = (points: readonly EnergyPoint[], source: EnergyChartSource, currentTime: string) => EnergyPoint[];
type EnergyWasteEstimate = { excessKwh: number; estimatedCostVnd: number };
type WasteCalculator = (actualKwh: number, baselineKwh: number, rateVndPerKwh: number) => EnergyWasteEstimate;

const selectEnergyChartPoints = (selectors as unknown as { selectEnergyChartPoints?: Selector })
  .selectEnergyChartPoints;
const calculateEnergyWaste = (selectors as unknown as { calculateEnergyWaste?: WasteCalculator })
  .calculateEnergyWaste;

describe("energy chart history", () => {
  it("omits observations later than the current time", () => {
    const points: EnergyPoint[] = [
      { time: "08:00", kwh: 12.4 },
      { time: "09:00", kwh: 25.8 },
      { time: "10:00", kwh: 39.2 },
      { time: "11:00", kwh: 52.6 },
      { time: "17:00", kwh: 125.6 },
    ];

    expect(selectEnergyChartPoints).toBeTypeOf("function");
    expect(selectEnergyChartPoints!(points, "current-day", "10:24")).toEqual(points.slice(0, 3));
  });

  it("preserves every point in an explicitly dated static sample", () => {
    const points: EnergyPoint[] = [
      { time: "08:00", kwh: 13.8 },
      { time: "17:00", kwh: 141.0 },
    ];

    expect(selectEnergyChartPoints).toBeTypeOf("function");
    expect(selectEnergyChartPoints!(points, "dated-sample", "10:24")).toEqual(points);
  });

  it("calculates excess kWh over baseline and values it at the configured rate", () => {
    expect(calculateEnergyWaste).toBeTypeOf("function");
    expect(calculateEnergyWaste!(132.3, 125.6, 2_500)).toEqual({
      excessKwh: 6.7,
      estimatedCostVnd: 16_750,
    });
  });

  it("reports no waste or cost when actual use is at or below baseline", () => {
    expect(calculateEnergyWaste).toBeTypeOf("function");
    expect(calculateEnergyWaste!(120, 125.6, 2_500)).toEqual({ excessKwh: 0, estimatedCostVnd: 0 });
  });
});
