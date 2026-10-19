import type { RoomAirQualityReading } from "../../features/environment/types";

/** Demonstration-only air quality values for the fictional Floor 2 rooms. */
export const floor2AirQualityByRoom: readonly RoomAirQualityReading[] = [
  { roomId: "room-lobby-02", co2Ppm: 610, pm25Micrograms: 17 },
  { roomId: "room-workspace-02", co2Ppm: 780, pm25Micrograms: 23 },
  { roomId: "room-corridor-02", co2Ppm: 580, pm25Micrograms: 16 },
  { roomId: "room-meeting-03", co2Ppm: 1_120, pm25Micrograms: 24 },
  { roomId: "room-pantry-02", co2Ppm: 690, pm25Micrograms: 19 },
  { roomId: "room-utility-02", co2Ppm: 540, pm25Micrograms: 16 },
];

