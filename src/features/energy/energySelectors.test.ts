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

  it("computes hourly consumption as consecutive deltas without treating 08:00 cumulative as an hour or fabricating missing hours", () => {
    const points: EnergyPoint[] = [
      { time: "08:00", kwh: 12.4 },
      { time: "09:00", kwh: 25.8 },
      { time: "10:00", kwh: 39.5 },
      { time: "12:00", kwh: 65.7 }, // 11:00 missing -> must not fabricate 10:00-11:00 or 11:00-12:00
      { time: "13:00", kwh: 78.9 },
    ];

    expect(selectors.selectHourlyEnergyIntervals(points, "current-day", "08:30")).toEqual([]);

    const intervals = selectors.selectHourlyEnergyIntervals(points, "current-day", "13:30");
    expect(intervals).toEqual([
      {
        interval: "08:00–09:00",
        startTime: "08:00",
        endTime: "09:00",
        kwh: 13.4,
        startCumulativeKwh: 12.4,
        endCumulativeKwh: 25.8,
      },
      {
        interval: "09:00–10:00",
        startTime: "09:00",
        endTime: "10:00",
        kwh: 13.7,
        startCumulativeKwh: 25.8,
        endCumulativeKwh: 39.5,
      },
      {
        interval: "12:00–13:00",
        startTime: "12:00",
        endTime: "13:00",
        kwh: 13.2,
        startCumulativeKwh: 65.7,
        endCumulativeKwh: 78.9,
      },
    ]);

    expect(selectors.findPeakEnergyInterval(intervals)?.interval).toBe("09:00–10:00");
    expect(selectors.findPeakEnergyInterval(intervals)?.kwh).toBe(13.7);
    expect(selectors.findPeakEnergyInterval(intervals.slice(0, 1))).toBeNull();
  });

  it("ignores incomplete in-progress hours and only flags completed hours exceeding 15 kWh", () => {
    const belowThresholdPoints: EnergyPoint[] = [
      { time: "08:00", kwh: 12.4 },
      { time: "09:00", kwh: 25.8 },
      { time: "10:00", kwh: 39.2 },
      // In-progress partial hour 10:00 -> 10:35 with +19.0 kWh delta must not be treated as a completed hour
      { time: "10:35", kwh: 58.2 },
    ];

    const belowIntervals = selectors.selectHourlyEnergyIntervals(belowThresholdPoints, "current-day", "10:40");
    expect(belowIntervals).toHaveLength(2);
    expect(selectors.findPeakExceededHourlyInterval(belowIntervals, 15)).toBeNull();

    const spikePoints: EnergyPoint[] = [
      { time: "08:00", kwh: 12.4 },
      { time: "09:00", kwh: 25.8 },
      { time: "10:00", kwh: 42.3 }, // 09:00–10:00 = 16.5 kWh (+1.5 kWh over 15 kWh)
      { time: "11:00", kwh: 55.7 },
    ];

    const spikeIntervals = selectors.selectHourlyEnergyIntervals(spikePoints, "current-day", "11:30");
    const peakExceeded = selectors.findPeakExceededHourlyInterval(spikeIntervals, 15);
    expect(peakExceeded).toMatchObject({
      interval: "09:00–10:00",
      kwh: 16.5,
      thresholdKwh: 15,
      excessKwh: 1.5,
    });
  });

  it("ranks suspect devices by abnormal increase rather than highest raw kWh and does not infer missing hours", () => {
    const devices = [
      {
        id: "device-server-temp-01",
        roomId: "room-server-01",
        name: "TEMP-SRV-01",
        type: "Sensor",
        status: "normal" as const,
        sensorIds: [],
        primaryMetric: "Nhiệt độ",
        lastSeenAt: "2026-10-15T09:00:00.000Z",
      },
      {
        id: "device-ac-03",
        roomId: "room-workspace-01",
        assetId: "asset-ac-03",
        name: "AC-03",
        type: "Điều hòa",
        status: "normal" as const,
        sensorIds: [],
        primaryMetric: "Điện năng",
        lastSeenAt: "2026-10-15T09:00:00.000Z",
      },
    ];
    const rooms = [
      {
        id: "room-server-01",
        floorId: "ics-headquarters-floor-1",
        name: "Server Room",
        type: "server" as const,
        status: "normal" as const,
        temperature: 25.4,
        humidity: 50,
        energyConsumption: 30,
        deviceCount: 4,
        onlineDeviceCount: 4,
        offlineDeviceCount: 0,
      },
      {
        id: "room-workspace-01",
        floorId: "ics-headquarters-floor-1",
        name: "Khu làm việc",
        type: "workspace" as const,
        status: "normal" as const,
        temperature: 25.6,
        humidity: 55,
        energyConsumption: 42.8,
        deviceCount: 12,
        onlineDeviceCount: 11,
        offlineDeviceCount: 1,
      },
    ];

    const hourlyReadings = [
      // TEMP-SRV-01 has higher raw hourlyKwh (6.0 kWh) but only +0.2 kWh above its 5.8 kWh baseline
      { deviceId: "device-server-temp-01", interval: "09:00–10:00", hourlyKwh: 6.0, baselineHourlyKwh: 5.8, isSimulated: true },
      // AC-03 has lower raw hourlyKwh (5.3 kWh) but +3.1 kWh abnormal increase above its 2.2 kWh baseline
      { deviceId: "device-ac-03", interval: "09:00–10:00", hourlyKwh: 5.3, baselineHourlyKwh: 2.2, isSimulated: true },
    ];

    const ranked = selectors.buildSuspectDevicesForInterval("09:00–10:00", hourlyReadings, devices, rooms);
    expect(ranked.map((item) => item.name)).toEqual(["AC-03", "TEMP-SRV-01"]);
    expect(ranked[0]?.excessKwh).toBe(3.1);

    // Interval with no hourly device readings must return empty array
    expect(selectors.buildSuspectDevicesForInterval("14:00–15:00", hourlyReadings, devices, rooms)).toEqual([]);
  });
});
