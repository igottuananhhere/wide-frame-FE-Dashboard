import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import { floor1Rooms, floor1SchematicGeometry } from "../../data/mock/floor1.mock";
import { useAuthStore } from "../auth/authStore";
import { useLoginTransitionStore } from "../auth/loginTransitionStore";
import { useTwinStore } from "../twin/twinStore";

beforeEach(async () => {
  sessionStorage.clear();
  useAuthStore.setState({
    user: { username: "admin", displayName: "ICS Platform Administrator", role: "Admin" },
    role: "Admin",
    isAuthenticated: true,
  });
  useLoginTransitionStore.setState({ isTransitioning: false });
  useTwinStore.getState().resetSimulation();
  useTwinStore.getState().selectRoom(null);
  await act(async () => {
    await router.navigate("/dashboard/overview");
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  useLoginTransitionStore.setState({ isTransitioning: false });
  useTwinStore.getState().resetSimulation();
  useTwinStore.getState().selectRoom(null);
});

async function openFloorOneDashboard() {
  render(<App />);
  fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
    target: { value: "ics-headquarters-floor-1" },
  });
  await screen.findByRole("heading", { name: "Tổng quan vận hành Floor 1" });
}

describe("Floor 1 interactive map", () => {
  it("contains all eight Floor 1 rooms and matches the overview mock totals", () => {
    expect(floor1Rooms.map((room) => room.name)).toEqual([
      "Sảnh",
      "Khu làm việc",
      "Server Room",
      "Corridor",
      "Meeting Room 01",
      "Meeting Room 02",
      "Pantry",
      "Utility Room",
    ]);
    expect(floor1Rooms.every((room) => room.floorId === "ics-headquarters-floor-1")).toBe(true);
    expect(floor1SchematicGeometry).toHaveLength(8);
    expect(floor1Rooms.reduce((total, room) => total + room.energyConsumption, 0)).toBeCloseTo(125.6);
    expect(floor1Rooms.reduce((total, room) => total + room.deviceCount, 0)).toBe(30);
    expect(floor1Rooms.reduce((total, room) => total + room.onlineDeviceCount, 0)).toBe(28);
    expect(floor1Rooms.reduce((total, room) => total + room.offlineDeviceCount, 0)).toBe(2);
  });

  it("shows room telemetry in a drawer after selecting a room and links to DevicesPage", async () => {
    await openFloorOneDashboard();

    const serverRoom = await screen.findByRole("button", { name: /server room/i });
    fireEvent.click(serverRoom);

    const drawer = screen.getByRole("complementary", { name: /server room/i });
    expect(within(drawer).getByRole("heading", { name: "Server Room" })).toBeTruthy();
    expect(drawer.textContent).toContain("Bình thường");
    expect(drawer.textContent).toContain("25.4°C");
    expect(drawer.textContent).toContain("61%");
    expect(drawer.textContent).toContain("23.4 kWh");
    expect(drawer.textContent).toContain("5");
    expect(within(drawer).getByRole("region", { name: "Camera an ninh trong khu vực" })).toBeTruthy();
    expect(drawer.textContent).toContain("CAM-F1-04");
    expect(drawer.textContent).toContain("KHUNG HÌNH MÔ PHỎNG");
    expect(drawer.textContent).not.toContain("18/10/2026");
    expect(drawer.textContent).not.toContain("REC · LIVE");

    const detailsLink = within(drawer).getByRole("link", { name: "Xem chi tiết" });
    expect(detailsLink.getAttribute("href")).toBe("/dashboard/devices?roomId=room-server-01&floorId=ics-headquarters-floor-1");
    expect(within(drawer).queryByRole("link", { name: "Xem trên 3D" })).toBeNull();
    expect(within(drawer).queryByText("Mô hình 3D · Chưa khả dụng")).toBeNull();

    fireEvent.click(detailsLink);
    expect(await screen.findByRole("heading", { name: "Thiết bị Floor 1" })).toBeTruthy();
    expect(screen.getByRole("status", { name: /devices filtered by server room/i })).toBeTruthy();
    expect(screen.getByRole("row", { name: /temp-srv-01/i })).toBeTruthy();
    expect(window.location.search).toBe("?roomId=room-server-01&floorId=ics-headquarters-floor-1");
    fireEvent.click(screen.getByRole("button", { name: "Xóa lọc khu vực" }));
    expect(window.location.search).toBe("?floorId=ics-headquarters-floor-1");
    expect(screen.getByRole("row", { name: /temp-04/i })).toBeTruthy();
  }, 30000);

  it("selects a room from the keyboard and exposes its state in the map", async () => {
    await openFloorOneDashboard();

    const meetingRoom = await screen.findByRole("button", { name: /meeting room 02/i });
    meetingRoom.focus();
    expect(meetingRoom.getAttribute("aria-pressed")).toBe("false");
    fireEvent.keyDown(meetingRoom, { key: "Enter" });

    expect(meetingRoom.getAttribute("aria-pressed")).toBe("true");
    const drawer = screen.getByRole("complementary", { name: /meeting room 02/i });
    expect(drawer.textContent).toContain("Bình thường");
    const closeButton = within(drawer).getByRole("button", { name: "Close room details" });
    await waitFor(() => expect(document.activeElement).toBe(closeButton));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("complementary", { name: /meeting room 02/i })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(meetingRoom));
  }, 15000);

  it("returns focus to the selected map room when the drawer close button is used", async () => {
    await openFloorOneDashboard();
    const serverRoom = await screen.findByRole("button", { name: /server room/i });
    serverRoom.focus();
    fireEvent.click(serverRoom);

    const drawer = screen.getByRole("complementary", { name: /server room/i });
    const closeButton = within(drawer).getByRole("button", { name: "Close room details" });
    await waitFor(() => expect(document.activeElement).toBe(closeButton));
    fireEvent.click(closeButton);
    await waitFor(() => expect(document.activeElement).toBe(serverRoom));
  }, 15000);

  it("shows a lightweight room readout with instantaneous kW and cumulative kWh", async () => {
    await openFloorOneDashboard();

    const serverRoom = await screen.findByRole("button", { name: /server room/i });
    fireEvent.mouseEnter(serverRoom);
    expect(screen.getByRole("tooltip").textContent).toContain("25.4°C");
    expect(screen.getByRole("tooltip").textContent).toContain("kW tức thời");
  });

  it("persists shared room controls across room switches and enforces clean device identities", async () => {
    await openFloorOneDashboard();

    const mapPanel = screen.getByRole("region", { name: "Sơ đồ vận hành Floor 1" });
    const attentionPanel = screen.getByRole("region", { name: "Sự cố chưa giải quyết" });
    const primaryGrid = mapPanel.closest(".overview-primary-grid");
    expect(primaryGrid).toBeTruthy();
    expect(primaryGrid?.contains(attentionPanel)).toBe(true);

    // Select Server Room
    fireEvent.click(await screen.findByRole("button", { name: /server room/i }));
    let drawer = screen.getByRole("complementary", { name: /server room details/i });
    expect(mapPanel.contains(drawer)).toBe(false);
    expect(primaryGrid?.contains(drawer)).toBe(true);

    const lightSwitch = within(drawer).getByRole("switch", { name: /Công tắc Đèn kỹ thuật phòng Server/i });
    expect(lightSwitch.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(lightSwitch);
    expect(lightSwitch.getAttribute("aria-checked")).toBe("true");

    const acPowerBtn = within(drawer).getByRole("button", { name: /Nguồn Hệ thống làm mát CRAC-01/i });
    expect(acPowerBtn.getAttribute("aria-pressed")).toBe("true");

    const tempUpBtn = within(drawer).getByRole("button", { name: /Tăng nhiệt độ Hệ thống làm mát CRAC-01/i });
    expect(within(drawer).getAllByText("20°C").length).toBeGreaterThan(0);
    fireEvent.click(tempUpBtn);
    expect(within(drawer).getAllByText("21°C").length).toBeGreaterThan(0);

    const modeGroup = within(drawer).getByRole("group", { name: /Chế độ Hệ thống làm mát CRAC-01/i });
    const ecoBtn = within(modeGroup).getByRole("button", { name: "Eco" });
    expect(ecoBtn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(ecoBtn);
    expect(ecoBtn.getAttribute("aria-pressed")).toBe("true");

    // Switch to Corridor -> has 2 cameras (CAM-F1-02, CAM-F1-03), then switch back to Server Room -> state must persist!
    fireEvent.click(screen.getByRole("button", { name: /corridor, bình thường/i }));
    drawer = screen.getByRole("complementary", { name: /corridor details/i });
    expect(within(drawer).getByRole("region", { name: "Điều khiển đèn" })).toBeTruthy();
    expect(within(drawer).getByRole("region", { name: "Camera an ninh trong khu vực" })).toBeTruthy();
    expect(within(drawer).getByRole("tab", { name: /CAM-F1-02/i })).toBeTruthy();
    expect(within(drawer).getByRole("tab", { name: /CAM-F1-03/i })).toBeTruthy();

    // Switch back to Server Room -> light is still ON, CRAC-01 is still 21°C and Eco
    fireEvent.click(screen.getByRole("button", { name: /server room/i }));
    drawer = screen.getByRole("complementary", { name: /server room details/i });
    expect(within(drawer).getByRole("switch", { name: /Công tắc Đèn kỹ thuật phòng Server/i }).getAttribute("aria-checked")).toBe("true");
    expect(within(drawer).getAllByText("21°C").length).toBeGreaterThan(0);
    expect(within(within(drawer).getByRole("group", { name: /Chế độ Hệ thống làm mát CRAC-01/i })).getByRole("button", { name: "Eco" }).getAttribute("aria-pressed")).toBe("true");

    // Switch to Khu làm việc -> WS-08 is strictly a Sensor (NOT a light switch!)
    fireEvent.click(screen.getByRole("button", { name: /khu làm việc/i }));
    drawer = screen.getByRole("complementary", { name: /khu làm việc details/i });
    expect(within(drawer).queryByRole("switch", { name: /WS-08/i })).toBeNull();
    expect(within(drawer).getByText("WS-08")).toBeTruthy();

    // Switch to Utility Room -> has offline light LT-UT-01 disabled
    fireEvent.click(screen.getByRole("button", { name: /utility room/i }));
    drawer = screen.getByRole("complementary", { name: /utility room details/i });
    const offlineLightSwitch = within(drawer).getByRole("switch", { name: /Công tắc Đèn buồng kỹ thuật/i });
    expect((offlineLightSwitch as HTMLButtonElement).disabled).toBe(true);

    // Close drawer with X button
    fireEvent.click(within(drawer).getByRole("button", { name: "Close room details" }));
    expect(screen.queryByRole("complementary", { name: /details/i })).toBeNull();
  }, 15000);

  it("displays Out of Demo Scope state when selecting Floors 2–5", async () => {
    render(<App />);
    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-2" },
    });
    expect(await screen.findByRole("heading", { name: /Floor 2 — Ngoài phạm vi demo/i })).toBeTruthy();
    expect(screen.getByText(/Phạm vi vận hành demo hiện tại chỉ bao gồm/i)).toBeTruthy();
  }, 15000);

  it("supports direct URL deep-linking to floorId and roomId, clears old room on floor switch, and handles invalid floorId/roomId gracefully", async () => {
    render(<App />);

    // Direct URL navigation to Floor 1 Meeting Room 02
    await act(async () => {
      await router.navigate("/dashboard/overview?floorId=ics-headquarters-floor-1&roomId=room-meeting-02");
    });
    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành Floor 1" })).toBeTruthy();
    const drawer = await screen.findByRole("complementary", { name: /Meeting Room 02 details/i });
    expect(drawer.textContent).toContain("Toàn bộ 3/3 thiết bị trong phòng vẫn đang kết nối (Online)");
    expect(drawer.textContent).toContain("1,100 ppm");
    expect(drawer.textContent).toContain("26 µg/m³");

    // Invalid roomId on Floor 1 shows warning banner and does not open any room drawer
    await act(async () => {
      await router.navigate("/dashboard/overview?floorId=ics-headquarters-floor-1&roomId=room-invalid-99");
    });
    expect(await screen.findByText(/Khu vực 'room-invalid-99' không tồn tại hoặc không thuộc Floor 1/i)).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: /details/i })).toBeNull();

    // Invalid floorId shows status banner and falls back to Building Overview
    await act(async () => {
      await router.navigate("/dashboard/overview?floorId=invalid-floor-99");
    });
    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành tòa nhà" })).toBeTruthy();
    expect(screen.getByText(/Tham số tầng trên URL không hợp lệ \(invalid-floor-99\)/i)).toBeTruthy();
  }, 15000);
});
