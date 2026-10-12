import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssetException } from "../../features/dashboard/types";
import type { TwinAlert, TwinDevice, TwinSensor, TwinSimulationEvent } from "../../features/twin/types";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import type { Floor } from "../../types/models";
import type { DeviceEnergyReading } from "../../features/energy/types";
import { useAuthStore } from "../../features/auth/authStore";
import { useTwinStore } from "../../features/twin/twinStore";
import AssetDetailDrawer from "./AssetDetailDrawer";

const mockDeviceAc03: TwinDevice = {
  id: "device-ac-03",
  name: "AC Server Unit 01",
  type: "hvac",
  roomId: "room-server-01",
  status: "warning",
  sensorIds: ["sensor-temp-01"],
  primaryMetric: "temperature",
  lastSeenAt: "2026-03-31T08:00:00Z",
  maintenanceHoursRemaining: 12,
};

const mockDeviceUtility01: TwinDevice = {
  id: "device-utility-01",
  name: "Power Controller Main",
  type: "controller",
  roomId: "room-utility-01",
  status: "offline",
  sensorIds: [],
  primaryMetric: "status",
  lastSeenAt: "2026-03-30T10:00:00Z",
};

const mockSensorTemp01: TwinSensor = {
  id: "sensor-temp-01",
  deviceId: "device-ac-03",
  name: "Server Temp Sensor 01",
  metric: "temperature",
  roomId: "room-server-01",
  value: 28.5,
  unit: "°C",
  status: "warning",
};

const mockRoomServer: FloorRoomSnapshot = {
  id: "room-server-01",
  name: "Phòng máy chủ",
  floorId: "floor-01",
  status: "normal",
  temperature: 24.5,
  humidity: 55,
  deviceCount: 3,
  onlineDeviceCount: 2,
  offlineDeviceCount: 1,
  energyConsumption: 42.5,
};

const mockRoomUtility: FloorRoomSnapshot = {
  id: "room-utility-01",
  name: "Phòng kỹ thuật điện",
  floorId: "floor-01",
  status: "warning",
  temperature: 28.0,
  humidity: 60,
  deviceCount: 2,
  onlineDeviceCount: 0,
  offlineDeviceCount: 2,
  energyConsumption: 12.0,
};

const mockFloor1: Floor = {
  id: "floor-01",
  name: "Tầng 1",
  buildingId: "bldg-01",
  level: 1,
  dataAvailability: "simulation",
  roomIds: ["room-server-01", "room-utility-01"],
};

const mockAlertCrit: TwinAlert = {
  id: "alert-temp-crit-01",
  title: "Nhiệt độ phòng máy chủ vượt ngưỡng 28°C",
  message: "Nhiệt độ phòng máy chủ tăng nhanh vượt ngưỡng cảnh báo",
  severity: "critical",
  status: "active",
  createdAt: "2026-03-31T08:02:00Z",
  buildingId: "bldg-01",
  roomId: "room-server-01",
  location: "Phòng máy chủ",
  kind: "critical",
  occurredAt: Date.now() - 3600000,
  correlationKey: "room-server-01-temp",
  deviceId: "device-ac-03",
  floorId: "floor-01",
};

const mockEnergyReading: DeviceEnergyReading = {
  deviceId: "device-ac-03",
  energyKwh: 18.6,
  abnormalThresholdKwh: 30,
};

const mockEvent: TwinSimulationEvent = {
  type: "TelemetryUpdated",
  roomId: "room-server-01",
  temperature: 28.5,
  humidity: 55,
  occurredAt: Date.now() - 3600000,
};

const sampleAcItem: AssetException = {
  id: "AC-03",
  deviceId: "device-ac-03",
  assetId: "asset-ac-03",
  type: "Điều hòa",
  area: "Phòng máy chủ",
  status: "warning",
  issue: "Sắp đến hạn bảo trì",
  actionLabel: "Xem hồ sơ tài sản",
  maintenanceHoursRemaining: 12,
};

