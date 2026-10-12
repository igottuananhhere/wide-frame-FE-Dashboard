import { describe, expect, it } from "vitest";
import type { AssetException } from "../dashboard/types";
import type { TwinAlert } from "../twin/types";
import { groupAssetsByPriority, resolveAssetPriority } from "./priorityRules";

const mockItem = (partial: Partial<AssetException>): AssetException => ({
  id: "AC-01",
  deviceId: "device-ac-01",
  type: "Điều hòa",
  area: "Khu làm việc",
  status: "warning",
  issue: "Cần kiểm tra",
  actionLabel: "Xem thiết bị",
  ...partial,
});

describe("priorityRules - resolveAssetPriority", () => {
  it("respects explicit priority from item if provided", () => {
    const item = mockItem({ priority: "high", status: "warning" });
    expect(resolveAssetPriority(item)).toBe("high");

    const itemLow = mockItem({ priority: "low", status: "critical" });
    expect(resolveAssetPriority(itemLow)).toBe("low");
  });

  it("classifies critical status and critical issues as high priority", () => {
    const criticalStatus = mockItem({ status: "critical", issue: "Quá tải" });
    expect(resolveAssetPriority(criticalStatus)).toBe("high");

    const criticalIssue = mockItem({ status: "warning", issue: "Vượt ngưỡng vận hành" });
    expect(resolveAssetPriority(criticalIssue)).toBe("high");

    const dueMaintenance = mockItem({ status: "warning", issue: "Đến hạn bảo trì" });
    expect(resolveAssetPriority(dueMaintenance)).toBe("high");
  });

  it("classifies controllers or utility/server room equipment offline as high priority", () => {
    const controller = mockItem({
      id: "UT-01",
      type: "Controller",
      status: "offline",
      area: "Utility Room",
      issue: "Mất kết nối",
    });
    expect(resolveAssetPriority(controller)).toBe("high");

    const serverDevice = mockItem({
      id: "SRV-01",
      type: "Gateway",
      status: "offline",
      area: "Server Room 01",
      issue: "Mất kết nối",
    });
    expect(resolveAssetPriority(serverDevice)).toBe("high");
  });

  it("classifies critical alerts as high priority", () => {
    const alert: TwinAlert = {
      id: "alert-1",
      deviceId: "device-sensor-99",
      roomId: "room-1",
      buildingId: "b-1",
      floorId: "f-1",
      title: "Cháy",
      message: "Nguy hiểm",
      severity: "critical",
      status: "active",
      kind: "critical",
      location: "Khu làm việc",
      correlationKey: "k-1",
      createdAt: new Date().toISOString(),
      occurredAt: Date.now(),
    };

    const item = mockItem({ deviceId: "device-sensor-99", status: "warning" });
    expect(resolveAssetPriority(item, { alerts: [alert] })).toBe("high");
  });

  it("classifies maintenance due soon, inspection needed, and workspace sensor offline as medium priority", () => {
    const maintSoon = mockItem({ status: "warning", issue: "Sắp đến hạn bảo trì" });
    expect(resolveAssetPriority(maintSoon)).toBe("medium");

    const needCheck = mockItem({ status: "warning", issue: "Cần kiểm tra" });
    expect(resolveAssetPriority(needCheck)).toBe("medium");

    const sensorOffline = mockItem({
      id: "WS-08",
      type: "Sensor",
      status: "offline",
      area: "Khu làm việc",
      issue: "Mất kết nối",
    });
    expect(resolveAssetPriority(sensorOffline)).toBe("medium");
  });

  it("classifies routine maintenance as low priority", () => {
    const routine = mockItem({
      status: "warning",
      issue: "Bảo trì định kỳ",
    });
    expect(resolveAssetPriority(routine)).toBe("low");
  });

  it("returns unclassified when rule does not match", () => {
    const unclass = mockItem({
      priority: "unclassified",
    });
    expect(resolveAssetPriority(unclass)).toBe("unclassified");
  });

  it("correctly groups items into high, medium, low, unclassified", () => {
    const items = [
      mockItem({ id: "UT-01", type: "Controller", status: "offline", area: "Utility Room" }),
      mockItem({ id: "AC-03", type: "Điều hòa", status: "warning", issue: "Sắp đến hạn bảo trì" }),
      mockItem({ id: "WS-08", type: "Sensor", status: "offline", area: "Khu làm việc" }),
      mockItem({ id: "FILTER-01", type: "Lọc gió", status: "warning", issue: "Kiểm tra định kỳ" }),
    ];

    const grouped = groupAssetsByPriority(items);
    expect(grouped.high.map((i) => i.id)).toEqual(["UT-01"]);
    expect(grouped.medium.map((i) => i.id)).toEqual(["AC-03", "WS-08"]);
    expect(grouped.low.map((i) => i.id)).toEqual(["FILTER-01"]);
    expect(grouped.unclassified).toEqual([]);
  });
});
