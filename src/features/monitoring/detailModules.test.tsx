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

  it("shows Floor 2 energy, meter forecast and its own room data", async () => {
    await openPage("/dashboard/energy", "ics-headquarters-floor-2");

    expect(await screen.findByRole("heading", { name: /năng lượng floor 2/i })).toBeTruthy();
    expect(screen.getByText("141.0 kWh")).toBeTruthy();
    expect(screen.getByText("132.4 kWh", { exact: false })).toBeTruthy();
    expect(screen.getByText(/METER FORECAST · METER-02/i)).toBeTruthy();
    const areaPanel = screen.getByRole("region", { name: /điện năng theo khu vực/i });
    expect(within(areaPanel).getByText("Khu làm việc 2A")).toBeTruthy();
    expect(screen.queryByText("Khu làm việc", { exact: true })).toBeNull();
  });

  it("shows a Floor 1 waste estimate on energy detail without including Floor 2 sample data", async () => {
    await openPage("/dashboard/energy", "ics-headquarters-floor-1");

    const wasteCardLabel = await screen.findByText("Điện lãng phí (ước tính)");
    const wasteCard = wasteCardLabel.closest("article");
    expect(wasteCard?.textContent).toContain("0.0 kWh");
    expect(wasteCard?.textContent).toContain("0 VND");
    expect(wasteCard?.textContent).toMatch(/2[.,]500 VND\/kWh/);

    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-2" },
    });
    expect(await screen.findByRole("heading", { name: /Năng lượng Floor 2/i })).toBeTruthy();
    expect(screen.queryByText("Điện lãng phí (ước tính)")).toBeNull();

    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-all-floors" },
    });
    expect(await screen.findByRole("heading", { name: "Năng lượng toàn tòa nhà" })).toBeTruthy();
    expect(screen.queryByText("Điện lãng phí (ước tính)")).toBeNull();
  }, 15000);

  it("labels Floor 2 cumulative energy as a dated static sample", async () => {
    await openPage("/dashboard/energy", "ics-headquarters-floor-2");

    expect(await screen.findByRole(
      "img",
      { name: /Floor 2 cumulative energy \(kWh\).*08\/10\/2026/i },
      { timeout: 5000 },
    ))
      .toBeTruthy();
    const chart = document.querySelector(".detail-module-page .energy-chart");
    expect(chart?.getAttribute("aria-label")).toMatch(/Floor 2.*cumulative energy.*kWh.*08\/10\/2026/i);
    expect(document.querySelector(".detail-module-page .energy-chart-caption")?.textContent)
      .toMatch(/dữ liệu mẫu tĩnh/i);
  });

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
      .toMatch(/Floor 2.*không gộp/i);
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
    expect(within(attention).getByText("8", { selector: ".attention-total" })).toBeTruthy();
    const summary = screen.getByRole("region", { name: /tóm tắt dữ liệu vận hành đang có/i });
    const unresolvedCard = within(summary).getByText("Sự cố chưa giải quyết").closest("article");
    expect(unresolvedCard).toBeTruthy();
    expect(within(unresolvedCard!).getByText("8")).toBeTruthy();
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
    expect(document.querySelector(".dashboard-header .live-indicator")).toBeNull();
    expect(document.querySelector(".dashboard-header .last-sync time")?.getAttribute("aria-label"))
      .toBe("Floor 1 telemetry last updated");
    expect(document.querySelector(".building-overview-page .overview-live")).toBeNull();
  });

  it("does not show Floor 1 live status or timestamp when Floor 2 is selected", async () => {
    await openPage("/dashboard/overview");
    useTwinStore.getState().setAutomaticTelemetryRunning(true);
    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-2" },
    });

    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành Floor 2" })).toBeTruthy();
    const headerStatus = document.querySelector(".dashboard-header .live-indicator");
    expect(headerStatus?.getAttribute("aria-label")).toBe("Floor 2 static demo data");
    expect(headerStatus?.textContent).toContain("F2 · MẪU TĨNH");
    expect(screen.getByRole("combobox", { name: "Floor" }).textContent)
      .toContain("Floor 2 · Dữ liệu mẫu tĩnh");
    expect(screen.queryByRole("time", { name: "Floor 1 telemetry last updated" })).toBeNull();
    expect(document.querySelector(".overview-page-heading .overview-live")?.textContent)
      .toContain("DỮ LIỆU MẪU TĨNH");
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

  it("reconciles building energy across 2/5 floors and blocks mismatched yesterday comparison", async () => {
    await openPage("/dashboard/energy", "ics-headquarters-all-floors");

    expect(await screen.findByRole("heading", { name: "Năng lượng toàn tòa nhà" })).toBeTruthy();
    expect(screen.getAllByText(/Tổng hợp tầng 1 và tầng 2 · 2\/5 tầng có dữ liệu/i).length).toBeGreaterThan(0);
    expect(screen.getByText("266.6 kWh")).toBeTruthy();
    expect(screen.getByText("Không đủ dữ liệu để so sánh")).toBeTruthy();
    expect(screen.queryByRole("region", { name: /điện năng tiêu thụ theo tầng/i })).toBeNull();

    // Correlated alerts link area and device in the same room without filter buttons
    const alertRegion = screen.getByRole("region", { name: /tiêu thụ bất thường/i });
    expect(within(alertRegion).getAllByText(/Khu vực & thiết bị có liên hệ/i).length).toBeGreaterThan(0);
    expect(within(alertRegion).queryByRole("button", { name: /xem thiết bị khu vực/i })).toBeNull();
  }, 15000);
});

