import type { FloorRoomSnapshot } from "../floor/types";
import type { TwinDevice } from "../twin/types";
import type { EnergyPoint } from "../dashboard/types";
import type { EntityId } from "../../types/models";
import type {
  DeviceEnergyReading,
  DeviceHourlyEnergyReading,
  EnergyAreaRow,
  EnergyDeviceRow,
  SuspectDeviceHourlyRow,
} from "./types";

export interface EnergyWasteEstimate {
  excessKwh: number;
  estimatedCostVnd: number;
}

export type EnergyChartSource = "current-day" | "dated-sample";

export interface EnergyHourlyIntervalPoint {
  interval: string;
  startTime: string;
  endTime: string;
  kwh: number;
  startCumulativeKwh: number;
  endCumulativeKwh: number;
}

export interface ExceededHourlyInterval extends EnergyHourlyIntervalPoint {
  thresholdKwh: number;
  excessKwh: number;
}

function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function isExactHourTimestamp(time: string): boolean {
  return /^\d{2}:00$/.test(time);
}

export function selectEnergyChartPoints(
  points: readonly EnergyPoint[],
  source: EnergyChartSource,
  currentTime: string,
): EnergyPoint[] {
  return source === "dated-sample"
    ? [...points]
    : points.filter((point) => point.time <= currentTime);
}

/**
 * Computes completed 60-minute hourly electricity consumption intervals from cumulative readings.
 * - Uses the difference between two consecutive completed hourly readings (point[i].kwh - point[i-1].kwh).
 * - Never treats the initial cumulative reading (e.g. 08:00) as a single hour's consumption.
 * - Never fabricates points for missing hours or merges multi-hour gaps (> 60 minutes) into a single hour.
 * - Never includes incomplete/in-progress hours (non-:00 timestamps or != 60 minutes).
 */
export function selectHourlyEnergyIntervals(
  points: readonly EnergyPoint[],
  source: EnergyChartSource,
  currentTime: string,
): EnergyHourlyIntervalPoint[] {
  const observed = selectEnergyChartPoints(points, source, currentTime);
  if (observed.length < 2) return [];

  const intervals: EnergyHourlyIntervalPoint[] = [];
  for (let index = 1; index < observed.length; index += 1) {
    const prev = observed[index - 1]!;
    const curr = observed[index]!;
    if (!isExactHourTimestamp(prev.time) || !isExactHourTimestamp(curr.time)) {
      continue;
    }
    const prevMinutes = parseTimeToMinutes(prev.time);
    const currMinutes = parseTimeToMinutes(curr.time);
    if (prevMinutes === null || currMinutes === null || currMinutes - prevMinutes !== 60) {
      continue;
    }
    const deltaKwh = Number(Math.max(0, curr.kwh - prev.kwh).toFixed(1));
    intervals.push({
      interval: `${prev.time}–${curr.time}`,
      startTime: prev.time,
      endTime: curr.time,
      kwh: deltaKwh,
      startCumulativeKwh: prev.kwh,
      endCumulativeKwh: curr.kwh,
    });
  }

  return intervals;
}

export function findPeakEnergyInterval(
  intervals: readonly EnergyHourlyIntervalPoint[],
): EnergyHourlyIntervalPoint | null {
  if (intervals.length < 2) return null;
  return intervals.reduce(
    (highest, current) => (current.kwh > highest.kwh ? current : highest),
    intervals[0]!,
  );
}

export function findExceededHourlyIntervals(
  intervals: readonly EnergyHourlyIntervalPoint[],
  thresholdKwh: number,
): ExceededHourlyInterval[] {
  return intervals
    .filter((item) => item.kwh > thresholdKwh)
    .map((item) => ({
      ...item,
      thresholdKwh,
      excessKwh: Number((item.kwh - thresholdKwh).toFixed(1)),
    }));
}

export function findPeakExceededHourlyInterval(
  intervals: readonly EnergyHourlyIntervalPoint[],
  thresholdKwh: number,
): ExceededHourlyInterval | null {
  const exceeded = findExceededHourlyIntervals(intervals, thresholdKwh);
  if (exceeded.length === 0) return null;
  return exceeded.reduce(
    (highest, current) => (current.kwh > highest.kwh ? current : highest),
    exceeded[0]!,
  );
}

