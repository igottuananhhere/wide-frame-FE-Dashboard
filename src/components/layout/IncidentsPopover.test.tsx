import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import IncidentsPopover from "./IncidentsPopover";
import type { TwinAlert } from "../../features/twin/types";

afterEach(() => {
  cleanup();
});

const mockAlerts: TwinAlert[] = [
  {
    id: "alert-01",
    title: "Nhiệt độ phòng Server vượt ngưỡng",
    message: "Nhiệt độ đo được 32.4°C, vượt ngưỡng an toàn",
    severity: "critical",
    status: "active",
    createdAt: new Date().toISOString(),
    buildingId: "bldg-ics",
    floorId: "floor-01",
    roomId: "room-server",
    location: "Phòng Server · Tầng 1",
    reading: "32.4°C",
    kind: "critical",
    occurredAt: Date.now() - 5 * 60 * 1000, // 5 mins ago
    correlationKey: "server-temp",
  },
  {
    id: "alert-02",
    title: "AC-03 đến hạn bảo trì",
    message: "Máy nén AC-03 đã chạy 4,874 giờ tích lũy",
    severity: "warning",
    status: "active",
    createdAt: new Date().toISOString(),
    buildingId: "bldg-ics",
    floorId: "floor-01",
    roomId: "room-server",
    assetId: "asset-ac-03",
    deviceId: "device-ac-03",
    location: "Phòng Server · Tầng 1",
    reading: "4,874 giờ",
    kind: "maintenance",
    occurredAt: Date.now() - 25 * 60 * 1000, // 25 mins ago
    correlationKey: "ac-03-maint",
  },
  {
    id: "alert-03",
    title: "Nồng độ CO2 phòng họp 02 tăng cao",
    message: "CO2 đạt 1250 ppm",
    severity: "warning",
    status: "acknowledged",
    createdAt: new Date().toISOString(),
    buildingId: "bldg-ics",
    floorId: "floor-01",
    roomId: "room-meeting-02",
    location: "Phòng Họp 02 · Tầng 1",
    reading: "1,250 ppm",
    kind: "warning",
    occurredAt: Date.now() - 40 * 60 * 1000,
    correlationKey: "meeting-co2",
  },
];

