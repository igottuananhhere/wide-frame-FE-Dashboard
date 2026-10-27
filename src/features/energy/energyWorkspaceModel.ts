import { ACTIVE_FLOOR_ID, DEMO_FLOOR_2_ID } from "../../data/mock/buildingLocations";
import { floor1MonthlyEnergyForecast } from "../../data/mock/energyForecast.mock";
import {
  floor1AbnormalAreaThresholdKwh,
  floor1EnergyComparison,
} from "../../data/mock/floor1EnergyDetail.mock";
import {
  floor2AbnormalAreaThresholdKwh,
  floor2EnergyComparison,
  floor2MonthlyEnergyForecast,
} from "../../data/mock/floor2EnergyDetail.mock";
import type { EntityId, Floor } from "../../types/models";
import { formatTelemetryTime } from "../building/dataFreshness";
import { formatIsoDateVi, getLocalTodayIso } from "../dashboard/dateFilterUtils";
import type { EnergyPoint } from "../dashboard/types";
import type { FloorRoomSnapshot } from "../floor/types";
import type { TwinDevice } from "../twin/types";
import {
  calculateMonthlyEnergyForecast,
  combineMonthlyEnergyForecastConfigs,
} from "./energyForecast";
import {
  buildEnergyAreaRows,
  buildEnergyDeviceRows,
  calculateEnergyTotal,
  calculateEnergyWaste,
  selectEnergyChartPoints,
  type EnergyChartSource,
  type EnergyWasteEstimate,
} from "./energySelectors";
import type {
  DeviceEnergyReading,
  EnergyAreaRow,
  EnergyDeviceRow,
  MonthlyEnergyForecast,
} from "./types";

export const AREA_THRESHOLDS_BY_FLOOR: Readonly<Record<EntityId, number>> = {
  [ACTIVE_FLOOR_ID]: floor1AbnormalAreaThresholdKwh,
  [DEMO_FLOOR_2_ID]: floor2AbnormalAreaThresholdKwh,
};

export interface FloorEnergyBreakdownRow {
  floorId: EntityId;
  floorName: string;
  floorNumber: number;
  hasData: boolean;
  dataSourceLabel: string;
  readingDateLabel: string;
  energyKwh: number | null;
  yesterdayKwh: number | null;
  sharePercent: number | null;
  roomCount: number;
  deviceCount: number;
  abnormalCount: number;
}

export interface CorrelatedEnergyDeviceAlert {
  deviceId: EntityId;
  assetId?: EntityId;
  deviceName: string;
  deviceType: string;
  energyKwh: number;
  thresholdKwh: number;
  excessKwh: number;
  shareOfRoomPercent: number;
}

export interface CorrelatedEnergyAlertGroup {
  id: string;
  floorId: EntityId;
  floorName: string;
  roomId: EntityId;
  roomName: string;
  isAreaAbnormal: boolean;
  areaEnergyKwh: number;
  areaThresholdKwh: number;
  areaExcessKwh: number;
  relatedDevices: CorrelatedEnergyDeviceAlert[];
  isCorrelatedAreaAndDevice: boolean;
  relationshipSummary: string;
}

export interface EnergyYesterdayComparisonModel {
  isComparable: boolean;
  yesterdayKwh: number | null;
  changePercent: number | null;
  deltaKwh: number | null;
  primaryValueLabel: string;
  detailLabel: string;
  reasonIfIncomparable?: string;
  yesterdaySeries: EnergyPoint[];
}

export interface EnergyReconciliationModel {
  totalFloorKwh: number;
  allocatedAreaKwh: number;
  unallocatedAreaKwh: number;
  sampledDeviceCount: number;
  totalDeviceCount: number;
  sampledDevicesKwh: number;
  unmonitoredDevicesKwh: number;
  sampledCoveragePercent: number;
}

export interface EnergyWasteStatusModel {
  isAvailable: boolean;
  cardLabel: string;
  estimate: EnergyWasteEstimate | null;
  rateVndPerKwh: number;
  baselineKwh: number | null;
  baselineDateFormatted: string | null;
  unavailableValueLabel: string;
  unavailableDetailLabel: string;
}

