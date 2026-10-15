import { describe, expect, it } from "vitest";
import { buildAttentionQueue } from "./twinSelectors";
import type { TwinAlert } from "./types";

const makeAlert = (partial: Partial<TwinAlert> & { id: string; occurredAt: number }): TwinAlert => ({
  buildingId: "b-1",
  floorId: "f-1",
  roomId: "r-1",
  deviceId: "d-1",
  title: partial.title ?? partial.id,
  message: "Test message",
  severity: partial.severity ?? "warning",
  status: partial.status ?? "active",
  location: "Khu làm việc",
  kind: partial.kind ?? "warning",
  correlationKey: partial.id,
  createdAt: new Date(partial.occurredAt).toISOString(),
  ...partial,
});

describe("buildAttentionQueue priority and auto-jumping to top", () => {
  it("prioritizes critical incidents above warnings and maintenance", () => {
    const alerts: TwinAlert[] = [
      makeAlert({ id: "warning-1", kind: "warning", severity: "warning", occurredAt: 2000 }),
      makeAlert({ id: "crit-1", kind: "critical", severity: "critical", occurredAt: 1000 }),
      makeAlert({ id: "maint-1", kind: "maintenance", severity: "warning", occurredAt: 3000 }),
    ];

    const queue = buildAttentionQueue(alerts, 5000);
    expect(queue.map((item) => item.id)).toEqual(["crit-1", "warning-1", "maint-1"]);
  });

  it("makes active incidents jump ahead of acknowledged incidents of the same severity", () => {
    const alerts: TwinAlert[] = [
      makeAlert({ id: "warn-ack-newer", kind: "warning", status: "acknowledged", occurredAt: 3000 }),
      makeAlert({ id: "warn-active-older", kind: "warning", status: "active", occurredAt: 1000 }),
    ];

    const queue = buildAttentionQueue(alerts, 5000);
    expect(queue.map((item) => item.id)).toEqual(["warn-active-older", "warn-ack-newer"]);
  });

  it("jumps the newest active incident to the top among items with the same rank", () => {
    const alerts: TwinAlert[] = [
      makeAlert({ id: "warn-1", kind: "warning", status: "active", occurredAt: 1000 }),
      makeAlert({ id: "warn-2", kind: "warning", status: "active", occurredAt: 4000 }),
      makeAlert({ id: "warn-3", kind: "warning", status: "active", occurredAt: 2000 }),
    ];

    const queue = buildAttentionQueue(alerts, 5000);
    expect(queue.map((item) => item.id)).toEqual(["warn-2", "warn-3", "warn-1"]);
  });

  it("moves an incident down when it gets acknowledged, letting active incidents jump ahead", () => {
    const alert1 = makeAlert({ id: "warn-1", kind: "warning", status: "active", occurredAt: 3000 });
    const alert2 = makeAlert({ id: "warn-2", kind: "warning", status: "active", occurredAt: 2000 });

    const beforeAck = buildAttentionQueue([alert1, alert2]);
    expect(beforeAck[0].id).toBe("warn-1");

    // Once alert1 is acknowledged, alert2 (still active) jumps ahead to index 0
    const afterAck = buildAttentionQueue([{ ...alert1, status: "acknowledged" }, alert2]);
    expect(afterAck[0].id).toBe("warn-2");
    expect(afterAck[1].id).toBe("warn-1");
  });

  it("automatically jumps a newly occurred critical alert to index 0", () => {
    const existingAlerts: TwinAlert[] = [
      makeAlert({ id: "warn-1", kind: "warning", status: "active", occurredAt: 3000 }),
      makeAlert({ id: "warn-2", kind: "warning", status: "active", occurredAt: 2000 }),
    ];

    const initialQueue = buildAttentionQueue(existingAlerts);
    expect(initialQueue[0].id).toBe("warn-1");

    const criticalEvent = makeAlert({
      id: "critical-fire",
      title: "Nhiệt độ phòng Server cao",
      kind: "critical",
      severity: "critical",
      status: "active",
      occurredAt: 4000,
    });

    const updatedQueue = buildAttentionQueue([criticalEvent, ...existingAlerts]);
    expect(updatedQueue[0].id).toBe("critical-fire");
    expect(updatedQueue[0].priority).toBe("high");
  });

  it("pushes high-priority incidents (controller/utility offline and overdue maintenance) ahead of medium-priority warnings", () => {
    const alerts: TwinAlert[] = [
      makeAlert({
        id: "alert-meeting-02-co2-high",
        title: "CO₂ Meeting Room 02 vượt ngưỡng",
        location: "Meeting Room 02",
        reading: "CO₂ · 1100 ppm / ngưỡng 1,000 ppm",
        occurredAt: 4000,
      }),
      makeAlert({
        id: "alert-workspace-sensor-offline",
        title: "Sensor WS-08 mất kết nối",
        location: "Khu làm việc",
        reading: "WS-08 · Offline",
        occurredAt: 3000,
      }),
      makeAlert({
        id: "alert-utility-controller-offline",
        title: "Bộ điều khiển Utility Room mất kết nối",
        location: "Utility Room",
        roomId: "room-utility-01",
        deviceId: "device-utility-01",
        reading: "UT-01 · Offline",
        occurredAt: 2000,
      }),
      makeAlert({
        id: "alert-ac-03-maintenance-window",
        title: "AC-03 sắp đến hạn bảo trì",
        kind: "maintenance",
        location: "Khu làm việc",
        reading: "Còn 12 giờ vận hành",
        occurredAt: 1000,
      }),
    ];

    const queue = buildAttentionQueue(alerts, 5000);
    expect(queue.map((item) => item.id)).toEqual([
      "alert-utility-controller-offline",
      "alert-meeting-02-co2-high",
      "alert-workspace-sensor-offline",
      "alert-ac-03-maintenance-window",
    ]);
    expect(queue.map((item) => item.priority)).toEqual([
      "high",
      "medium",
      "medium",
      "medium",
    ]);
  });
});
