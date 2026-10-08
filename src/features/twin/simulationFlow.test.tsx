import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  sessionStorage.clear();
  useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  useLoginTransitionStore.setState({ isTransitioning: false });
  useTwinStore.getState().resetSimulation();
});

describe("mock realtime dashboard flow", () => {
  it("updates the SVG, KPI, drawer, alert queue and last updated timestamp together", async () => {
    render(<App />);

    const serverRegion = await screen.findByRole("button", { name: /server room, bình thường/i });
    fireEvent.click(serverRegion);
    expect(screen.getByRole("complementary", { name: /server room details/i }).textContent)
      .toContain("25.4°C");

    const timestamp = screen.getByRole("time", { name: /last updated/i });
    const previousUpdate = timestamp.getAttribute("datetime");
    expect(previousUpdate).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "SIMULATE EVENT" }));

    expect(await screen.findByRole("button", { name: /server room, critical.*29\.1/i })).toBeTruthy();
    const drawer = screen.getByRole("complementary", { name: /server room details/i });
    expect(drawer.textContent).toContain("29.1°C");
    expect(drawer.textContent).toContain("Critical");

    const alertsKpi = screen.getByRole("article", { name: "Sự cố đang mở" });
    expect(alertsKpi.textContent).toContain("4");
    expect(screen.getByRole("heading", { name: "Nhiệt độ phòng Server cao" })).toBeTruthy();
    expect(screen.getByRole("time", { name: /last updated/i }).getAttribute("datetime"))
      .not.toBe(previousUpdate);
    expect(screen.getByRole("status", { name: /simulation/i }).textContent).toMatch(/simulation/i);
  });

  it("propagates a TEMP-04 offline event to the room map, drawer, KPI and queue", async () => {
    render(<App />);

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
  });

  it("propagates AC-03 maintenance due to the asset exceptions and alert queue", async () => {
    render(<App />);

    fireEvent.change(screen.getByRole("combobox", { name: "Simulation scenario" }), {
      target: { value: "ac-03-maintenance-due" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SIMULATE EVENT" }));

    expect(screen.getByRole("heading", { name: "AC-03 đến hạn bảo trì" })).toBeTruthy();
    expect(screen.getByRole("row", { name: /AC-03.*warning.*đến hạn bảo trì/i })).toBeTruthy();
    expect(screen.getByRole("article", { name: "Sự cố đang mở" })
      .querySelector(".kpi-card-value")?.textContent).toBe("3");
  });
});