export interface UnifiedEnergyWorkspaceModel {
  isBuildingScope: boolean;
  hasScopeData: boolean;
  scopeLabel: string;
  totalBuildingFloors: number;
  configuredFloorCount: number;
  coverageBadgeLabel: string;
  coverageDetailLabel: string;
  latestReadingDateIso: string;
  latestReadingDateVi: string;
  lastUpdatedTimeLabel: string;
  simulationStatusLabel: string;
  isPaused: boolean;
  energyChartFloorId: EntityId;
  energyChartSource: EnergyChartSource;
  energyChartScopeLabel: string;
  energyChartScopeNote?: string;
  energyChartPoints: readonly EnergyPoint[];
  energyTodayKwh: number;
  yesterdayComparison: EnergyYesterdayComparisonModel;
  reconciliation: EnergyReconciliationModel;
  floorBreakdownRows: FloorEnergyBreakdownRow[];
  areaRows: EnergyAreaRow[];
  deviceRows: EnergyDeviceRow[];
  correlatedAlerts: CorrelatedEnergyAlertGroup[];
  abnormalAreaCount: number;
  abnormalDeviceCount: number;
  wasteStatus: EnergyWasteStatusModel;
  monthlyForecast: MonthlyEnergyForecast | null;
}

export interface BuildUnifiedEnergyWorkspaceInput {
  isBuildingScope: boolean;
  scopeLabel: string;
  selectedFloorId: EntityId;
  allBuildingFloors: readonly Floor[];
  configuredFloors: readonly Floor[];
  scopedFloorIds: readonly EntityId[];
  allRoomsInStore: readonly FloorRoomSnapshot[];
  scopedRooms: readonly FloorRoomSnapshot[];
  scopedDevices: readonly TwinDevice[];
  scopedDeviceReadings: readonly DeviceEnergyReading[];
  energyHistoryByFloor: Partial<Readonly<Record<EntityId, readonly EnergyPoint[]>>>;
  lastUpdatedByFloor: Partial<Readonly<Record<EntityId, number>>>;
  automaticTelemetryRunning: boolean;
}

