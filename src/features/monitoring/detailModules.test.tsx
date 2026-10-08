import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import { useAuthStore } from "../auth/authStore";
import { useLoginTransitionStore } from "../auth/loginTransitionStore";
import { useTwinStore } from "../twin/twinStore";

async function openPage(path: string, floorId = "ics-headquarters-floor-1") {
  await act(async () => {
    await router.navigate(path);
  });
  render(<App />);

  if (path !== "/dashboard/overview") {
    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: floorId },
    });
  }
}

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

describe("Phase 6 detail monitoring modules", () => {
  it.each([
    ["/dashboard/energy", /năng lượng floor 1/i],
    ["/dashboard/environment", /môi trường · floor 1/i],
    ["/dashboard/devices", /thiết bị floor 1/i],
    ["/dashboard/incidents", /sự cố vận hành/i],
    ["/dashboard/assets", /tài sản & bảo trì/i],
  ])("renders the functional module at %s", async (path, heading) => {
    await openPage(path);

    expect(await screen.findByRole("heading", { name: heading })).toBeTruthy();
    expect(screen.queryByText(/module planned for a later phase/i)).toBeNull();
  });

  it("shows energy summary, hourly trend, area and device consumption", async () => {
    await openPage("/dashboard/energy");

    expect(await screen.findByRole("heading", { name: /năng lượng floor 1/i })).toBeTruthy();
    expect(screen.getByText("125.6 kWh")).toBeTruthy();
    expect(screen.getByText(/hôm qua · 116\.1 kwh/i)).toBeTruthy();
    expect(await screen.findByRole("img", { name: /energy consumption today/i })).toBeTruthy();
    const areaPanel = screen.getByRole("region", { name: /điện năng theo khu vực/i });
    expect(within(areaPanel).getByText("Khu làm việc")).toBeTruthy();
    expect(screen.getAllByText(/vượt ngưỡng tiêu thụ/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("table", { name: /energy by device/i })).toBeTruthy();
  });

  it("shows Floor 2 energy, meter forecast and its own room data", async () => {
    await openPage("/dashboard/energy", "ics-headquarters-floor-2");

    expect(await screen.findByRole("heading", { name: /năng lượng floor 2/i })).toBeTruthy();
    expect(screen.getByText("141.0 kWh")).toBeTruthy();
    expect(screen.getByText("132.4 kWh", { exact: false })).toBeTruthy();
    expect(screen.getAllByText("METER-02").length).toBeGreaterThan(0);
    const areaPanel = screen.getByRole("region", { name: /điện năng theo khu vực/i });
    expect(within(areaPanel).getByText("Khu làm việc 2A")).toBeTruthy();
    expect(screen.queryByText("Khu làm việc", { exact: true })).toBeNull();
  });

  it("shows area environmental readings and highlights an out-of-range value", async () => {
    await openPage("/dashboard/environment");

    expect(await screen.findByRole("heading", { name: /môi trường · floor 1/i })).toBeTruthy();
    expect(screen.getByRole("table", { name: /environmental readings by area/i })).toBeTruthy();
    expect(screen.getByRole("row", { name: /meeting room 02.*1,100 ppm.*cần chú ý/i })).toBeTruthy();
    expect(screen.getAllByText(/ngưỡng/i).length).toBeGreaterThan(0);
  });

  it("filters devices by operational state", async () => {
    await openPage("/dashboard/devices");

    expect(await screen.findByRole("heading", { name: /thiết bị floor 1/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Offline/i }));
    const table = screen.getByRole("table", { name: /devices in floor 1/i });
    expect(within(table).getByRole("row", { name: /WS-08/i })).toBeTruthy();
    expect(within(table).getByRole("row", { name: /UT-01/i })).toBeTruthy();
    expect(within(table).queryByRole("row", { name: /TEMP-04/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^All/i }));
    expect(within(table).getByRole("row", { name: /TEMP-04/i })).toBeTruthy();
  });

  it("shows Floor 2 device records without leaking Floor 1 inventory", async () => {
    await openPage("/dashboard/devices", "ics-headquarters-floor-2");

    expect(await screen.findByRole("heading", { name: /thiết bị floor 2/i })).toBeTruthy();
    const table = screen.getByRole("table", { name: /devices in floor 2/i });
    expect(within(table).getByRole("row", { name: /WS-22/i })).toBeTruthy();
    expect(within(table).getByRole("row", { name: /UT-02/i })).toBeTruthy();
    expect(within(table).queryByRole("row", { name: /WS-08/i })).toBeNull();
  });

  it("acknowledges an open incident through the Twin Store", async () => {
    await openPage("/dashboard/incidents");

    expect(await screen.findByRole("heading", { name: /sự cố vận hành/i })).toBeTruthy();
    const acknowledge = screen.getByRole("button", { name: /acknowledge sensor ws-08/i });
    fireEvent.click(acknowledge);

    fireEvent.click(screen.getByRole("button", { name: /^Acknowledged/i }));
    const table = screen.getByRole("table", { name: /incidents in floor 1/i });
    const row = within(table).getByRole("row", { name: /sensor ws-08/i });
    expect(within(row).getByText("Acknowledged")).toBeTruthy();
  });

  it("shows AC-03 digital identity and reflects simulated maintenance status", async () => {
    useTwinStore.getState().simulateScenario("ac-03-maintenance-due");
    await openPage("/dashboard/assets");

    expect(await screen.findByRole("heading", { name: /tài sản & bảo trì/i })).toBeTruthy();
    expect(screen.getByText("asset-ac-03")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "AC-03" })).toBeTruthy();
    expect(screen.getAllByText("Daikin").length).toBeGreaterThan(0);
    expect(screen.getByText("Đến hạn bảo trì")).toBeTruthy();
    expect(screen.getByText(/4,862 giờ/i)).toBeTruthy();
  });

  it("links Overview KPI cards to their corresponding detail modules", async () => {
    await openPage("/dashboard/overview");

    expect(screen.getByRole("link", { name: /xem chi tiết: điện năng hôm nay/i }).getAttribute("href"))
      .toBe("/dashboard/energy");
    expect(screen.getByRole("link", { name: /xem chi tiết: môi trường/i }).getAttribute("href"))
      .toBe("/dashboard/environment");
    expect(screen.getByRole("link", { name: /xem chi tiết: tình trạng thiết bị/i }).getAttribute("href"))
      .toBe("/dashboard/devices");
    expect(screen.getByRole("link", { name: /xem chi tiết: sự cố đang mở/i }).getAttribute("href"))
      .toBe("/dashboard/incidents");
    expect(screen.getByRole("link", { name: /xem thiết bị: ac-03/i }).getAttribute("href"))
      .toBe("/dashboard/assets");
  });
});
