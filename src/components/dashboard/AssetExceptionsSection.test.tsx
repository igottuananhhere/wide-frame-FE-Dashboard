import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssetException } from "../../features/dashboard/types";
import AssetExceptionsSection from "./AssetExceptionsSection";

const sampleItems: AssetException[] = [
  {
    id: "UT-01",
    deviceId: "device-utility-01",
    type: "Controller",
    area: "Utility Room",
    status: "offline",
    issue: "Mất kết nối",
    actionLabel: "Xem thiết bị",
  },
  {
    id: "UT-02",
    deviceId: "device-utility-02",
    type: "Controller",
    area: "Utility Room 02",
    status: "offline",
    issue: "Mất kết nối",
    actionLabel: "Xem thiết bị",
  },
  {
    id: "AC-03",
    deviceId: "device-ac-03",
    assetId: "asset-ac-03",
    type: "Điều hòa",
    area: "Khu làm việc",
    status: "warning",
    issue: "Sắp đến hạn bảo trì",
    actionLabel: "Xem hồ sơ tài sản",
    maintenanceHoursRemaining: 12,
  },
  {
    id: "AC-07",
    deviceId: "device-ac-07",
    assetId: "asset-ac-07",
    type: "Điều hòa",
    area: "Khu làm việc 2A",
    status: "warning",
    issue: "Sắp đến hạn bảo trì",
    actionLabel: "Xem hồ sơ tài sản",
    maintenanceHoursRemaining: 8,
  },
  {
    id: "CO2-03",
    deviceId: "device-co2-03",
    type: "Sensor",
    area: "Meeting Room 03",
    status: "warning",
    issue: "Cần kiểm tra",
    actionLabel: "Xem thiết bị",
  },
  {
    id: "WS-08",
    deviceId: "device-workspace-08",
    type: "Sensor",
    area: "Khu làm việc",
    status: "offline",
    issue: "Mất kết nối",
    actionLabel: "Xem thiết bị",
  },
];

afterEach(() => {
  cleanup();
});

