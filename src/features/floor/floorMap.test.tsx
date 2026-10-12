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
    expect(floor1Rooms.reduce((total, room) => total + room.deviceCount, 0)).toBe(26);
    expect(floor1Rooms.reduce((total, room) => total + room.onlineDeviceCount, 0)).toBe(24);
    expect(floor1Rooms.reduce((total, room) => total + room.offlineDeviceCount, 0)).toBe(2);
  });

  it("shows room telemetry in a drawer after selecting a room", async () => {
    await openFloorOneDashboard();

    const serverRoom = await screen.findByRole("button", { name: /server room/i });
    fireEvent.click(serverRoom);

    const drawer = screen.getByRole("complementary", { name: /server room/i });
    expect(within(drawer).getByRole("heading", { name: "Server Room" })).toBeTruthy();
    expect(drawer.textContent).toContain("Bình thường");
    expect(drawer.textContent).toContain("25.4°C");
    expect(drawer.textContent).toContain("61%");
    expect(drawer.textContent).toContain("23.4 kWh");
    expect(drawer.textContent).toContain("4");
    const detailsLink = within(drawer).getByRole("link", { name: "Xem chi tiết" });
    expect(detailsLink.getAttribute("href")).toBe("/dashboard/devices?roomId=room-server-01&floorId=ics-headquarters-floor-1");
    expect(within(drawer).queryByRole("link", { name: "Xem trên 3D" })).toBeNull();
    expect(within(drawer).getByText("Mô hình 3D · Chưa khả dụng")).toBeTruthy();
    fireEvent.click(detailsLink);
    expect(await screen.findByRole("heading", { name: "Thiết bị Floor 1" })).toBeTruthy();
    expect(screen.getByRole("status", { name: /devices filtered by server room/i })).toBeTruthy();
    expect(screen.getByRole("row", { name: /temp-srv-01/i })).toBeTruthy();
    expect(window.location.search).toBe("?roomId=room-server-01&floorId=ics-headquarters-floor-1");
    fireEvent.click(screen.getByRole("button", { name: "Xóa lọc khu vực" }));
    expect(window.location.search).toBe("?floorId=ics-headquarters-floor-1");
    expect(screen.getByRole("row", { name: /temp-04/i })).toBeTruthy();
  }, 15000);

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

  it("shows a lightweight room readout and communicates that 3D focus is unavailable", async () => {
    await openFloorOneDashboard();

    const serverRoom = await screen.findByRole("button", { name: /server room/i });
    fireEvent.mouseEnter(serverRoom);
    expect(screen.getByRole("tooltip").textContent).toContain("25.4°C");

    fireEvent.click(serverRoom);
    const drawer = screen.getByRole("complementary", { name: /server room/i });
    expect(within(drawer).getByText("Mô hình 3D · Chưa khả dụng")).toBeTruthy();
    expect(within(drawer).queryByRole("link", { name: /xem trên 3d/i })).toBeNull();
    expect(window.location.pathname).toBe("/dashboard/overview");
  });

});
