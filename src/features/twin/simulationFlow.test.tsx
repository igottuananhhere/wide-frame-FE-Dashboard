import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import { useAuthStore } from "../auth/authStore";
import { useLoginTransitionStore } from "../auth/loginTransitionStore";
import { useTwinStore } from "./twinStore";

beforeEach(async () => {
  sessionStorage.clear();
  useAuthStore.setState({
    user: { username: "admin", displayName: "ICS Platform Administrator", role: "Admin" },
    role: "Admin",
    isAuthenticated: true,
  });
  useLoginTransitionStore.setState({ isTransitioning: false });
  useTwinStore.getState().resetSimulation();
  await act(async () => {
    await router.navigate("/dashboard/overview");
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  sessionStorage.clear();
  useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  useLoginTransitionStore.setState({ isTransitioning: false });
  useTwinStore.getState().resetSimulation();
});

async function openFloorOneDashboard() {
  fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
    target: { value: "ics-headquarters-floor-1" },
  });
  expect(await screen.findByRole("heading", { name: "Tổng quan vận hành Floor 1" })).toBeTruthy();
}

describe("mock realtime dashboard flow", () => {
  it("updates the SVG, KPI, drawer, alert queue and last updated timestamp together", async () => {
    render(<App />);
    await openFloorOneDashboard();

    const serverRegion = await screen.findByRole("button", { name: /server room, bình thường/i });
    fireEvent.click(serverRegion);
    expect(screen.getByRole("complementary", { name: /server room details/i }).textContent)
      .toContain("25.4°C");

    const timestamp = document.querySelector(".dashboard-header .last-sync time");
    const previousUpdate = timestamp?.getAttribute("datetime");
    expect(previousUpdate).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "SIMULATE EVENT" }));

    expect(await screen.findByRole("button", { name: /server room, critical.*29\.1/i })).toBeTruthy();
    const drawer = screen.getByRole("complementary", { name: /server room details/i });
    expect(drawer.textContent).toContain("29.1°C");
    expect(drawer.textContent).toContain("Critical");

    const alertsKpi = screen.getByRole("article", { name: "Sự cố chưa giải quyết" });
    expect(alertsKpi.textContent).toContain("5");
    expect(screen.getByRole("heading", { name: "Nhiệt độ phòng Server cao" })).toBeTruthy();
    expect(document.querySelector(".dashboard-header .last-sync time")?.getAttribute("datetime"))
      .not.toBe(previousUpdate);
    expect(document.querySelector(".dashboard-header .live-indicator")?.getAttribute("aria-label"))
      .toBe("Floor 1 paused simulation");
  }, 15000);

  it("propagates a TEMP-04 offline event to the room map, drawer, KPI and queue", async () => {
    render(<App />);
    await openFloorOneDashboard();

    fireEvent.click(await screen.findByRole("button", { name: /meeting room 02, bình thường/i }));
    fireEvent.change(screen.getByRole("combobox", { name: "Simulation scenario" }), {
      target: { value: "temp-04-offline" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SIMULATE EVENT" }));

    expect(screen.getByRole("button", { name: /meeting room 02, cần chú ý/i })).toBeTruthy();
    const meetingRoomDrawer = screen.getByRole("complementary", { name: /meeting room 02 details/i });
    expect(meetingRoomDrawer.textContent).toContain("Online2");
    expect(meetingRoomDrawer.textContent).toContain("Offline1");
    expect(screen.getByRole("article", { name: "Tình trạng thiết bị" }).textContent).toContain("23 / 26");
    expect(screen.getByRole("heading", { name: "Sensor TEMP-04 mất kết nối" })).toBeTruthy();
  }, 15000);

  it("propagates AC-03 maintenance due to the asset exceptions and alert queue", async () => {
    render(<App />);
    await openFloorOneDashboard();

    fireEvent.change(screen.getByRole("combobox", { name: "Simulation scenario" }), {
      target: { value: "ac-03-maintenance-due" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SIMULATE EVENT" }));

    expect(screen.getByRole("heading", { name: "AC-03 đến hạn bảo trì" })).toBeTruthy();
    expect(screen.getByRole("row", { name: /AC-03.*warning.*đến hạn bảo trì/i })).toBeTruthy();
    expect(screen.getByRole("article", { name: "Sự cố chưa giải quyết" })
      .querySelector(".kpi-card-value")?.textContent).toBe("4");
  });

  it("advances telemetry through the dashboard layout and pauses it on request", async () => {
    render(<App />);
    await openFloorOneDashboard();
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: /start automatic telemetry/i }));
    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });
    expect(useTwinStore.getState().rooms.find((room) => room.id === "room-server-01")?.temperature).toBe(26.1);

    fireEvent.click(screen.getByRole("button", { name: /pause automatic telemetry/i }));
    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });
    expect(useTwinStore.getState().rooms.find((room) => room.id === "room-server-01")?.temperature).toBe(26.1);

    fireEvent.click(screen.getByRole("button", { name: /reset simulation/i }));
    expect(useTwinStore.getState().rooms.find((room) => room.id === "room-server-01")?.temperature).toBe(25.4);
  });

  it("keeps layout-owned telemetry running when Floor 2 hides Floor 1 controls", async () => {
    render(<App />);
    await openFloorOneDashboard();

    fireEvent.click(screen.getByRole("button", { name: /start automatic telemetry/i }));
    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-2" },
    });
    expect(screen.getByRole("heading", { name: "Tổng quan vận hành Floor 2" })).toBeTruthy();

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 3_200));
    });

    expect(useTwinStore.getState().automaticTelemetryRunning).toBe(true);
    expect(useTwinStore.getState().rooms.find((room) => room.id === "room-server-01")?.temperature).toBe(26.1);
    expect(screen.queryByRole("button", { name: /start automatic telemetry|pause automatic telemetry/i })).toBeNull();
  }, 10000);
});