describe("AssetExceptionsSection", () => {
  it("renders with correct header, default Cards view, and link to all assets", () => {
    render(
      <MemoryRouter>
        <AssetExceptionsSection items={sampleItems} />
      </MemoryRouter>,
    );

    expect(screen.getByText("THIẾT BỊ & BẢO TRÌ · TẤT CẢ TẦNG CÓ DỮ LIỆU")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tài sản cần xử lý" })).toBeTruthy();

    const link = screen.getByRole("link", { name: /tất cả tài sản/i });
    expect(link.getAttribute("href")).toBe("/dashboard/assets");

    // Default view is Cards
    expect(screen.getByRole("button", { name: "Chế độ Thẻ" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Chế độ Bảng" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("displays 3 priority columns with correct counts and cards", () => {
    render(
      <MemoryRouter>
        <AssetExceptionsSection items={sampleItems} />
      </MemoryRouter>,
    );

    const highColumn = screen.getByRole("region", { name: /ưu tiên cao/i });
    expect(highColumn).toBeTruthy();
    expect(within(highColumn).getByText("2")).toBeTruthy(); // UT-01, UT-02
    expect(within(highColumn).getByText("UT-01")).toBeTruthy();
    expect(within(highColumn).getByText("UT-02")).toBeTruthy();

    const mediumColumn = screen.getByRole("region", { name: /ưu tiên trung bình/i });
    expect(mediumColumn).toBeTruthy();
    expect(within(mediumColumn).getByText("4")).toBeTruthy(); // AC-03, AC-07, CO2-03, WS-08

    const lowColumn = screen.getByRole("region", { name: /ưu tiên thấp/i });
    expect(lowColumn).toBeTruthy();
    expect(within(lowColumn).getByText("0")).toBeTruthy();
    expect(within(lowColumn).getByText("Không có tài sản trong nhóm này")).toBeTruthy();
  });

  it("handles expand and collapse for columns with more than 3 cards", () => {
    render(
      <MemoryRouter>
        <AssetExceptionsSection items={sampleItems} />
      </MemoryRouter>,
    );

    const mediumColumn = screen.getByRole("region", { name: /ưu tiên trung bình/i });
    // Total count is 4, so initial view shows 3 cards and a "Xem thêm (1)" button
    const toggleBtn = within(mediumColumn).getByRole("button", { name: /xem thêm/i });
    expect(toggleBtn.textContent).toContain("Xem thêm (1)");

    // Clicking expands all 4 cards
    fireEvent.click(toggleBtn);
    expect(toggleBtn.textContent).toContain("Thu gọn");
    expect(within(mediumColumn).getByText("WS-08")).toBeTruthy();

    // Clicking again collapses back
    fireEvent.click(toggleBtn);
    expect(toggleBtn.textContent).toContain("Xem thêm (1)");
  });

  it("switches smoothly between Cards and Table mode and preserves items and links", () => {
    render(
      <MemoryRouter>
        <AssetExceptionsSection items={sampleItems} />
      </MemoryRouter>,
    );

    // Click Table view button
    fireEvent.click(screen.getByRole("button", { name: "Chế độ Bảng" }));
    expect(screen.getByRole("button", { name: "Chế độ Bảng" }).getAttribute("aria-pressed")).toBe("true");

    // Table is rendered with correct headers
    const table = screen.getByRole("table", { name: /asset exceptions/i });
    expect(within(table).getByText("Device")).toBeTruthy();
    expect(within(table).getByText("Type")).toBeTruthy();
    expect(within(table).getByText("Area")).toBeTruthy();
    expect(within(table).getByText("Status")).toBeTruthy();
    expect(within(table).getByText("Issue")).toBeTruthy();
    expect(within(table).getByText("Action")).toBeTruthy();

    // Contains all items in table
    expect(within(table).getByText("UT-01")).toBeTruthy();
    expect(within(table).getByText("AC-03")).toBeTruthy();
    expect(within(table).getByText("WS-08")).toBeTruthy();

    // Click back to Cards mode
    fireEvent.click(screen.getByRole("button", { name: "Chế độ Thẻ" }));
    expect(screen.getByRole("button", { name: "Chế độ Thẻ" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByRole("table", { name: /asset exceptions/i })).toBeNull();
    expect(screen.getByRole("region", { name: /ưu tiên cao/i })).toBeTruthy();
  });

  it("displays empty state when items list is empty", () => {
    render(
      <MemoryRouter>
        <AssetExceptionsSection items={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Hiện không có tài sản cần xử lý.")).toBeTruthy();
  });

  it("displays loading skeleton when isLoading is true", () => {
    render(
      <MemoryRouter>
        <AssetExceptionsSection items={sampleItems} isLoading={true} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Đang tải danh sách tài sản…")).toBeTruthy();
  });

  it("displays error state with retry button when error is provided", () => {
    const handleRetry = vi.fn();
    render(
      <MemoryRouter>
        <AssetExceptionsSection items={sampleItems} error="Mất kết nối máy chủ" onRetry={handleRetry} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/mất kết nối máy chủ/i)).toBeTruthy();

    const retryBtn = screen.getByRole("button", { name: "Thử lại" });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledOnce();
  });

  it("renders unclassified section when an item has unclassified priority", () => {
    const itemsWithUnclassified: AssetException[] = [
      ...sampleItems,
      {
        id: "UNKNOWN-01",
        deviceId: "device-unknown-01",
        type: "Unknown",
        area: "Khu vực lạ",
        status: "warning",
        issue: "Không xác định",
        actionLabel: "Xem thiết bị",
        priority: "unclassified",
      },
    ];

    render(
      <MemoryRouter>
        <AssetExceptionsSection items={itemsWithUnclassified} />
      </MemoryRouter>,
    );

    const unclassRegion = screen.getByRole("region", { name: /chưa phân loại/i });
    expect(unclassRegion).toBeTruthy();
    expect(within(unclassRegion).getByText("UNKNOWN-01")).toBeTruthy();
  });

  it("opens AssetDetailDrawer when a card is clicked, and closes when close button is clicked", () => {
    render(
      <MemoryRouter>
        <AssetExceptionsSection items={sampleItems} />
      </MemoryRouter>,
    );

    // No drawer initially
    expect(screen.queryByRole("dialog")).toBeNull();

    // Click on card AC-03
    const acCard = screen.getByText("AC-03").closest(".facility-asset-card");
    expect(acCard).toBeTruthy();
    fireEvent.click(acCard!);

    // Drawer is now open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(within(dialog).getAllByText("AC-03").length).toBeGreaterThanOrEqual(1);

    // Close the drawer
    const closeBtn = screen.getByRole("button", { name: "Đóng bảng chi tiết tài sản" });
    fireEvent.click(closeBtn);

    // Drawer is closed
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens AssetDetailDrawer from Table row or action link", () => {
    render(
      <MemoryRouter>
        <AssetExceptionsSection items={sampleItems} initialViewMode="table" />
      </MemoryRouter>,
    );

    // In table view, find UT-01 row action link
    const actionLink = screen.getByLabelText("Xem thiết bị: UT-01");
    fireEvent.click(actionLink);

    // Drawer is open for UT-01
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(within(dialog).getAllByText("UT-01").length).toBeGreaterThanOrEqual(1);
  });
});