export function buildUnifiedEnergyWorkspaceModel(
  input: BuildUnifiedEnergyWorkspaceInput,
): UnifiedEnergyWorkspaceModel {
  const {
    isBuildingScope,
    scopeLabel,
    allBuildingFloors,
    configuredFloors,
    scopedFloorIds,
    allRoomsInStore,
    scopedRooms,
    scopedDevices,
    scopedDeviceReadings,
    energyHistoryByFloor,
    lastUpdatedByFloor,
    automaticTelemetryRunning,
  } = input;

  const totalBuildingFloors = allBuildingFloors.length || 5;
  const configuredFloorCount = configuredFloors.length;
  const hasScopeData = scopedFloorIds.length > 0 && scopedRooms.length > 0;

  const floorNameById = new Map<string, string>(
    allBuildingFloors.map((floor) => [floor.id, floor.name]),
  );
  floorNameById.set(ACTIVE_FLOOR_ID, floorNameById.get(ACTIVE_FLOOR_ID) ?? "Floor 1");
  floorNameById.set(DEMO_FLOOR_2_ID, floorNameById.get(DEMO_FLOOR_2_ID) ?? "Floor 2");

  const floor1UpdatedAt = lastUpdatedByFloor[ACTIVE_FLOOR_ID];
  const floor1DateIso = getLocalTodayIso(floor1UpdatedAt);
  const floor1DateVi = formatIsoDateVi(floor1DateIso);
  const floor1TimeClock = floor1UpdatedAt ? formatTelemetryTime(floor1UpdatedAt) : "17:00:00";
  const floor2DateIso = floor2MonthlyEnergyForecast.readingDate;
  const floor2DateVi = formatIsoDateVi(floor2DateIso);

  const includesFloor1 = scopedFloorIds.includes(ACTIVE_FLOOR_ID);
  const includesFloor2 = scopedFloorIds.includes(DEMO_FLOOR_2_ID);

  const latestReadingDateIso = includesFloor1 ? floor1DateIso : floor2DateIso;
  const latestReadingDateVi = formatIsoDateVi(latestReadingDateIso);

  const energyChartFloorId = includesFloor1 ? ACTIVE_FLOOR_ID : DEMO_FLOOR_2_ID;
  const energyChartSource: EnergyChartSource =
    energyChartFloorId === DEMO_FLOOR_2_ID ? "dated-sample" : "current-day";
  const energyChartScopeLabel = energyChartFloorId === DEMO_FLOOR_2_ID ? "Floor 2" : "Floor 1";
  const energyChartPoints = energyHistoryByFloor[energyChartFloorId] ?? [];
  const lastChartHour = energyChartPoints.at(-1)?.time ?? "17:00";

  const lastUpdatedTimeLabel = includesFloor1
    ? `${floor1DateVi} · ${floor1TimeClock} (khung 08:00–${lastChartHour})`
    : `${floor2DateVi} · 17:00 (mẫu tĩnh 08:00–${lastChartHour})`;

  const isPaused = includesFloor1 && !automaticTelemetryRunning;
  const simulationStatusLabel = includesFloor1
    ? automaticTelemetryRunning
      ? "Mô phỏng đang chạy"
      : "Mô phỏng tạm dừng"
    : `Dữ liệu mẫu ngày ${floor2DateVi}`;

  const coverageBadgeLabel = isBuildingScope
    ? `Phạm vi vận hành demo: Tầng 1 / ${totalBuildingFloors} tầng — Dữ liệu mô phỏng`
    : `${scopeLabel} · 1/${totalBuildingFloors} tầng tòa nhà`;

  const coverageDetailLabel = isBuildingScope
    ? `Phạm vi vận hành demo: Tầng 1 / ${totalBuildingFloors} tầng — Dữ liệu mô phỏng. Các tầng 2–5 hiển thị "Ngoài phạm vi demo" và không cộng vào số liệu vận hành.`
    : `Đang lọc riêng ${scopeLabel}. Mọi chỉ số KPI, biểu đồ, cảnh báo, khu vực, thiết bị và dự báo bên dưới đều thuộc phạm vi ${scopeLabel}.`;

  const energyChartScopeNote = isBuildingScope
    ? `Phạm vi vận hành demo: Tầng 1 / ${totalBuildingFloors} tầng`
    : undefined;

  // Build enriched area rows & device rows
  const baseAreaRows = buildEnergyAreaRows(scopedRooms, AREA_THRESHOLDS_BY_FLOOR);
  const baseDeviceRows = buildEnergyDeviceRows(scopedDevices, scopedRooms, scopedDeviceReadings);

  const readingByDeviceId = new Map(
    scopedDeviceReadings.map((reading) => [reading.deviceId, reading]),
  );
  const roomById = new Map(scopedRooms.map((room) => [room.id, room]));

  const deviceRows: EnergyDeviceRow[] = baseDeviceRows.map((row) => {
    const deviceObj = scopedDevices.find((d) => d.id === row.deviceId);
    const readingObj = readingByDeviceId.get(row.deviceId);
    const roomObj = deviceObj ? roomById.get(deviceObj.roomId) : undefined;
    const thresholdKwh = readingObj?.abnormalThresholdKwh ?? 18;
    const excessKwh = Math.max(0, Number((row.energyKwh - thresholdKwh).toFixed(1)));
    const shareOfRoomPercent =
      roomObj && roomObj.energyConsumption > 0
        ? Number(((row.energyKwh / roomObj.energyConsumption) * 100).toFixed(1))
        : 0;

    return {
      ...row,
      assetId: deviceObj?.assetId,
      roomId: deviceObj?.roomId,
      floorId: roomObj?.floorId,
      floorName: roomObj ? (floorNameById.get(roomObj.floorId) ?? roomObj.floorId) : undefined,
      thresholdKwh,
      excessKwh,
      shareOfRoomPercent,
    };
  });

  const areaRows: EnergyAreaRow[] = baseAreaRows.map((area) => {
    const roomObj = roomById.get(area.roomId);
    const thresholdKwh = AREA_THRESHOLDS_BY_FLOOR[area.floorId] ?? 35;
    const excessKwh = Math.max(0, Number((area.energyKwh - thresholdKwh).toFixed(1)));
    const areaDevices = deviceRows.filter((d) => d.roomId === area.roomId);
    const sampledDevicesKwh = Number(
      areaDevices.reduce((sum, d) => sum + d.energyKwh, 0).toFixed(1),
    );
    const unmonitoredRoomKwh = Math.max(
      0,
      Number((area.energyKwh - sampledDevicesKwh).toFixed(1)),
    );

    return {
      ...area,
      floorName: floorNameById.get(area.floorId) ?? area.floorId,
      thresholdKwh,
      excessKwh,
      sampledDeviceCount: areaDevices.length,
      totalDeviceCount: roomObj?.deviceCount ?? areaDevices.length,
      sampledDevicesKwh,
      unmonitoredRoomKwh,
    };
  });

  // Floor -> Area -> Device reconciliation (never double-count devices into areas or floors)
  const energyTodayKwh = Number(calculateEnergyTotal(scopedRooms).toFixed(1));
  const allocatedAreaKwh = Number(
    areaRows.reduce((sum, area) => sum + area.energyKwh, 0).toFixed(1),
  );
  const unallocatedAreaKwh = Math.max(
    0,
    Number((energyTodayKwh - allocatedAreaKwh).toFixed(1)),
  );
  const totalDeviceCount = scopedRooms.reduce((sum, room) => sum + room.deviceCount, 0);
  const sampledDeviceCount = deviceRows.length;
  const sampledDevicesKwh = Number(
    deviceRows.reduce((sum, d) => sum + d.energyKwh, 0).toFixed(1),
  );
  const unmonitoredDevicesKwh = Math.max(
    0,
    Number((energyTodayKwh - sampledDevicesKwh).toFixed(1)),
  );
  const sampledCoveragePercent =
    energyTodayKwh > 0
      ? Number(((sampledDevicesKwh / energyTodayKwh) * 100).toFixed(1))
      : 0;

  const reconciliation: EnergyReconciliationModel = {
    totalFloorKwh: energyTodayKwh,
    allocatedAreaKwh,
    unallocatedAreaKwh,
    sampledDeviceCount,
    totalDeviceCount,
    sampledDevicesKwh,
    unmonitoredDevicesKwh,
    sampledCoveragePercent,
  };

  // Floor breakdown across all 5 floors in the building
  const floorBreakdownRows: FloorEnergyBreakdownRow[] = allBuildingFloors.map((floor) => {
    const hasData = floor.dataAvailability === "simulation";
    if (!hasData) {
      return {
        floorId: floor.id,
        floorName: floor.name,
        floorNumber: floor.level,
        hasData: false,
        dataSourceLabel: "Ngoài phạm vi demo",
        readingDateLabel: "Ngoài phạm vi demo",
        energyKwh: null,
        yesterdayKwh: null,
        sharePercent: null,
        roomCount: 0,
        deviceCount: 0,
        abnormalCount: 0,
      };
    }

    const floorRooms = allRoomsInStore.filter((room) => room.floorId === floor.id);
    const floorKwh = Number(calculateEnergyTotal(floorRooms).toFixed(1));
    const floorYesterday =
      floor.id === ACTIVE_FLOOR_ID
        ? floor1EnergyComparison.yesterdayKwh
        : floor.id === DEMO_FLOOR_2_ID
          ? floor2EnergyComparison.yesterdayKwh
          : null;
    const floorThreshold = AREA_THRESHOLDS_BY_FLOOR[floor.id] ?? 35;
    const floorAbnormalRooms = floorRooms.filter(
      (r) => r.energyConsumption > floorThreshold,
    ).length;
    const sharePercent =
      energyTodayKwh > 0 ? Number(((floorKwh / energyTodayKwh) * 100).toFixed(1)) : 0;

    return {
      floorId: floor.id,
      floorName: floor.name,
      floorNumber: floor.level,
      hasData: true,
      dataSourceLabel:
        floor.id === ACTIVE_FLOOR_ID
          ? automaticTelemetryRunning
            ? "Mô phỏng đang chạy"
            : "Mô phỏng tạm dừng"
          : "Dữ liệu mẫu",
      readingDateLabel:
        floor.id === ACTIVE_FLOOR_ID
          ? `${floor1DateVi} · 08:00–${lastChartHour}`
          : `${floor2DateVi} · 08:00–17:00`,
      energyKwh: floorKwh,
      yesterdayKwh: floorYesterday,
      sharePercent,
      roomCount: floorRooms.length,
      deviceCount: floorRooms.reduce((sum, r) => sum + r.deviceCount, 0),
      abnormalCount: floorAbnormalRooms,
    };
  });

  // Yesterday comparison validation: only compare when both sides have the same floor scope & same time window
  const observedPoints = selectEnergyChartPoints(
    energyChartPoints,
    energyChartSource,
    lastChartHour,
  );
  const hasComparableTimeWindow = observedPoints.length >= 2 && lastChartHour >= "17:00";

  let yesterdayComparison: EnergyYesterdayComparisonModel;
  if (!hasScopeData) {
    yesterdayComparison = {
      isComparable: false,
      yesterdayKwh: null,
      changePercent: null,
      deltaKwh: null,
      primaryValueLabel: "Không đủ dữ liệu để so sánh",
      detailLabel: "Tầng đã chọn chưa có dữ liệu đo",
      reasonIfIncomparable: "Chưa có dữ liệu điện năng cho phạm vi đã chọn.",
      yesterdaySeries: [],
    };
  } else if (isBuildingScope && includesFloor1 && includesFloor2 && floor1DateIso !== floor2DateIso) {
    const referenceSum = Number(
      (floor1EnergyComparison.yesterdayKwh + floor2EnergyComparison.yesterdayKwh).toFixed(1),
    );
    const scale = energyTodayKwh > 0 ? floor1EnergyComparison.yesterdayKwh / 125.6 : 0.92;
    yesterdayComparison = {
      isComparable: false,
      yesterdayKwh: referenceSum,
      changePercent: null,
      deltaKwh: null,
      primaryValueLabel: "Không đủ dữ liệu để so sánh",
      detailLabel: `Khác mốc ngày giữa Floor 1 (${floor1DateVi}) và Floor 2 (${floor2DateVi})`,
      reasonIfIncomparable:
        "Không hiển thị % tăng/giảm toàn tòa nhà vì Floor 1 là dữ liệu mô phỏng hiện tại còn Floor 2 là mẫu tĩnh ngày 08/10/2026.",
      yesterdaySeries: energyChartPoints.map((pt) => ({
        time: pt.time,
        kwh: Number((pt.kwh * scale).toFixed(1)),
      })),
    };
  } else if (!hasComparableTimeWindow) {
    yesterdayComparison = {
      isComparable: false,
      yesterdayKwh: null,
      changePercent: null,
      deltaKwh: null,
      primaryValueLabel: "Không đủ dữ liệu để so sánh",
      detailLabel: `Chưa đủ khung giờ tương ứng (${observedPoints.length} mốc đo)`,
      reasonIfIncomparable: "Cần cùng phạm vi tầng và đủ khung giờ tương ứng để so sánh với hôm qua.",
      yesterdaySeries: [],
    };
  } else {
    const singleFloorYesterdayKwh = includesFloor1
      ? floor1EnergyComparison.yesterdayKwh
      : floor2EnergyComparison.yesterdayKwh;
    const deltaKwh = Number((energyTodayKwh - singleFloorYesterdayKwh).toFixed(1));
    const changePercent =
      singleFloorYesterdayKwh > 0
        ? Number((((energyTodayKwh / singleFloorYesterdayKwh) - 1) * 100).toFixed(1))
        : 0;
    const scale = energyTodayKwh > 0 ? singleFloorYesterdayKwh / energyTodayKwh : 1;

    yesterdayComparison = {
      isComparable: true,
      yesterdayKwh: singleFloorYesterdayKwh,
      changePercent,
      deltaKwh,
      primaryValueLabel: `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%`,
      detailLabel: `Hôm qua · ${singleFloorYesterdayKwh.toFixed(1)} kWh (cùng khung 00:00–${lastChartHour})`,
      yesterdaySeries: energyChartPoints.map((pt) => ({
        time: pt.time,
        kwh: Number((pt.kwh * scale).toFixed(1)),
      })),
    };
  }

  // Correlated threshold alerts: group abnormal areas and abnormal devices in the same room
  const abnormalAreas = areaRows.filter((area) => area.abnormal);
  const abnormalDevices = deviceRows.filter((device) => device.abnormal);
  const correlatedAlerts: CorrelatedEnergyAlertGroup[] = [];
  const handledDeviceIds = new Set<string>();

  for (const area of abnormalAreas) {
    const related = abnormalDevices
      .filter((d) => d.roomId === area.roomId)
      .map((d) => {
        handledDeviceIds.add(d.deviceId);
        return {
          deviceId: d.deviceId,
          assetId: d.assetId,
          deviceName: d.name,
          deviceType: d.type,
          energyKwh: d.energyKwh,
          thresholdKwh: d.thresholdKwh ?? 18,
          excessKwh: d.excessKwh ?? 0,
          shareOfRoomPercent: d.shareOfRoomPercent ?? 0,
        };
      });

    const isCorrelated = related.length > 0;
    const relationshipSummary = isCorrelated
      ? `Có liên hệ trực tiếp: Thiết bị ${related.map((r) => `${r.deviceName} (${r.energyKwh.toFixed(1)} kWh, vượt +${r.excessKwh.toFixed(1)} kWh)`).join(", ")} nằm trong ${area.name} và chiếm ${related.reduce((s, r) => s + r.shareOfRoomPercent, 0).toFixed(1)}% tổng điện năng khu vực này — không phải hai nguyên nhân độc lập.`
      : `Khu vực ${area.name} vượt ngưỡng +${(area.excessKwh ?? 0).toFixed(1)} kWh; các thiết bị có đo riêng trong khu vực hiện chưa vượt ngưỡng đơn lẻ.`;

    correlatedAlerts.push({
      id: `alert-group-${area.roomId}`,
      floorId: area.floorId,
      floorName: area.floorName ?? "Floor 1",
      roomId: area.roomId,
      roomName: area.name,
      isAreaAbnormal: true,
      areaEnergyKwh: area.energyKwh,
      areaThresholdKwh: area.thresholdKwh ?? 35,
      areaExcessKwh: area.excessKwh ?? 0,
      relatedDevices: related,
      isCorrelatedAreaAndDevice: isCorrelated,
      relationshipSummary,
    });
  }

  for (const device of abnormalDevices) {
    if (handledDeviceIds.has(device.deviceId)) continue;
    const parentArea = areaRows.find((a) => a.roomId === device.roomId);
    correlatedAlerts.push({
      id: `alert-device-${device.deviceId}`,
      floorId: device.floorId ?? ACTIVE_FLOOR_ID,
      floorName: device.floorName ?? "Floor 1",
      roomId: device.roomId ?? "",
      roomName: device.roomName,
      isAreaAbnormal: false,
      areaEnergyKwh: parentArea?.energyKwh ?? device.energyKwh,
      areaThresholdKwh: parentArea?.thresholdKwh ?? 35,
      areaExcessKwh: 0,
      relatedDevices: [
        {
          deviceId: device.deviceId,
          assetId: device.assetId,
          deviceName: device.name,
          deviceType: device.type,
          energyKwh: device.energyKwh,
          thresholdKwh: device.thresholdKwh ?? 18,
          excessKwh: device.excessKwh ?? 0,
          shareOfRoomPercent: device.shareOfRoomPercent ?? 0,
        },
      ],
      isCorrelatedAreaAndDevice: false,
      relationshipSummary: `Thiết bị ${device.name} vượt ngưỡng riêng (+${(device.excessKwh ?? 0).toFixed(1)} kWh), nhưng tổng khu vực ${device.roomName} vẫn trong ngưỡng.`,
    });
  }

  // Waste estimate status (P2 #13: Only show estimate when reliable baseline exists; otherwise show "Chưa đủ dữ liệu để ước tính")
  const isSingleFloor1 = scopedFloorIds.length === 1 && scopedFloorIds[0] === ACTIVE_FLOOR_ID;
  const wasteStatus: EnergyWasteStatusModel = isSingleFloor1
    ? {
        isAvailable: true,
        cardLabel: "Điện vượt mức tham chiếu — ước tính",
        estimate: calculateEnergyWaste(
          energyTodayKwh,
          floor1MonthlyEnergyForecast.baselineTodayKwh,
          floor1MonthlyEnergyForecast.averageRateVndPerKwh,
        ),
        rateVndPerKwh: floor1MonthlyEnergyForecast.averageRateVndPerKwh,
        baselineKwh: floor1MonthlyEnergyForecast.baselineTodayKwh,
        baselineDateFormatted: floor2DateVi,
        unavailableValueLabel: "Chưa đủ dữ liệu để ước tính",
        unavailableDetailLabel: "",
      }
    : {
        isAvailable: false,
        cardLabel: "Điện vượt mức tham chiếu — ước tính",
        estimate: null,
        rateVndPerKwh: floor1MonthlyEnergyForecast.averageRateVndPerKwh,
        baselineKwh: null,
        baselineDateFormatted: null,
        unavailableValueLabel: "Chưa đủ dữ liệu để ước tính",
        unavailableDetailLabel: isBuildingScope
          ? "Thiếu baseline chuẩn hóa cùng kỳ cho toàn bộ các tầng trong phạm vi chọn"
          : "Tầng này chỉ có bộ mẫu tĩnh, chưa có baseline vận hành trực tiếp để ước tính lãng phí",
      };

  // Monthly forecast synchronized with the active scope and latest reading date (P0 #5)
  const forecastConfigs = scopedFloorIds.flatMap((floorId) =>
    floorId === ACTIVE_FLOOR_ID
      ? [floor1MonthlyEnergyForecast]
      : floorId === DEMO_FLOOR_2_ID
        ? [floor2MonthlyEnergyForecast]
        : [],
  );
  const combinedForecastConfig = combineMonthlyEnergyForecastConfigs(
    forecastConfigs,
    isBuildingScope
      ? "BUILDING-METERS-DEMO (METER-01 + METER-02)"
      : forecastConfigs.map((config) => config.meterId).join(" + "),
  );
  const monthlyForecast = combinedForecastConfig
    ? calculateMonthlyEnergyForecast(combinedForecastConfig, energyTodayKwh, {
        latestReadingDate: latestReadingDateIso,
        lastUpdatedTimeLabel,
        scopeSummaryLabel: coverageBadgeLabel,
      })
    : null;

  return {
    isBuildingScope,
    hasScopeData,
    scopeLabel,
    totalBuildingFloors,
    configuredFloorCount,
    coverageBadgeLabel,
    coverageDetailLabel,
    latestReadingDateIso,
    latestReadingDateVi,
    lastUpdatedTimeLabel,
    simulationStatusLabel,
    isPaused,
    energyChartFloorId,
    energyChartSource,
    energyChartScopeLabel,
    energyChartScopeNote,
    energyChartPoints,
    energyTodayKwh,
    yesterdayComparison,
    reconciliation,
    floorBreakdownRows,
    areaRows,
    deviceRows,
    correlatedAlerts,
    abnormalAreaCount: abnormalAreas.length,
    abnormalDeviceCount: abnormalDevices.length,
    wasteStatus,
    monthlyForecast,
  };
}

