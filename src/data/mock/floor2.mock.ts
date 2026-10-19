import type { FloorRoomSnapshot, SchematicRoomGeometry } from "../../features/floor/types";
import { DEMO_FLOOR_2_ID } from "./buildingLocations";

/** Fictional telemetry used to demo building-wide aggregation and Floor 2 drill-down. */
export const floor2Rooms: readonly FloorRoomSnapshot[] = [
  {
    id: "room-lobby-02",
    floorId: DEMO_FLOOR_2_ID,
    name: "Sảnh phía Đông",
    status: "normal",
    temperature: 24.8,
    humidity: 52,
    energyConsumption: 15.0,
    deviceCount: 4,
    onlineDeviceCount: 4,
    offlineDeviceCount: 0,
  },
  {
    id: "room-workspace-02",
    floorId: DEMO_FLOOR_2_ID,
    name: "Khu làm việc 2A",
    status: "warning",
    temperature: 25.9,
    humidity: 59,
    energyConsumption: 52.4,
    deviceCount: 8,
    onlineDeviceCount: 7,
    offlineDeviceCount: 1,
  },
  {
    id: "room-corridor-02",
    floorId: DEMO_FLOOR_2_ID,
    name: "Corridor 02",
    status: "normal",
    temperature: 25.1,
    humidity: 54,
    energyConsumption: 3.2,
    deviceCount: 1,
    onlineDeviceCount: 1,
    offlineDeviceCount: 0,
  },
  {
    id: "room-meeting-03",
    floorId: DEMO_FLOOR_2_ID,
    name: "Meeting Room 03",
    status: "warning",
    temperature: 26.3,
    humidity: 64,
    energyConsumption: 22.6,
    deviceCount: 4,
    onlineDeviceCount: 4,
    offlineDeviceCount: 0,
  },
  {
    id: "room-pantry-02",
    floorId: DEMO_FLOOR_2_ID,
    name: "Pantry 02",
    status: "normal",
    temperature: 25.3,
    humidity: 56,
    energyConsumption: 12.7,
    deviceCount: 3,
    onlineDeviceCount: 3,
    offlineDeviceCount: 0,
  },
  {
    id: "room-utility-02",
    floorId: DEMO_FLOOR_2_ID,
    name: "Utility Room 02",
    status: "offline",
    temperature: 26.1,
    humidity: 57,
    energyConsumption: 35.1,
    deviceCount: 2,
    onlineDeviceCount: 1,
    offlineDeviceCount: 1,
  },
];

export const floor2SchematicGeometry: readonly SchematicRoomGeometry[] = [
  {
    roomId: "room-lobby-02",
    boundary: [
      { x: 58, y: 55 },
      { x: 330, y: 55 },
      { x: 330, y: 235 },
      { x: 58, y: 235 },
    ],
    label: { x: 194, y: 110 },
    fixtures: [
      { kind: "counter", x: 84, y: 68, width: 92, height: 20 },
      { kind: "meeting-table", x: 96, y: 184, width: 120, height: 34 },
    ],
  },
  {
    roomId: "room-workspace-02",
    boundary: [
      { x: 350, y: 55 },
      { x: 1142, y: 55 },
      { x: 1142, y: 235 },
      { x: 350, y: 235 },
    ],
    label: { x: 746, y: 110 },
    fixtures: [
      { kind: "workstation", x: 390, y: 74, width: 110, height: 32 },
      { kind: "workstation", x: 390, y: 182, width: 110, height: 36 },
      { kind: "workstation", x: 540, y: 182, width: 110, height: 36 },
      { kind: "workstation", x: 840, y: 182, width: 110, height: 36 },
      { kind: "workstation", x: 985, y: 74, width: 110, height: 32 },
      { kind: "workstation", x: 985, y: 182, width: 110, height: 36 },
    ],
  },
  {
    roomId: "room-corridor-02",
    boundary: [
      { x: 58, y: 252 },
      { x: 1142, y: 252 },
      { x: 1142, y: 388 },
      { x: 58, y: 388 },
    ],
    label: { x: 600, y: 304 },
  },
  {
    roomId: "room-meeting-03",
    boundary: [
      { x: 58, y: 405 },
      { x: 430, y: 405 },
      { x: 430, y: 605 },
      { x: 58, y: 605 },
    ],
    label: { x: 244, y: 452 },
    fixtures: [
      { kind: "meeting-table", x: 144, y: 534, width: 200, height: 48 },
    ],
  },
  {
    roomId: "room-pantry-02",
    boundary: [
      { x: 450, y: 405 },
      { x: 760, y: 405 },
      { x: 760, y: 605 },
      { x: 450, y: 605 },
    ],
    label: { x: 605, y: 452 },
    fixtures: [
      { kind: "counter", x: 495, y: 542, width: 220, height: 34 },
    ],
  },
  {
    roomId: "room-utility-02",
    boundary: [
      { x: 780, y: 405 },
      { x: 1142, y: 405 },
      { x: 1142, y: 605 },
      { x: 780, y: 605 },
    ],
    label: { x: 961, y: 452 },
    fixtures: [
      { kind: "server-rack", x: 855, y: 534, width: 88, height: 48 },
      { kind: "server-rack", x: 975, y: 534, width: 88, height: 48 },
    ],
  },
];


