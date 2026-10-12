import { describe, expect, it } from "vitest";
import type { AssetException } from "../dashboard/types";
import type { TwinDevice } from "../twin/types";
import type { FloorRoomSnapshot } from "../floor/types";
import {
  detectDeviceCategory,
  findAssetDigitalIdentity,
  resolveAssetOperationalContext,
} from "./assetDetailSelectors";

const mockDevices: TwinDevice[] = [
  {
    id: "device-ac-03",
    roomId: "room-workspace-01",
    name: "AC-03",
    type: "Điều hòa",
    status: "normal",
    sensorIds: ["sensor-ac-03-runtime"],
    assetId: "asset-ac-03",
    primaryMetric: "Giờ vận hành còn lại",
    maintenanceHoursRemaining: 12,
    lastSeenAt: "2026-10-12T06:00:00.000Z",
  },
  {
    id: "device-utility-01",
    roomId: "room-utility-01",
    name: "UT-01",
    type: "Controller",
    status: "offline",
    sensorIds: ["sensor-utility-01"],
    primaryMetric: "Kết nối",
    lastSeenAt: "2026-10-12T05:50:00.000Z",
  },
  {
    id: "device-workspace-08",
    roomId: "room-workspace-01",
    name: "WS-08",
    type: "Sensor",
    status: "offline",
    sensorIds: ["sensor-workspace-08"],
    primaryMetric: "Kết nối",
    lastSeenAt: "2026-10-12T05:55:00.000Z",
  },
];

const mockRooms: FloorRoomSnapshot[] = [
  {
    id: "room-workspace-01",
    floorId: "ics-headquarters-floor-1",
    name: "Khu làm việc",
    temperature: 25.5,
    humidity: 58,
    energyConsumption: 34.2,
    status: "warning",
    deviceCount: 8,
    onlineDeviceCount: 7,
    offlineDeviceCount: 1,
  },
  {
    id: "room-utility-01",
    floorId: "ics-headquarters-floor-1",
    name: "Utility Room",
    temperature: 24.0,
    humidity: 50,
    energyConsumption: 12.0,
    status: "warning",
    deviceCount: 2,
    onlineDeviceCount: 1,
    offlineDeviceCount: 1,
  },
];

describe("assetDetailSelectors", () => {
  it("detects device category accurately", () => {
    expect(detectDeviceCategory("Điều hòa", "AC-03")).toBe("air-conditioner");
    expect(detectDeviceCategory("Controller", "UT-01")).toBe("controller");
    expect(detectDeviceCategory("Sensor", "WS-08")).toBe("sensor");
    expect(detectDeviceCategory("Chiếu sáng", "LIGHT-01")).toBe("lighting");
    expect(detectDeviceCategory("Máy bơm", "PUMP-01")).toBe("generic");
  });

  it("finds digital asset identity for registered assets and returns undefined for unlinked devices", () => {
    const ac03 = findAssetDigitalIdentity("asset-ac-03", "device-ac-03");
    expect(ac03).toBeDefined();
    expect(ac03?.manufacturer).toBe("Daikin");
    expect(ac03?.serialNumber).toContain("AC03");

    const ut01 = findAssetDigitalIdentity(undefined, "device-utility-01");
    expect(ut01).toBeUndefined();
  });

  it("resolves operational context for an air conditioner with maintenance due soon", () => {
    const item: AssetException = {
      id: "AC-03",
      deviceId: "device-ac-03",
      assetId: "asset-ac-03",
      type: "Điều hòa",
      area: "Khu làm việc",
      status: "warning",
      issue: "Sắp đến hạn bảo trì",
      actionLabel: "Xem hồ sơ tài sản",
      maintenanceHoursRemaining: 12,
    };

    const context = resolveAssetOperationalContext(item, {
      devices: mockDevices,
      rooms: mockRooms,
    });

    expect(context.category).toBe("air-conditioner");
    expect(context.maintenanceStatus).toBe("due-soon");
    expect(context.attentionActionTab).toBe("maintenance");
    expect(context.attentionHeadline).toContain("sắp đến hạn bảo trì");
    expect(context.maintenanceCycleInfo).toBeDefined();
    expect(context.maintenanceCycleInfo?.remainingHours).toBe(12);
    expect(context.maintenanceCycleInfo?.explanation).toContain("không tương đương với số giờ đồng hồ");
    expect(context.assetIdentity).toBeDefined();

    // Check room temperature is marked as room sensor, not built-in AC sensor
    const roomTempMetric = context.metrics.find((m) => m.id === "room-temp");
    expect(roomTempMetric).toBeDefined();
    expect(roomTempMetric?.confirmationNote).toContain("không phải cảm biến tích hợp");
  });

  it("resolves operational context for an offline controller without assuming connected equipment is off", () => {
    const item: AssetException = {
      id: "UT-01",
      deviceId: "device-utility-01",
      type: "Controller",
      area: "Utility Room",
      status: "offline",
      issue: "Mất kết nối",
      actionLabel: "Xem thiết bị",
    };

    const context = resolveAssetOperationalContext(item, {
      devices: mockDevices,
      rooms: mockRooms,
    });

    expect(context.category).toBe("controller");
    expect(context.connectionStatus).toBe("offline");
    expect(context.connectionTargetLabel).toBe("Kết nối bộ điều khiển");
    expect(context.priority).toBe("high");
    expect(context.attentionActionTab).toBe("incidents");
    expect(context.attentionBasis).toContain("Không suy đoán trạng thái vật lý");
    expect(context.assetIdentity).toBeUndefined(); // Truthful: no fake asset identity
  });

  it("handles offline sensors properly and marks data as unconfirmed or past", () => {
    const item: AssetException = {
      id: "WS-08",
      deviceId: "device-workspace-08",
      type: "Sensor",
      area: "Khu làm việc",
      status: "offline",
      issue: "Mất kết nối",
      actionLabel: "Xem thiết bị",
    };

    const context = resolveAssetOperationalContext(item, {
      devices: mockDevices,
      rooms: mockRooms,
      sensors: [
        {
          id: "sensor-workspace-08",
          roomId: "room-workspace-01",
          deviceId: "device-workspace-08",
          name: "WS-08 connection",
          metric: "connection",
          unit: "state",
          status: "offline",
          value: 0,
        },
      ],
    });

    expect(context.category).toBe("sensor");
    expect(context.connectionStatus).toBe("offline");
    expect(context.connectionTargetLabel).toBe("Kết nối cảm biến");
    expect(context.priority).toBe("medium"); // Sensor offline is medium priority
    const metric = context.metrics.find((m) => m.id === "sensor-workspace-08");
    expect(metric?.confirmationNote).toContain("Dữ liệu ghi nhận trước thời điểm mất kết nối");
  });
});
