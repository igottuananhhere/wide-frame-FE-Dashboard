import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import viteConfig from "../../../vite.config";
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

async function openFloor(floorId: string, title: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), { target: { value: floorId } });
  return screen.findByRole("heading", { name: title });
}

describe("building and floor management overview", () => {
  it("scopes Building Overview strictly to Floor 1 demo data and shows out-of-demo-scope state for Floors 2–5", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành tòa nhà" })).toBeTruthy();
    expect(screen.getAllByText(/Phạm vi vận hành demo: Tầng 1 \/ 5 tầng — Dữ liệu mô phỏng/i).length).toBeGreaterThan(0);

    // Only Floor 1 (125.6 kWh) is aggregated in demo scope; Floor 2 is out of demo scope
    expect(screen.getAllByText("125.6 kWh").length).toBeGreaterThan(0);
    expect(screen.queryByText("266.6 kWh")).toBeNull();
    expect(screen.getByRole("heading", { name: "Điện năng tầng 1 ghi nhận hôm nay" })).toBeTruthy();
    expect(screen.getByText(/Trạng thái hiện tại · Không lọc theo ngày lịch sử/i)).toBeTruthy();

    // Select an unrecorded historical date (01/10/2026) -> must show Chưa có dữ liệu instead of fabricating numbers
    fireEvent.click(screen.getByRole("button", { name: /Lọc theo ngày/i }));
    const oct1Cell = screen.getByRole("gridcell", { name: "Ngày 01/10/2026" });
    fireEvent.click(oct1Cell);
    fireEvent.click(oct1Cell);
    expect(screen.getAllByText("Chưa có dữ liệu").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Chưa đủ dữ liệu để so sánh kỳ trước/i).length).toBeGreaterThan(0);

    // Selecting Floor 2 opens the Out of Demo Scope state
    const floorSelector = screen.getByRole("combobox", { name: "Floor" }) as HTMLSelectElement;
    fireEvent.change(floorSelector, { target: { value: "ics-headquarters-floor-2" } });
    expect(await screen.findByRole("heading", { name: /Floor 2 — Ngoài phạm vi demo/i })).toBeTruthy();
    expect(screen.getByText(/không cộng vào tổng vận hành toàn tòa nhà/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: "Tổng quan" }));
    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành tòa nhà" })).toBeTruthy();
    expect(floorSelector.value).toBe("ics-headquarters-all-floors");
  }, 30000);

  it("prebundles Recharts before the lazy energy chart is requested", () => {
    expect(viteConfig.optimizeDeps?.include).toContain("recharts");
  });

  it("shows the executive health summary and mock attention queue on Floor 1", async () => {
    render(<App />);

    await openFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");
    expect(screen.getByText("Tổng quan vận hành Floor 1")).toBeTruthy();
    expect(screen.getAllByText("125.6 kWh").length).toBeGreaterThan(0);
    expect(screen.getByText("28 / 30")).toBeTruthy();
    expect(screen.getByText("4", { selector: ".kpi-card-value" })).toBeTruthy();
    expect(screen.getAllByText("Bình thường").length).toBeGreaterThan(0);
    expect(screen.getByText("Sensor WS-08 mất kết nối")).toBeTruthy();
    expect(screen.getByText("Bộ điều khiển Utility Room mất kết nối")).toBeTruthy();
    expect(screen.getByText("AC-03 sắp đến hạn bảo trì")).toBeTruthy();
  }, 15000);

  it("shows the estimated reference excess KPI on Floor 1 overview", async () => {
    render(<App />);
    await openFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");

    const wasteCard = screen.getByRole("article", { name: "Điện vượt mức tham chiếu — ước tính" });
    expect(wasteCard.textContent).toContain("0.0 kWh");
    expect(wasteCard.textContent).toContain("0 VND");
    expect(wasteCard.textContent).toContain("125.6 kWh");
    expect(screen.getByRole("link", { name: "Xem chi tiết: Điện vượt mức tham chiếu — ước tính" }).getAttribute("href"))
      .toBe("/dashboard/energy?floorId=ics-headquarters-floor-1");

    const serverRoom = useTwinStore.getState().rooms.find((room) => room.id === "room-server-01");
    expect(serverRoom).toBeTruthy();
    useTwinStore.getState().updateRoomTelemetry(serverRoom!.id, {
      energyConsumption: serverRoom!.energyConsumption + 5,
    });
    expect(await within(wasteCard).findByText("5.0 kWh")).toBeTruthy();
    expect(wasteCard.textContent).toContain("12.500 VND");

    const floorSelector = screen.getByRole("combobox", { name: "Floor" });
    fireEvent.change(floorSelector, { target: { value: "ics-headquarters-all-floors" } });
    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành tòa nhà" })).toBeTruthy();
    expect(screen.queryByRole("article", { name: "Điện vượt mức tham chiếu — ước tính" })).toBeNull();
  }, 15000);

  it("shows energy and environment summaries, 15 kWh threshold line, and opens suspect devices panel on simulated 16.5 kWh spike", async () => {
    useTwinStore.getState().resetSimulation();
    render(<App />);

    await openFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");
    expect(screen.getByRole("heading", { name: "Điện năng tiêu thụ theo giờ" })).toBeTruthy();
    expect(await screen.findByRole(
      "img",
      { name: /Floor 1 hourly energy consumption \(kWh per hour\) today/i },
      { timeout: 5000 },
    )).toBeTruthy();
    const energyPanel = screen.getByRole("region", { name: "Điện năng tiêu thụ theo giờ" });
    expect(energyPanel.querySelector(".energy-total")).toBeNull();
    expect(energyPanel.querySelector(".energy-chart-meta")).toBeNull();
    expect(energyPanel.querySelector(".energy-chart-caption")).toBeNull();
    expect(within(energyPanel).getByText("Ngưỡng cảnh báo mô phỏng · 15 kWh/giờ")).toBeTruthy();

    expect(within(energyPanel).queryByRole("region", { name: "Thiết bị nghi vấn" })).toBeNull();

    fireEvent.change(screen.getByRole("combobox", { name: "Simulation scenario" }), {
      target: { value: "hourly-energy-spike" },
    });
    fireEvent.click(screen.getByRole("button", { name: "SIMULATE EVENT" }));

    const suspectPanel = await within(energyPanel).findByRole("region", { name: "Thiết bị nghi vấn" });
    expect(within(energyPanel).getAllByText(/09:00–10:00/).length).toBeGreaterThan(0);
    expect(within(energyPanel).getAllByText(/16\.5 kWh/).length).toBeGreaterThan(0);
    expect(within(energyPanel).getAllByText(/\+1\.5 kWh/).length).toBeGreaterThan(0);
    expect(within(suspectPanel).getByText(/Thiết bị nghi vấn · Khung giờ 09:00–10:00/i)).toBeTruthy();
    expect(within(suspectPanel).getByText(/Dữ liệu mô phỏng/i)).toBeTruthy();
    expect(within(suspectPanel).getByText(/chưa khẳng định nguyên nhân của toàn Floor 1/i)).toBeTruthy();

    const suspectItems = within(suspectPanel).getAllByRole("listitem");
    expect(suspectItems[0]?.textContent).toContain("AC-03");
    expect(suspectItems[0]?.textContent).toContain("Khu làm việc");
    expect(suspectItems[0]?.textContent).toContain("5.3 kWh");
    expect(suspectItems[0]?.textContent).toContain("+3.1 kWh");
    expect(within(suspectPanel).getByRole("link", { name: "Mở hồ sơ thiết bị: AC-03" }).getAttribute("href"))
      .toBe("/dashboard/assets?assetId=asset-ac-03&floorId=ics-headquarters-floor-1");

    expect(screen.getAllByText("Khu làm việc").length).toBeGreaterThan(0);
    expect(screen.getByText("25.5°C")).toBeTruthy();
    expect(screen.getByText("58%")).toBeTruthy();
    const environmentPanel = screen.getByRole("region", { name: "Môi trường" });
    expect(within(environmentPanel).getByText("704 ppm")).toBeTruthy();
    expect(within(environmentPanel).getByText("19 µg/m³")).toBeTruthy();
  });

  it("shows asset exceptions priority board on Floor 1 and hides the 3D action from the main demo flow", async () => {
    render(<App />);

    await openFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");
    const floor1AssetSection = screen.getByRole("region", { name: "Tài sản cần xử lý" });
    expect(within(floor1AssetSection).getByRole("region", { name: /ưu tiên cao/i })).toBeTruthy();
    expect(within(floor1AssetSection).getByRole("region", { name: /ưu tiên trung bình/i })).toBeTruthy();
    expect(within(floor1AssetSection).getByRole("region", { name: /ưu tiên thấp/i })).toBeTruthy();
    expect(within(floor1AssetSection).getByText("AC-03")).toBeTruthy();
    expect(within(floor1AssetSection).getByText("WS-08")).toBeTruthy();
    expect(within(floor1AssetSection).getByText("UT-01")).toBeTruthy();

    fireEvent.click(within(floor1AssetSection).getByRole("button", { name: "Chế độ Bảng" }));
    const floor1Table = within(floor1AssetSection).getByRole("table", { name: /asset exceptions/i });
    expect(within(floor1Table).getByText("AC-03")).toBeTruthy();
    expect(within(floor1Table).getByText("WS-08")).toBeTruthy();
    expect(within(floor1Table).getByText("UT-01")).toBeTruthy();
    fireEvent.click(within(floor1AssetSection).getByRole("button", { name: "Chế độ Thẻ" }));

    expect(screen.queryByRole("link", { name: /mở digital twin 3d/i })).toBeNull();
  });

  it("orders Floor 1 KPI cards left-to-right and synchronizes room/incident/asset counts", async () => {
    useTwinStore.getState().resetSimulation();
    render(<App />);
    await openFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");

    const kpiSection = screen.getByRole("region", { name: "Chỉ số vận hành chính" });
    const kpiArticles = within(kpiSection).getAllByRole("article");
    expect(kpiArticles.map((card) => card.getAttribute("aria-label"))).toEqual([
      "Tình trạng thiết bị",
      "Sự cố chưa giải quyết",
      "Môi trường",
      "Điện năng hôm nay",
      "Điện vượt mức tham chiếu — ước tính",
    ]);

    const energyKpi = within(kpiSection).getByRole("article", { name: "Điện năng hôm nay" });
    expect(within(energyKpi).getByText("125.6 kWh")).toBeTruthy();
    expect(within(energyKpi).getByText(/\+8\.2% so với cả ngày hôm qua \(116\.1 kWh\)/i)).toBeTruthy();

    expect(screen.getByText(/3 khu vực có ngoại lệ vận hành/i)).toBeTruthy();
    expect(screen.getByText("! MÔI TRƯỜNG: CẦN CHÚ Ý")).toBeTruthy();
    expect(screen.getByText("2 thiết bị · 1 môi trường · 1 bảo trì")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Mở danh sách sự cố/i }).getAttribute("href"))
      .toBe("/dashboard/incidents?floorId=ics-headquarters-floor-1");
    expect(screen.getAllByText(/Bộ điều khiển \(Controller\) tại phòng kỹ thuật trọng yếu mất kết nối/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cảm biến nhánh \(Sensor\) mất kết nối cục bộ/i).length).toBeGreaterThan(0);
  }, 15000);
});
