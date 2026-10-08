import type { EntityId, OperationalStatus } from "../../types/models";

export interface RoomAirQualityReading {
  roomId: EntityId;
  co2Ppm: number;
  pm25Micrograms: number;
}

export interface EnvironmentThresholds {
  temperatureMinC: number;
  temperatureMaxC: number;
  temperatureCriticalC: number;
  humidityMinPercent: number;
  humidityMaxPercent: number;
  co2MaxPpm: number;
  co2CriticalPpm?: number;
  pm25MaxMicrograms: number;
}

export interface AreaEnvironmentReading {
  roomId: EntityId;
  roomName: string;
  temperatureC: number;
  humidityPercent: number;
  co2Ppm: number;
  pm25Micrograms: number;
  temperatureStatus: OperationalStatus;
  humidityStatus: OperationalStatus;
  co2Status: OperationalStatus;
  pm25Status: OperationalStatus;
  status: OperationalStatus;
}
