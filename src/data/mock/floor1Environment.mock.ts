import type { EnvironmentThresholds, RoomAirQualityReading } from "../../features/environment/types";

export const floor1EnvironmentThresholds: EnvironmentThresholds = {
  temperatureMinC: 18,
  temperatureMaxC: 27,
  temperatureCriticalC: 29,
  humidityMinPercent: 30,
  humidityMaxPercent: 70,
  co2MaxPpm: 1000,
  co2CriticalPpm: 1500,
  pm25MaxMicrograms: 35,
};

/** Room-level CO2 and PM2.5 demo readings; temperature and humidity come from the Twin Store. */
export const floor1AirQualityByRoom: readonly RoomAirQualityReading[] = [
  { roomId: "room-lobby-01", co2Ppm: 620, pm25Micrograms: 18 },
  { roomId: "room-workspace-01", co2Ppm: 720, pm25Micrograms: 21 },
  { roomId: "room-server-01", co2Ppm: 650, pm25Micrograms: 16 },
  { roomId: "room-corridor-01", co2Ppm: 590, pm25Micrograms: 15 },
  { roomId: "room-meeting-01", co2Ppm: 740, pm25Micrograms: 22 },
  { roomId: "room-meeting-02", co2Ppm: 1100, pm25Micrograms: 26 },
  { roomId: "room-pantry-01", co2Ppm: 680, pm25Micrograms: 20 },
  { roomId: "room-utility-01", co2Ppm: 530, pm25Micrograms: 16 },
];
