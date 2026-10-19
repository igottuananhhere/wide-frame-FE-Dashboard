import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import { computeCalendarMaintenanceStatus } from "../../features/assets/maintenanceData";
import { useAuthStore } from "../../features/auth/authStore";
import { useLoginTransitionStore } from "../../features/auth/loginTransitionStore";
import { getLocalTodayIso } from "../../features/dashboard/dateFilterUtils";
import { useTwinStore } from "../../features/twin/twinStore";

async function openAssetsPage(query = "", floorId = "ics-headquarters-all-floors") {
  await act(async () => {
    await router.navigate(`/dashboard/assets${query}`);
  });
  render(<App />);

  fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
    target: { value: floorId },
  });
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

describe("AssetsPage (Tài sản & bảo trì)", () => {
  it("renders page header, scope disclosure, and mock data disclosure", async () => {
    await openAssetsPage();

    expect(await screen.findByRole("heading", { name: /tài sản & bảo trì · toàn tòa nhà/i })).toBeTruthy();
    expect(screen.getByText("DỮ LIỆU MẪU MÔ PHỎNG")).toBeTruthy();
    expect(screen.getByText(/chưa kết nối api hệ thống cmms\/erp hai chiều/i)).toBeTruthy();
  });

  it("renders 4 top KPI cards and clicking them switches/filters tabs correctly", async () => {
    await openAssetsPage();

    // 4 KPI cards
    const kpiAssets = screen.getByRole("button", { name: /tài sản trong phạm vi/i });
    const kpiDueSoon = screen.getByRole("button", { name: /hạng mục sắp đến hạn/i });
    const kpiOverdue = screen.getByRole("button", { name: /hạng mục quá hạn/i });
    const kpiNoPlan = screen.getByRole("button", { name: /tài sản chưa có kế hoạch/i });

    expect(kpiAssets).toBeTruthy();
    expect(kpiDueSoon).toBeTruthy();
    expect(kpiOverdue).toBeTruthy();
    expect(kpiNoPlan).toBeTruthy();

    // Clicking KPI Due Soon switches to Plans tab with due-soon filter
    fireEvent.click(kpiDueSoon);
    expect(screen.getByRole("tab", { name: /kế hoạch bảo trì/i, selected: true })).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Lọc theo tình trạng đến hạn" }) as HTMLSelectElement).value).toBe("due-soon");

    // Clicking KPI Overdue switches to Plans tab with due filter
    fireEvent.click(kpiOverdue);
    expect(screen.getByRole("tab", { name: /kế hoạch bảo trì/i, selected: true })).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Lọc theo tình trạng đến hạn" }) as HTMLSelectElement).value).toBe("due");

    // Clicking KPI No Plan switches to Assets tab with unconfigured filter
    fireEvent.click(kpiNoPlan);
    expect(screen.getByRole("tab", { name: /tài sản/i, selected: true })).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Lọc theo tình trạng bảo trì" }) as HTMLSelectElement).value).toBe("unconfigured");

    // In unconfigured filter, AHU-01 and AHU-02 are displayed with "Chưa có kế hoạch"
    expect(screen.getByRole("heading", { name: "AHU-01" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "AC-03" })).toBeNull();

    // Clicking KPI Assets resets filter
    fireEvent.click(kpiAssets);
    expect((screen.getByRole("combobox", { name: "Lọc theo tình trạng bảo trì" }) as HTMLSelectElement).value).toBe("all");
    expect(screen.getByRole("heading", { name: "AC-03" })).toBeTruthy();
  });

  it("navigates across all 3 tabs: Tài sản, Kế hoạch bảo trì, Lịch sử bảo trì", async () => {
    await openAssetsPage();

    // Tab 1: Tài sản (default)
    expect(screen.getByRole("tab", { name: /tài sản/i, selected: true })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Danh sách tài sản" })).toBeTruthy();

    // Switch to Tab 2: Kế hoạch bảo trì
    fireEvent.click(screen.getByRole("tab", { name: /kế hoạch bảo trì/i }));
    expect(screen.getByRole("tab", { name: /kế hoạch bảo trì/i, selected: true })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Kế hoạch bảo trì" })).toBeTruthy();
    expect(screen.getByText("Bảo dưỡng định kỳ máy nén & dàn ngưng")).toBeTruthy();

    // Switch to Tab 3: Lịch sử bảo trì
    fireEvent.click(screen.getByRole("tab", { name: /lịch sử bảo trì/i }));
    expect(screen.getByRole("tab", { name: /lịch sử bảo trì/i, selected: true })).toBeTruthy();
    expect(screen.getByRole("table", { name: "Lịch sử bảo trì" })).toBeTruthy();
    expect(screen.getByText("KTV. Nguyễn Văn Hùng · Đội Cơ điện MEP")).toBeTruthy();
    expect(screen.getAllByText("Đạt tiêu chuẩn vận hành").length).toBeGreaterThan(0);
  });

  it("filters and searches inside the Assets tab", async () => {
    await openAssetsPage();

    // Search by text "AC-07"
    const searchInput = screen.getByRole("textbox", { name: "Tìm kiếm tài sản" });
    fireEvent.change(searchInput, { target: { value: "AC-07" } });

    expect(screen.getByRole("heading", { name: "AC-07" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "AC-03" })).toBeNull();

    // Clear search
    fireEvent.click(screen.getByRole("button", { name: "Xóa từ khóa tìm kiếm" }));
    expect(screen.getByRole("heading", { name: "AC-03" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "AC-07" })).toBeTruthy();
  });

  it("opens AssetDetailDrawer when clicking 'Xem chi tiết'", async () => {
    await openAssetsPage();

    const detailBtn = screen.getByRole("button", { name: "Xem chi tiết hồ sơ tài sản: AC-03" });
    fireEvent.click(detailBtn);

    // AssetDetailDrawer should open
    expect(await screen.findByRole("dialog", { name: /ac-03/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /tổng quan/i })).toBeTruthy();

    // Close drawer
    fireEvent.click(screen.getByRole("button", { name: "Đóng bảng chi tiết tài sản" }));
    expect(screen.queryByRole("dialog", { name: /ac-03/i })).toBeNull();
  });

  it("navigates to Plans tab with asset preselected when clicking 'Xem kế hoạch'", async () => {
    await openAssetsPage();

    const planBtn = screen.getByRole("button", { name: "Xem kế hoạch bảo trì của: AC-03" });
    fireEvent.click(planBtn);

    expect(screen.getByRole("tab", { name: /kế hoạch bảo trì/i, selected: true })).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Lọc theo tài sản" }) as HTMLSelectElement).value).toBe("asset-ac-03");
    expect(screen.getByText("Bảo dưỡng định kỳ máy nén & dàn ngưng")).toBeTruthy();
    expect(screen.queryByText("Bảo dưỡng định kỳ máy nén & nạp gas bổ sung")).toBeNull(); // AC-07 plan filtered out
  });

  it("distinguishes due status from execution progress status in Plans table with dynamic calendar days", async () => {
    await openAssetsPage();

    fireEvent.click(screen.getByRole("tab", { name: /kế hoạch bảo trì/i }));

    const todayIso = getLocalTodayIso();
    const expectedCoilStatus = computeCalendarMaintenanceStatus("2026-03-25", todayIso);
    const expectedFiltersStatus = computeCalendarMaintenanceStatus("2026-07-15", todayIso);
    const expectedSafetyStatus = computeCalendarMaintenanceStatus("2026-11-20", todayIso);

    // Overdue coil cleaning plan for AC-07 is "Đã lên lịch" (progress) but "Quá hạn" (due status)
    expect(screen.getByText("Vệ sinh khử khuẩn dàn lạnh & máng nước ngưng")).toBeTruthy();
    expect(screen.getByText(expectedCoilStatus.remainingLabel)).toBeTruthy();
    expect(screen.getByText(expectedFiltersStatus.remainingLabel)).toBeTruthy();
    expect(screen.getByText(expectedSafetyStatus.remainingLabel)).toBeTruthy();
    expect(screen.getAllByText("Đã lên lịch").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Quá hạn").length).toBeGreaterThan(0);
  });

  it("restricts maintenance recording to Admin and hides action button for Viewer", async () => {
    useAuthStore.setState({
      user: { username: "viewer", displayName: "ICS Platform Viewer", role: "Viewer" },
      role: "Viewer",
      isAuthenticated: true,
    });
    await openAssetsPage();

    fireEvent.click(screen.getByRole("tab", { name: /kế hoạch bảo trì/i }));
    expect(screen.queryByRole("button", { name: /ghi nhận bảo trì/i })).toBeNull();
  });

  it("allows Admin to record maintenance, validates inputs, and updates simulated state and history", async () => {
    await openAssetsPage();

    fireEvent.click(screen.getByRole("tab", { name: /kế hoạch bảo trì/i }));

    const recordBtn = screen.getByRole("button", {
      name: "Ghi nhận bảo trì cho hạng mục: Bảo dưỡng định kỳ máy nén & dàn ngưng",
    });
    fireEvent.click(recordBtn);

    // Modal opens
    const modal = await screen.findByRole("dialog", { name: /ghi nhận thực hiện bảo trì/i });
    expect(modal).toBeTruthy();
    expect(within(modal).getByText(/chưa kết nối api cmms \/ erp hai chiều/i)).toBeTruthy();

    // Fill form
    const performerInput = screen.getByRole("textbox", { name: /kỹ thuật viên \/ đơn vị thực hiện/i });
    fireEvent.change(performerInput, { target: { value: "KTV. Trần Minh Tuấn · MEP Test Team" } });

    const notesInput = screen.getByRole("textbox", { name: /ghi chú kỹ thuật/i });
    fireEvent.change(notesInput, { target: { value: "Đã kiểm tra gas R410A áp suất 1.3MPa, vệ sinh lưới lọc thô." } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: "Lưu bản ghi vào phiên mô phỏng" });
    fireEvent.click(submitBtn);

    // Wait for submission completion
    expect(
      await screen.findByText(/đã ghi nhận bảo trì thành công cho ac-03/i, {}, { timeout: 4000 }),
    ).toBeTruthy();

    // Switch to History tab and verify new record appears
    fireEvent.click(screen.getByRole("tab", { name: /lịch sử bảo trì/i }));
    expect(screen.getByText("KTV. Trần Minh Tuấn · MEP Test Team")).toBeTruthy();
    expect(screen.getByText(/đã kiểm tra gas r410a áp suất 1.3mpa/i)).toBeTruthy();
  });
});