const sampleUtilityItem: AssetException = {
  id: "UT-01",
  deviceId: "device-utility-01",
  type: "Controller",
  area: "Phòng kỹ thuật điện",
  status: "offline",
  issue: "Mất kết nối",
  actionLabel: "Xem thiết bị",
};

afterEach(() => {
  cleanup();
});

describe("AssetDetailDrawer", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { displayName: "Nguyễn Quản Trị", username: "admin", role: "Admin" },
      role: "Admin",
    });
    useTwinStore.setState({
      alerts: [mockAlertCrit],
      events: [mockEvent],
    });
  });

  it("renders header hierarchy, identity tags, and status matrix", () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <AssetDetailDrawer
          item={sampleAcItem}
          devices={[mockDeviceAc03]}
          sensors={[mockSensorTemp01]}
          rooms={[mockRoomServer]}
          floors={[mockFloor1]}
          alerts={[mockAlertCrit]}
          energyReadings={[mockEnergyReading]}
          events={[mockEvent]}
          onClose={handleClose}
        />
      </MemoryRouter>,
    );

    // Dialog should be present with accessible labeling
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();

    // Breadcrumb: Building / Floor / Room
    expect(screen.getByText("ICS Headquarters")).toBeTruthy();
    expect(screen.getByText("Tầng 1")).toBeTruthy();
    expect(screen.getByText("Phòng máy chủ")).toBeTruthy();

    // Title and Code
    expect(screen.getAllByText("AC-03").length).toBeGreaterThanOrEqual(1);

    // 4 Status Dimensions in Matrix
    expect(screen.getByText("Trạng thái vận hành")).toBeTruthy();
    expect(screen.getByText("Kết nối thiết bị")).toBeTruthy();
    expect(screen.getByText("Tình trạng bảo trì")).toBeTruthy();
    expect(screen.getByText("Mức độ ưu tiên")).toBeTruthy();

    // Attention Banner
    expect(screen.getByRole("region", { name: "Khối cần chú ý" })).toBeTruthy();
  });

  it("navigates through all 5 tabs and displays relevant content", () => {
    render(
      <MemoryRouter>
        <AssetDetailDrawer
          item={sampleAcItem}
          devices={[mockDeviceAc03]}
          sensors={[mockSensorTemp01]}
          rooms={[mockRoomServer]}
          floors={[mockFloor1]}
          alerts={[mockAlertCrit]}
          energyReadings={[mockEnergyReading]}
          events={[mockEvent]}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Initial tab is Overview
    expect(screen.getByRole("tab", { name: "Tổng quan" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Tình trạng hiện tại")).toBeTruthy();
    expect(screen.getByText(/Vấn đề đang mở/i)).toBeTruthy();

    // Switch to Tab 2: Dữ liệu & vận hành
    fireEvent.click(screen.getByRole("tab", { name: "Dữ liệu & vận hành" }));
    expect(screen.getByRole("tab", { name: "Dữ liệu & vận hành" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Thông số đo đạc & Vận hành chi tiết")).toBeTruthy();
    // Confirmed vs Estimated badges
    expect(screen.getAllByText("Xác nhận cảm biến").length).toBeGreaterThanOrEqual(1);

    // Switch to Tab 3: Bảo trì
    fireEvent.click(screen.getByRole("tab", { name: "Bảo trì" }));
    expect(screen.getByRole("tab", { name: "Bảo trì" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Kế hoạch bảo trì chu kỳ")).toBeTruthy();
    // Operational hours remaining threshold formula explanation
    expect(screen.getByText(/Ngưỡng chu kỳ định mức/i)).toBeTruthy();
    // Missing CMMS API banner
    expect(screen.getByText(/API CMMS Backend: Chưa kết nối/i)).toBeTruthy();
    // Save button disabled
    const disabledSaveBtn = screen.getByRole("button", { name: /Lưu phiếu bảo trì/i });
    expect(disabledSaveBtn).toBeTruthy();
    expect(disabledSaveBtn.hasAttribute("disabled")).toBe(true);

    // Switch to Tab 4: Sự cố & nhật ký
    fireEvent.click(screen.getByRole("tab", { name: "Sự cố & nhật ký" }));
    expect(screen.getByRole("tab", { name: "Sự cố & nhật ký" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText(/Sự cố & Bất thường liên quan/i)).toBeTruthy();
    expect(screen.getByText(mockAlertCrit.title)).toBeTruthy();

    // Switch to Tab 5: Hồ sơ & liên kết
    fireEvent.click(screen.getByRole("tab", { name: "Hồ sơ & liên kết" }));
    expect(screen.getByRole("tab", { name: "Hồ sơ & liên kết" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText(/Hồ sơ tài sản \(Digital Identity\)/i)).toBeTruthy();
    expect(screen.getByText(/Mã tài sản \(Asset ID\):/i)).toBeTruthy();
    expect(screen.getByText(/Thiết bị liên kết \(Device ID\):/i)).toBeTruthy();
  });

  it("handles alert acknowledgment in Tab 4 for Admin", () => {
    render(
      <MemoryRouter>
        <AssetDetailDrawer
          item={sampleAcItem}
          devices={[mockDeviceAc03]}
          sensors={[mockSensorTemp01]}
          rooms={[mockRoomServer]}
          floors={[mockFloor1]}
          alerts={[mockAlertCrit]}
          events={[mockEvent]}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Switch to Incidents tab
    fireEvent.click(screen.getByRole("tab", { name: "Sự cố & nhật ký" }));

    // Find acknowledge button
    const ackBtn = screen.getByRole("button", { name: /Tiếp nhận cảnh báo/i });
    expect(ackBtn).toBeTruthy();
    expect(ackBtn.hasAttribute("disabled")).toBe(false);

    // Click acknowledge
    fireEvent.click(ackBtn);

    // Store state should be updated to acknowledged
    const currentAlert = useTwinStore.getState().alerts.find((a) => a.id === mockAlertCrit.id);
    expect(currentAlert?.status).toBe("acknowledged");
  });

  it("prevents alert acknowledgment and shows note for Viewer role", () => {
    useAuthStore.setState({
      user: { displayName: "Trần Quan Sát", username: "viewer", role: "Viewer" },
      role: "Viewer",
    });

    render(
      <MemoryRouter>
        <AssetDetailDrawer
          item={sampleAcItem}
          devices={[mockDeviceAc03]}
          sensors={[mockSensorTemp01]}
          rooms={[mockRoomServer]}
          floors={[mockFloor1]}
          alerts={[mockAlertCrit]}
          events={[mockEvent]}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Sự cố & nhật ký" }));
    const disabledAckBtn = screen.getByRole("button", { name: /Tiếp nhận cảnh báo/i });
    expect(disabledAckBtn.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Cần quyền Admin để tiếp nhận")).toBeTruthy();
  });

  it("distinguishes device without assetId and does not fabricate fake profile", () => {
    render(
      <MemoryRouter>
        <AssetDetailDrawer
          item={sampleUtilityItem}
          devices={[mockDeviceUtility01]}
          sensors={[]}
          rooms={[mockRoomUtility]}
          floors={[mockFloor1]}
          alerts={[]}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    // Switch to Tab 5
    fireEvent.click(screen.getByRole("tab", { name: "Hồ sơ & liên kết" }));
    // Device without assetId
    expect(screen.getByText(/Thiết bị chưa có hồ sơ tài sản độc lập/i)).toBeTruthy();
    // Device details are shown
    expect(screen.getByText(mockDeviceUtility01.name)).toBeTruthy();
  });

  it("closes when close button is clicked or Escape is pressed", () => {
    const handleClose = vi.fn();
    render(
      <MemoryRouter>
        <AssetDetailDrawer
          item={sampleAcItem}
          devices={[mockDeviceAc03]}
          sensors={[mockSensorTemp01]}
          rooms={[mockRoomServer]}
          floors={[mockFloor1]}
          onClose={handleClose}
        />
      </MemoryRouter>,
    );

    // Close button
    const closeBtn = screen.getByRole("button", { name: "Đóng bảng chi tiết tài sản" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Escape key
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
