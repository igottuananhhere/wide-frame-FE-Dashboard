import type { FloorRoomSnapshot } from "../floor/types";
import type { AreaEnvironmentReading, EnvironmentThresholds, RoomAirQualityReading } from "./types";

function boundedStatus(value: number, minimum: number, maximum: number, criticalMaximum?: number) {
  if (criticalMaximum !== undefined && value >= criticalMaximum) return "critical" as const;
  return value < minimum || value > maximum ? "warning" as const : "normal" as const;
}

export function buildAreaEnvironmentReadings(
  rooms: readonly FloorRoomSnapshot[],
  airQuality: readonly RoomAirQualityReading[],
  thresholds: EnvironmentThresholds,
): AreaEnvironmentReading[] {
  return rooms.map((room) => {
    const air = airQuality.find((reading) => reading.roomId === room.id);
    const co2Ppm = air?.co2Ppm ?? 0;
    const pm25Micrograms = air?.pm25Micrograms ?? 0;
    const temperatureStatus = boundedStatus(
      room.temperature,
      thresholds.temperatureMinC,
      thresholds.temperatureMaxC,
      thresholds.temperatureCriticalC,
    );
    const humidityStatus = boundedStatus(room.humidity, thresholds.humidityMinPercent, thresholds.humidityMaxPercent);
    const co2Status = boundedStatus(co2Ppm, 0, thresholds.co2MaxPpm, thresholds.co2CriticalPpm);
    const pm25Status = pm25Micrograms > thresholds.pm25MaxMicrograms ? "warning" as const : "normal" as const;
    const statuses = [temperatureStatus, humidityStatus, co2Status, pm25Status];
    const status = statuses.includes("critical")
      ? "critical"
      : statuses.includes("warning") ? "warning" : "normal";

    return {
      roomId: room.id,
      roomName: room.name,
      temperatureC: room.temperature,
      humidityPercent: room.humidity,
      co2Ppm,
      pm25Micrograms,
      temperatureStatus,
      humidityStatus,
      co2Status,
      pm25Status,
      status,
    };
  });
}
