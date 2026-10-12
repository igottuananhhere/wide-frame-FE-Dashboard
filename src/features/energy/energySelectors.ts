import type { FloorRoomSnapshot } from "../floor/types";
import type { TwinDevice } from "../twin/types";
import type { EnergyPoint } from "../dashboard/types";
import type { EntityId } from "../../types/models";
import type { DeviceEnergyReading, EnergyAreaRow, EnergyDeviceRow } from "./types";

export interface EnergyWasteEstimate {
  excessKwh: number;
  estimatedCostVnd: number;
}

export type EnergyChartSource = "current-day" | "dated-sample";

export function selectEnergyChartPoints(
  points: readonly EnergyPoint[],
  source: EnergyChartSource,
  currentTime: string,
): EnergyPoint[] {
  return source === "dated-sample"
    ? [...points]
    : points.filter((point) => point.time <= currentTime);
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
