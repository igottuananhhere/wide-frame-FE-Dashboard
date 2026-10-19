import type { FloorCameraMarker } from "../../features/floor/types";
import { ACTIVE_FLOOR_ID, DEMO_FLOOR_2_ID } from "./buildingLocations";

export const TOTAL_BUILDING_CAMERA_QUOTA = 12;

export const FLOOR_CAMERA_QUOTA_BY_FLOOR: Readonly<Record<string, number>> = {
  "ics-headquarters-floor-1": 4,
  "ics-headquarters-floor-2": 2,
  "ics-headquarters-floor-3": 2,
  "ics-headquarters-floor-4": 2,
  "ics-headquarters-floor-5": 2,
};

export const floor1Cameras: readonly FloorCameraMarker[] = [
  {
    id: "cam-f1-01",
    deviceId: "device-cam-f1-01",
    code: "CAM-F1-01",
    name: "Camera Sảnh chính",
    floorId: ACTIVE_FLOOR_ID,
    roomId: "room-lobby-01",
    roomName: "Sảnh",
    locationDetail: "Góc Tây Bắc Sảnh chính · Hướng cửa ra vào & Quầy lễ tân",
    position: { x: 76, y: 74 },
    angleDeg: 45,
    fovDeg: 64,
    rangePx: 112,
    resolution: "1080p · 25fps · H.265",
    streamMode: "live",
    sceneKind: "lobby",
    status: "normal",
  },
  {
    id: "cam-f1-02",
    deviceId: "device-cam-f1-02",
    code: "CAM-F1-02",
    name: "Camera Hành lang Tây",
    floorId: ACTIVE_FLOOR_ID,
    roomId: "room-corridor-01",
    roomName: "Corridor",
    locationDetail: "Đầu hành lang cánh Tây · Quan sát dọc trục hành lang hướng Đông",
    position: { x: 84, y: 322 },
    angleDeg: 0,
    fovDeg: 52,
    rangePx: 158,
    resolution: "1080p · 25fps · H.265",
    streamMode: "live",
    sceneKind: "corridor-west",
    status: "normal",
  },
  {
    id: "cam-f1-03",
    deviceId: "device-cam-f1-03",
    code: "CAM-F1-03",
    name: "Camera Hành lang Đông",
    floorId: ACTIVE_FLOOR_ID,
    roomId: "room-corridor-01",
    roomName: "Corridor",
    locationDetail: "Cuối hành lang cánh Đông · Quan sát ngã rẽ kỹ thuật & lối vào Server",
    position: { x: 1116, y: 322 },
    angleDeg: 180,
    fovDeg: 52,
    rangePx: 158,
    resolution: "1080p · 25fps · H.265",
    streamMode: "live",
    sceneKind: "corridor-east",
    status: "normal",
  },
  {
    id: "cam-f1-04",
    deviceId: "device-cam-f1-04",
    code: "CAM-F1-04",
    name: "Camera Phòng Server",
    floorId: ACTIVE_FLOOR_ID,
    roomId: "room-server-01",
    roomName: "Server Room",
    locationDetail: "Góc Đông Bắc Server Room · Giám sát hành lang tủ rack CRAC",
    position: { x: 1120, y: 74 },
    angleDeg: 142,
    fovDeg: 64,
    rangePx: 118,
    resolution: "1080p · 30fps · H.265",
    streamMode: "live",
    sceneKind: "server-room",
    status: "normal",
  },
];

export const floor2Cameras: readonly FloorCameraMarker[] = [
  {
    id: "cam-f2-01",
    deviceId: "device-cam-f2-01",
    code: "CAM-F2-01",
    name: "Camera Sảnh phía Đông",
    floorId: DEMO_FLOOR_2_ID,
    roomId: "room-lobby-02",
    roomName: "Sảnh phía Đông",
    locationDetail: "Góc Tây Bắc Sảnh Đông · Quan sát sảnh đón & lối thang bộ Tầng 2",
    position: { x: 80, y: 74 },
    angleDeg: 42,
    fovDeg: 64,
    rangePx: 112,
    resolution: "1080p · 25fps · H.265",
    streamMode: "static-sample",
    sceneKind: "lobby",
    status: "normal",
  },
  {
    id: "cam-f2-02",
    deviceId: "device-cam-f2-02",
    code: "CAM-F2-02",
    name: "Camera Hành lang Tầng 2",
    floorId: DEMO_FLOOR_2_ID,
    roomId: "room-corridor-02",
    roomName: "Corridor 02",
    locationDetail: "Đầu Đông hành lang Tầng 2 · Quan sát dọc trục hành lang trung tâm",
    position: { x: 1114, y: 320 },
    angleDeg: 180,
    fovDeg: 52,
    rangePx: 158,
    resolution: "1080p · 25fps · H.265",
    streamMode: "static-sample",
    sceneKind: "corridor-east",
    status: "normal",
  },
];

export const allConfiguredCameras: readonly FloorCameraMarker[] = [
  ...floor1Cameras,
  ...floor2Cameras,
];

export function getCamerasByFloor(floorId: string): readonly FloorCameraMarker[] {
  if (floorId === ACTIVE_FLOOR_ID) return floor1Cameras;
  if (floorId === DEMO_FLOOR_2_ID) return floor2Cameras;
  return allConfiguredCameras.filter((cam) => cam.floorId === floorId);
}

export function getCamerasByRoom(roomId: string): readonly FloorCameraMarker[] {
  return allConfiguredCameras.filter((cam) => cam.roomId === roomId);
}

