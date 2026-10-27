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
}, 15000);

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
  }, 15000);

  it("shows energy summary, hourly trend, area and device consumption", async () => {
    await openPage("/dashboard/energy");

    expect(await screen.findByRole("heading", { name: /năng lượng floor 1/i })).toBeTruthy();
    expect(screen.getByText("125.6 kWh")).toBeTruthy();
    expect(screen.getByText(/hôm qua · 116\.1 kwh/i)).toBeTruthy();
    expect(await screen.findByRole("img", { name: /Floor 1 cumulative energy \(kWh\).*today/i })).toBeTruthy();
    const areaPanel = screen.getByRole("region", { name: /điện năng theo khu vực/i });
    expect(within(areaPanel).getByText("Khu làm việc")).toBeTruthy();
    expect(screen.getAllByText(/vượt ngưỡng tiêu thụ/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("table", { name: /energy by device/i })).toBeTruthy();
  });

  it("shows Out of Demo Scope state on Energy page when Floor 2 is selected", async () => {
    await openPage("/dashboard/energy", "ics-headquarters-floor-2");

    expect(await screen.findByRole("heading", { name: /Floor 2 — Ngoài phạm vi demo/i })).toBeTruthy();
    expect(screen.getByText(/Phạm vi vận hành demo hiện tại chỉ bao gồm/i)).toBeTruthy();
  });

  it("shows a Floor 1 waste estimate on energy detail without including Floor 2 sample data", async () => {
    await openPage("/dashboard/energy", "ics-headquarters-floor-1");

    const wasteCardLabel = await screen.findByText("Điện vượt mức tham chiếu — ước tính");
    const wasteCard = wasteCardLabel.closest("article");
    expect(wasteCard?.textContent).toContain("0.0 kWh");
    expect(wasteCard?.textContent).toContain("0 VND");
    expect(wasteCard?.textContent).toMatch(/2[.,]500 VND\/kWh/);

    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-2" },
    });
    expect(await screen.findByRole("heading", { name: /Floor 2 — Ngoài phạm vi demo/i })).toBeTruthy();
    expect(screen.queryByText("Điện vượt mức tham chiếu — ước tính")).toBeNull();

    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-all-floors" },
    });
    expect(await screen.findByRole("heading", { name: "Năng lượng toàn tòa nhà" })).toBeTruthy();
  }, 15000);

  it("keeps the building trend scoped to live Floor 1 rather than summing dated Floor 2 samples", async () => {
    await openPage("/dashboard/energy", "ics-headquarters-all-floors");

    expect(await screen.findByRole(
      "img",
      { name: /Floor 1 cumulative energy \(kWh\)/i },
      { timeout: 5000 },
    )).toBeTruthy();
    const chart = document.querySelector(".detail-module-page .energy-chart");
    expect(chart?.getAttribute("aria-label")).toMatch(/Floor 1.*cumulative energy.*kWh/i);
    expect(document.querySelector(".detail-module-page .energy-chart-caption")?.textContent)
      .toMatch(/Tầng 1 \/ 5 tầng/i);
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

  it("does not leak Floor 1 device inventory when Floor 2 is selected", async () => {
    await openPage("/dashboard/devices", "ics-headquarters-floor-2");

    expect(await screen.findByRole("heading", { name: /Floor 2 — Ngoài phạm vi demo/i })).toBeTruthy();
    expect(screen.queryByRole("row", { name: /WS-08/i })).toBeNull();
  });

  it("opens the device named in an exception and filters the device list to it", async () => {
    await openPage("/dashboard/overview");

    const deviceLink = screen.getByRole("link", { name: /xem thiết bị: ws-08/i });
    expect(deviceLink.getAttribute("href")).toBe("/dashboard/devices?deviceId=device-workspace-08");
    fireEvent.click(deviceLink);

    const fullProfileLink = await screen.findByRole("link", { name: /mở hồ sơ đầy đủ/i });
    fireEvent.click(fullProfileLink);

    expect(await screen.findByRole("heading", { name: "Thiết bị Toàn tòa nhà" })).toBeTruthy();
    expect(window.location.search).toBe("?deviceId=device-workspace-08");
    const table = screen.getByRole("table", { name: /devices in toàn tòa nhà/i });
    expect(within(table).getByRole("row", { name: /WS-08/i })).toBeTruthy();
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(screen.getByRole("status", { name: /devices filtered by ws-08/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Xóa lọc thiết bị" }));
    expect(window.location.search).toBe("");
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(2);
  });

  it("labels the horizontally scrollable device table and provides a swipe hint", async () => {
    await openPage("/dashboard/devices");

    const scrollRegion = screen.getByRole("region", { name: /devices in floor 1.*horizontal scroll/i });
    expect(scrollRegion.getAttribute("tabindex")).toBe("0");
    expect(within(scrollRegion).getByRole("table", { name: /devices in floor 1/i })).toBeTruthy();
    expect(scrollRegion.querySelector(".table-scroll-hint")?.textContent).toMatch(/vuốt ngang để xem thêm cột/i);
  });

  it("acknowledges an open incident through the Twin Store", async () => {
    await openPage("/dashboard/incidents");

    expect(await screen.findByRole("heading", { name: /sự cố vận hành/i })).toBeTruthy();
    const table = screen.getByRole("table", { name: /incidents in floor 1/i });
    const acknowledge = within(table).getByRole("button", { name: /tiếp nhận sensor ws-08/i });
    fireEvent.click(acknowledge);

    const row = within(table).getByRole("row", { name: /sensor ws-08/i });
    expect(within(row).getByText("Đang xử lý")).toBeTruthy();
    const incidentSummary = screen.getByRole("region", { name: /incident summary/i });
    expect(within(incidentSummary).getByText("4", { selector: ".detail-stat-card > strong" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Đang xử lý/i }));
    expect(within(table).getByRole("row", { name: /sensor ws-08/i })).toBeTruthy();
  });

  it("keeps acknowledged incidents in the building attention queue", async () => {
    const alert = useTwinStore.getState().alerts.find((item) => item.id === "alert-workspace-sensor-offline");
    expect(alert).toBeTruthy();
    useTwinStore.getState().acknowledgeAlert(alert!.id);

    await openPage("/dashboard/overview");

    const attention = screen.getByRole("region", { name: /sự cố chưa giải quyết/i });
    expect(within(attention).getByText(alert!.title)).toBeTruthy();
    expect(within(attention).getByText("4", { selector: ".attention-total" })).toBeTruthy();
    const summary = screen.getByRole("region", { name: /4 chỉ số KPI chính phạm vi demo/i });
    const unresolvedCard = within(summary).getByText("Sự cố chưa giải quyết").closest("article");
    expect(unresolvedCard).toBeTruthy();
    expect(within(unresolvedCard!).getByText("4")).toBeTruthy();
  });

  it("shows acknowledged incidents in the floor attention queue", async () => {
    const alert = useTwinStore.getState().alerts.find((item) => item.id === "alert-workspace-sensor-offline");
    expect(alert).toBeTruthy();
    useTwinStore.getState().acknowledgeAlert(alert!.id);

    await openPage("/dashboard/overview");
    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-1" },
    });

    const attention = screen.getByRole("region", { name: /sự cố chưa giải quyết/i });
    expect(within(attention).getByText(alert!.title)).toBeTruthy();
    expect(within(attention).getByText("Đang xử lý")).toBeTruthy();
  });

  it("places the building/floor filter in the page header across tabs instead of the topbar", async () => {
    await openPage("/dashboard/overview");

    expect(document.querySelector(".overview-heading-actions .building-floor-selector")).toBeTruthy();
    expect(document.querySelector(".dashboard-header-live .building-floor-selector")).toBeNull();
    expect(document.querySelector(".dashboard-header-location")).toBeNull();
    expect(document.querySelector(".dashboard-header .live-indicator")).toBeTruthy();
    expect(document.querySelector(".dashboard-header .last-sync time")?.getAttribute("aria-label"))
      .toBe("Floor 1 telemetry last updated");
    expect(document.querySelector(".building-overview-page .overview-live")).toBeTruthy();
  });

  it("does not show Floor 1 live status or timestamp when Floor 2 is selected", async () => {
    await openPage("/dashboard/overview");
    useTwinStore.getState().setAutomaticTelemetryRunning(true);
    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-2" },
    });

    expect(await screen.findByRole("heading", { name: /Floor 2 — Ngoài phạm vi demo/i })).toBeTruthy();
    const headerStatus = document.querySelector(".dashboard-header .live-indicator");
    expect(headerStatus?.getAttribute("aria-label")).toBe("Out of demo scope for selected floor");
    expect(headerStatus?.textContent).toContain("Ngoài phạm vi demo");
    expect(screen.getByRole("combobox", { name: "Floor" }).textContent)
      .toContain("Floor 2 · Ngoài phạm vi demo");
    expect(screen.queryByRole("time", { name: "Floor 1 telemetry last updated" })).toBeNull();
  });

  it("shows AC-03 digital identity and reflects simulated maintenance status", async () => {
    useTwinStore.getState().simulateScenario("ac-03-maintenance-due");
    await openPage("/dashboard/assets");

    expect(await screen.findByRole("heading", { name: /tài sản & bảo trì/i })).toBeTruthy();
    expect(screen.getByText("asset-ac-03")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "AC-03" })).toBeTruthy();
    expect(screen.getAllByText("Daikin").length).toBeGreaterThan(0);
    expect(screen.getByText("Đến hạn bảo trì")).toBeTruthy();
    expect(screen.getAllByText(/4,874 giờ/i).length).toBeGreaterThan(0);
  });

  it("routes the Floor 1 AC-03 maintenance exception to its asset profile", async () => {
    useTwinStore.getState().simulateScenario("ac-03-maintenance-due");
    await openPage("/dashboard/overview");
    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-1" },
    });
    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành Floor 1" })).toBeTruthy();

    const assetLink = screen.getByRole("link", { name: "Xem hồ sơ tài sản: AC-03" });
    expect(assetLink.getAttribute("href")).toBe("/dashboard/assets?assetId=asset-ac-03&floorId=ics-headquarters-floor-1");
    fireEvent.click(assetLink);

    const fullProfileLink = await screen.findByRole("link", { name: /mở hồ sơ đầy đủ/i });
    fireEvent.click(fullProfileLink);

    expect(await screen.findByRole("heading", { name: /tài sản & bảo trì · floor 1/i })).toBeTruthy();
    expect(screen.getByRole("status", { name: /asset profile ac-03/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "AC-03" })).toBeTruthy();
    expect(screen.getByText("Đến hạn bảo trì")).toBeTruthy();
    expect(screen.getByText("Đến hạn · 0 giờ vận hành")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "AC-07" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Hiện tất cả tài sản" }));
    expect(window.location.search).toBe("?floorId=ics-headquarters-floor-1");
    expect(screen.getByRole("heading", { name: "AC-03" })).toBeTruthy();
  });

  it("keeps the filtered maintenance profile read-only for Viewer", async () => {
    useAuthStore.setState({
      user: { username: "viewer", displayName: "ICS Platform Viewer", role: "Viewer" },
      role: "Viewer",
      isAuthenticated: true,
    });
    useTwinStore.getState().simulateScenario("ac-03-maintenance-due");
    await openPage("/dashboard/assets?assetId=asset-ac-03");

    expect(await screen.findByRole("heading", { name: "AC-03" })).toBeTruthy();
    expect(screen.getByText("Đến hạn bảo trì")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /mark.*maintained|edit.*asset|schedule maintenance/i })).toBeNull();
  });

  it("links Overview KPI cards to their corresponding detail modules", async () => {
    await openPage("/dashboard/overview");
    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-1" },
    });

    expect(screen.getByRole("link", { name: /xem chi tiết: điện năng hôm nay/i }).getAttribute("href"))
      .toBe("/dashboard/energy?floorId=ics-headquarters-floor-1");
    expect(screen.getByRole("link", { name: /xem chi tiết: môi trường/i }).getAttribute("href"))
      .toBe("/dashboard/environment?floorId=ics-headquarters-floor-1");
    expect(screen.getByRole("link", { name: /xem chi tiết: tình trạng thiết bị/i }).getAttribute("href"))
      .toBe("/dashboard/devices?floorId=ics-headquarters-floor-1");
    expect(screen.getByRole("link", { name: /xem chi tiết: sự cố chưa giải quyết/i }).getAttribute("href"))
      .toBe("/dashboard/incidents?floorId=ics-headquarters-floor-1");
    expect(screen.getByRole("link", { name: /xem hồ sơ tài sản: ac-03/i }).getAttribute("href"))
      .toBe("/dashboard/assets?assetId=asset-ac-03&floorId=ics-headquarters-floor-1");
  });

  it("scopes building energy to Floor 1 (1/5 floors) with honest comparison against yesterday", async () => {
    await openPage("/dashboard/energy", "ics-headquarters-all-floors");

    expect(await screen.findByRole("heading", { name: "Năng lượng toàn tòa nhà" })).toBeTruthy();
    expect(screen.getAllByText(/Phạm vi vận hành demo: Tầng 1 \/ 5 tầng/i).length).toBeGreaterThan(0);
    expect(screen.getByText("125.6 kWh")).toBeTruthy();
    expect(screen.queryByRole("region", { name: /điện năng tiêu thụ theo tầng/i })).toBeNull();

    // Correlated alerts link area and device in the same room without filter buttons
    const alertRegion = screen.getByRole("region", { name: /tiêu thụ bất thường/i });
    expect(within(alertRegion).getAllByText(/Khu vực & thiết bị có liên hệ/i).length).toBeGreaterThan(0);
    expect(within(alertRegion).queryByRole("button", { name: /xem thiết bị khu vực/i })).toBeNull();
  }, 15000);
});