describe("IncidentsPopover", () => {
  it("renders trigger button with bell icon, text 'Sự cố', and count badge", () => {
    render(
      <MemoryRouter>
        <IncidentsPopover
          unresolvedAlertCount={3}
          noFloorData={false}
          scopeLabel="Tầng 1"
          alerts={mockAlerts}
          canAcknowledge={true}
          onAcknowledge={vi.fn()}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: /3 unresolved alerts/i });
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain("Sự cố");
    expect(trigger.textContent).toContain("3");
    // Popover is not open initially
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens popover tooltip on hover (mouseenter) and displays header and unresolved incidents", () => {
    render(
      <MemoryRouter>
        <IncidentsPopover
          unresolvedAlertCount={3}
          noFloorData={false}
          scopeLabel="Tầng 1"
          alerts={mockAlerts}
          canAcknowledge={true}
          onAcknowledge={vi.fn()}
        />
      </MemoryRouter>,
    );

    const container = screen.getByRole("button", { name: /3 unresolved alerts/i }).parentElement!;
    fireEvent.mouseEnter(container);

    const dialog = screen.getByRole("dialog", { name: "Danh sách sự cố cần giải quyết" });
    expect(dialog).toBeTruthy();
    expect(screen.getByText("Sự cố cần giải quyết")).toBeTruthy();
    expect(screen.getByText("Tầng 1")).toBeTruthy();
    expect(screen.getByText(/3 sự cố \(2 chưa tiếp nhận · 1 đang xử lý\)/i)).toBeTruthy();

    // Verify incident titles
    expect(screen.getByText("Nhiệt độ phòng Server vượt ngưỡng")).toBeTruthy();
    expect(screen.getByText("AC-03 đến hạn bảo trì")).toBeTruthy();
    expect(screen.getByText("Nồng độ CO2 phòng họp 02 tăng cao")).toBeTruthy();

    // Verify badges
    expect(screen.getByText("Critical")).toBeTruthy();
    expect(screen.getByText("Bảo trì")).toBeTruthy();
    expect(screen.getAllByText("Chưa tiếp nhận").length).toBe(2);
    expect(screen.getByText("Đang xử lý")).toBeTruthy();
  });

  it("allows pointer interaction ('chỉ vào') and keeps popover open when hovering into panel", () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter>
        <IncidentsPopover
          unresolvedAlertCount={3}
          noFloorData={false}
          scopeLabel="Tầng 1"
          alerts={mockAlerts}
          canAcknowledge={true}
          onAcknowledge={vi.fn()}
        />
      </MemoryRouter>,
    );

    const container = screen.getByRole("button", { name: /3 unresolved alerts/i }).parentElement!;
    fireEvent.mouseEnter(container);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();

    // Mouse leaves trigger but enters dialog before debounce expires
    fireEvent.mouseLeave(container);
    fireEvent.mouseEnter(dialog);

    vi.advanceTimersByTime(300);

    // Dialog must still remain open because mouse is inside dialog
    expect(screen.getByRole("dialog")).toBeTruthy();

    vi.useRealTimers();
  });

  it("allows Admin to acknowledge active alert and triggers onAcknowledge", () => {
    const handleAcknowledge = vi.fn();

    render(
      <MemoryRouter>
        <IncidentsPopover
          unresolvedAlertCount={3}
          noFloorData={false}
          scopeLabel="Tầng 1"
          alerts={mockAlerts}
          canAcknowledge={true}
          onAcknowledge={handleAcknowledge}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: /3 unresolved alerts/i });
    fireEvent.click(trigger);

    const ackButtons = screen.getAllByRole("button", { name: /tiếp nhận sự cố/i });
    expect(ackButtons.length).toBe(2); // Only for the 2 active alerts

    fireEvent.click(ackButtons[0]);
    expect(handleAcknowledge).toHaveBeenCalledWith("alert-01");
  });

  it("hides acknowledge button when user is Viewer (canAcknowledge: false)", () => {
    render(
      <MemoryRouter>
        <IncidentsPopover
          unresolvedAlertCount={3}
          noFloorData={false}
          scopeLabel="Tầng 1"
          alerts={mockAlerts}
          canAcknowledge={false}
          onAcknowledge={vi.fn()}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: /3 unresolved alerts/i });
    fireEvent.click(trigger);

    expect(screen.queryByRole("button", { name: /tiếp nhận sự cố/i })).toBeNull();
  });

  it("closes on Escape key press", () => {
    render(
      <MemoryRouter>
        <IncidentsPopover
          unresolvedAlertCount={3}
          noFloorData={false}
          scopeLabel="Tầng 1"
          alerts={mockAlerts}
          canAcknowledge={true}
          onAcknowledge={vi.fn()}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: /3 unresolved alerts/i });
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("displays clean state message when there are 0 unresolved alerts", () => {
    render(
      <MemoryRouter>
        <IncidentsPopover
          unresolvedAlertCount={0}
          noFloorData={false}
          scopeLabel="Tầng 1"
          alerts={[]}
          canAcknowledge={true}
          onAcknowledge={vi.fn()}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: /0 unresolved alerts/i });
    fireEvent.click(trigger);

    expect(screen.getByText("Không có sự cố nào cần giải quyết!")).toBeTruthy();
  });

  it("displays unavailable notice when noFloorData is true", () => {
    render(
      <MemoryRouter>
        <IncidentsPopover
          unresolvedAlertCount={0}
          noFloorData={true}
          scopeLabel="Tầng 2"
          alerts={[]}
          canAcknowledge={true}
          onAcknowledge={vi.fn()}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: /alert data unavailable for tầng 2/i });
    expect(trigger.textContent).toContain("—");

    fireEvent.click(trigger);
    expect(screen.getByText("Tầng này chưa có dữ liệu sự cố trực tiếp.")).toBeTruthy();
  });
});