/**
 * Builds the ranked list of suspect devices for a selected completed hourly interval.
 * - Uses only explicit hourly device readings for that exact interval (never infers from full-day totals).
 * - Ranks primarily by abnormal increase (`excessKwh = hourlyKwh - baselineHourlyKwh`) descending,
 *   because the device with the highest absolute consumption is not necessarily the cause of the spike.
 */
export function buildSuspectDevicesForInterval(
  interval: string,
  hourlyReadings: readonly DeviceHourlyEnergyReading[],
  devices: readonly TwinDevice[],
  rooms: readonly FloorRoomSnapshot[],
): SuspectDeviceHourlyRow[] {
  return hourlyReadings
    .filter((reading) => reading.interval === interval)
    .flatMap((reading) => {
      const device = devices.find((item) => item.id === reading.deviceId);
      if (!device) return [];
      const roomName = rooms.find((room) => room.id === device.roomId)?.name ?? "—";
      const excessKwh = Number((reading.hourlyKwh - reading.baselineHourlyKwh).toFixed(1));
      const excessPercent = reading.baselineHourlyKwh > 0
        ? Number((((reading.hourlyKwh - reading.baselineHourlyKwh) / reading.baselineHourlyKwh) * 100).toFixed(1))
        : 0;
      return [{
        deviceId: device.id,
        assetId: device.assetId,
        name: device.name,
        type: device.type,
        roomName,
        interval: reading.interval,
        hourlyKwh: reading.hourlyKwh,
        baselineHourlyKwh: reading.baselineHourlyKwh,
        excessKwh,
        excessPercent,
        isSimulated: Boolean(reading.isSimulated),
      }];
    })
    .sort((first, second) => (
      second.excessKwh - first.excessKwh
      || second.excessPercent - first.excessPercent
      || second.hourlyKwh - first.hourlyKwh
    ));
}

export function calculateEnergyWaste(
  actualKwh: number,
  baselineKwh: number,
  rateVndPerKwh: number,
): EnergyWasteEstimate {
  const rawExcessKwh = Math.max(0, actualKwh - baselineKwh);
  return {
    excessKwh: Number(rawExcessKwh.toFixed(1)),
    estimatedCostVnd: Math.round(rawExcessKwh * rateVndPerKwh),
  };
}

export function formatEnergyCostVnd(costVnd: number): string {
  return `${Math.round(costVnd).toLocaleString("vi-VN")} VND`;
}

export function combineEnergyHistoryByFloor(
  historyByFloor: Readonly<Record<EntityId, readonly EnergyPoint[]>>,
  floorIds: readonly EntityId[],
): EnergyPoint[] {
  const histories = floorIds.map((floorId) => historyByFloor[floorId]).filter((history) => history && history.length > 0);
  const reference = histories[0];
  if (!reference) return [];

  return reference.map((point, index) => ({
    time: point.time,
    kwh: Number(histories.reduce((total, history) => total + (history[index]?.kwh ?? 0), 0).toFixed(1)),
  }));
}

export function calculateEnergyTotal(rooms: readonly FloorRoomSnapshot[]): number {
  return rooms.reduce((total, room) => total + room.energyConsumption, 0);
}

export function buildEnergyAreaRows(
  rooms: readonly FloorRoomSnapshot[],
  abnormalThresholdKwh: number | Readonly<Record<EntityId, number>>,
): EnergyAreaRow[] {
  return rooms
    .map((room) => {
      const threshold = typeof abnormalThresholdKwh === "number"
        ? abnormalThresholdKwh
        : abnormalThresholdKwh[room.floorId] ?? Number.POSITIVE_INFINITY;
      return {
        roomId: room.id,
        floorId: room.floorId,
        name: room.name,
        energyKwh: room.energyConsumption,
        abnormal: room.energyConsumption > threshold,
      };
    })
    .sort((first, second) => second.energyKwh - first.energyKwh);
}

export function buildEnergyDeviceRows(
  devices: readonly TwinDevice[],
  rooms: readonly FloorRoomSnapshot[],
  readings: readonly DeviceEnergyReading[],
): EnergyDeviceRow[] {
  return devices
    .flatMap((device) => {
      const reading = readings.find((item) => item.deviceId === device.id);
      if (!reading) return [];
      return [{
        deviceId: device.id,
        name: device.name,
        type: device.type,
        roomName: rooms.find((room) => room.id === device.roomId)?.name ?? "—",
        energyKwh: reading.energyKwh,
        abnormal: reading.energyKwh > reading.abnormalThresholdKwh,
      }];
    })
    .sort((first, second) => second.energyKwh - first.energyKwh);
}
