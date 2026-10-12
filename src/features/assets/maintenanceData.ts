import type { TwinDevice } from "../twin/types";
import type {
  AssetDigitalIdentity,
  AssetMaintenanceStatus,
  MaintenanceHistoryRecord,
  MaintenanceKpiSummary,
  MaintenancePlanItem,
} from "./types";

/**
 * Baseline maintenance plans for assets in ICS Digital Twin.
 * Multiple plans per asset reflect real-world mechanical and electrical upkeep.
 */
export const initialMaintenancePlans: readonly MaintenancePlanItem[] = [
  // --- AC-03 (Floor 1) ---
  {
    id: "plan-ac03-compressor",
    assetId: "asset-ac-03",
    deviceId: "device-ac-03",
    assetName: "AC-03",
    assetModel: "VRV IV · RXQ12T",
    roomId: "room-workspace-01",
    floorId: "ics-headquarters-floor-1",
    title: "Bảo dưỡng định kỳ máy nén & dàn ngưng",
    basis: "runtime_hours",
    basisLabel: "Theo giờ vận hành",
    intervalValue: 500,
    intervalUnit: "hours",
    intervalLabel: "500 giờ vận hành",
    nominalCycleLabel: "Chu kỳ 500 giờ",
    nextMilestoneValue: 4874,
    nextMilestoneLabel: "4,874 giờ",
    remainingHours: 12,
    remainingLabel: "Còn 12 giờ vận hành",
    dueStatus: "due-soon",
    progressStatus: "scheduled",
    assignee: "Đội Cơ điện MEP",
    lastCompletedDate: "15/10/2025",
    notes: "Kiểm tra áp suất hút/đẩy máy nén inverter, kiểm tra dầu bôi trơn và siết rắc co đồng.",
  },
  {
    id: "plan-ac03-filters",
    assetId: "asset-ac-03",
    deviceId: "device-ac-03",
    assetName: "AC-03",
    assetModel: "VRV IV · RXQ12T",
    roomId: "room-workspace-01",
    floorId: "ics-headquarters-floor-1",
    title: "Vệ sinh màng lọc bụi & kiểm tra môi chất lạnh (Gas)",
    basis: "calendar",
    basisLabel: "Theo lịch định kỳ",
    intervalValue: 90,
    intervalUnit: "days",
    intervalLabel: "90 ngày (Định kỳ quý)",
    nominalCycleLabel: "Chu kỳ 90 ngày",
    nextMilestoneValue: "2026-07-15",
    nextMilestoneLabel: "15/07/2026",
    remainingDays: 95,
    remainingLabel: "Còn 95 ngày",
    dueStatus: "normal",
    progressStatus: "scheduled",
    assignee: "KTV. Nguyễn Văn Hùng · Đội Cơ điện MEP",
    lastCompletedDate: "18/04/2026",
    notes: "Rửa sạch phin lọc bụi thô, đo áp suất tĩnh dàn lạnh và nồng độ rò rỉ gas.",
  },
  {
    id: "plan-ac03-electrical-safety",
    assetId: "asset-ac-03",
    deviceId: "device-ac-03",
    assetName: "AC-03",
    assetModel: "VRV IV · RXQ12T",
    roomId: "room-workspace-01",
    floorId: "ics-headquarters-floor-1",
    title: "Kiểm định an toàn điện & dòng rò động cơ",
    basis: "calendar",
    basisLabel: "Theo lịch định kỳ",
    intervalValue: 365,
    intervalUnit: "days",
    intervalLabel: "Hàng năm (365 ngày)",
    nominalCycleLabel: "Chu kỳ 365 ngày",
    nextMilestoneValue: "2026-11-20",
    nextMilestoneLabel: "20/11/2026",
    remainingDays: 223,
    remainingLabel: "Còn 223 ngày",
    dueStatus: "normal",
    progressStatus: "scheduled",
    assignee: "Trung tâm kiểm định kỹ thuật an toàn",
    lastCompletedDate: "20/11/2025",
    notes: "Đo điện trở cách điện Megger cuộn dây, kiểm tra aptomat chống giật RCCB.",
  },

  // --- AC-07 (Floor 2) ---
  {
    id: "plan-ac07-compressor",
    assetId: "asset-ac-07",
    deviceId: "device-ac-07",
    assetName: "AC-07",
    assetModel: "SkyAir · RZQ125",
    roomId: "room-workspace-02",
    floorId: "demo-floor-2",
    title: "Bảo dưỡng định kỳ máy nén & nạp gas bổ sung",
    basis: "runtime_hours",
    basisLabel: "Theo giờ vận hành",
    intervalValue: 500,
    intervalUnit: "hours",
    intervalLabel: "500 giờ vận hành",
    nominalCycleLabel: "Chu kỳ 500 giờ",
    nextMilestoneValue: 3424,
    nextMilestoneLabel: "3,424 giờ",
    remainingHours: 8,
    remainingLabel: "Còn 8 giờ vận hành",
    dueStatus: "due-soon",
    progressStatus: "in_progress",
    assignee: "Dịch vụ ủy quyền Daikin",
    lastCompletedDate: "20/11/2025",
    notes: "Cân chỉnh van tiết lưu và đo dòng khởi động máy nén.",
  },
  {
    id: "plan-ac07-coil-cleaning",
    assetId: "asset-ac-07",
    deviceId: "device-ac-07",
    assetName: "AC-07",
    assetModel: "SkyAir · RZQ125",
    roomId: "room-workspace-02",
    floorId: "demo-floor-2",
    title: "Vệ sinh khử khuẩn dàn lạnh & máng nước ngưng",
    basis: "calendar",
    basisLabel: "Theo lịch định kỳ",
    intervalValue: 180,
    intervalUnit: "days",
    intervalLabel: "180 ngày (6 tháng)",
    nominalCycleLabel: "Chu kỳ 180 ngày",
    nextMilestoneValue: "2026-03-25",
    nextMilestoneLabel: "25/03/2026",
    remainingDays: -17,
    remainingLabel: "Quá hạn 17 ngày",
    dueStatus: "overdue",
    progressStatus: "scheduled",
    assignee: "Đội Dịch vụ Tòa nhà",
    lastCompletedDate: "25/09/2025",
    notes: "Bơm dung dịch khử khuẩn máng ngưng và thông tắc ống xả nước thải.",
  },
];

/**
 * Historical maintenance records for completed works.
 */
export const initialMaintenanceHistory: readonly MaintenanceHistoryRecord[] = [
  {
    id: "maint-hist-01",
    planId: "plan-ac03-filters",
    assetId: "asset-ac-03",
    deviceId: "device-ac-03",
    assetName: "AC-03",
    itemTitle: "Bảo dưỡng định kỳ cấp 1: Vệ sinh lọc bụi & kiểm tra áp suất gas",
    completedAt: "18/04/2026",
    completedAtIso: "2026-04-18",
    performer: "KTV. Nguyễn Văn Hùng · Đội Cơ điện MEP",
    result: "passed",
    resultLabel: "Đạt tiêu chuẩn vận hành",
    notes: "Áp suất gas 1.25 MPa đạt chuẩn; dòng tải máy nén 8.2A ổn định; đã thay 02 màng lọc thô.",
    runtimeHoursAtService: 4374,
  },
  {
    id: "maint-hist-02",
    planId: "plan-ac03-compressor",
    assetId: "asset-ac-03",
    deviceId: "device-ac-03",
    assetName: "AC-03",
    itemTitle: "Kiểm tra bảo dưỡng định kỳ ban đầu",
    completedAt: "15/10/2025",
    completedAtIso: "2025-10-15",
    performer: "Dịch vụ ủy quyền Daikin",
    result: "passed",
    resultLabel: "Đạt nghiệm thu",
    notes: "Vận hành thử nghiệm sau lắp đặt; kiểm tra cách điện cuộn dây motor quạt.",
    runtimeHoursAtService: 3874,
  },
  {
    id: "maint-hist-03",
    planId: "plan-ac07-compressor",
    assetId: "asset-ac-07",
    deviceId: "device-ac-07",
    assetName: "AC-07",
    itemTitle: "Bảo dưỡng máy nén lần 1",
    completedAt: "20/11/2025",
    completedAtIso: "2025-11-20",
    performer: "Dịch vụ ủy quyền Daikin",
    result: "passed",
    resultLabel: "Đạt tiêu chuẩn vận hành",
    notes: "Kiểm tra hệ thống van tiết lưu điện tử và bôi trơn ổ bi quạt.",
    runtimeHoursAtService: 2924,
  },
  {
    id: "maint-hist-04",
    planId: "plan-ac07-coil-cleaning",
    assetId: "asset-ac-07",
    deviceId: "device-ac-07",
    assetName: "AC-07",
    itemTitle: "Vệ sinh dàn lạnh & khử khuẩn đường ống",
    completedAt: "25/09/2025",
    completedAtIso: "2025-09-25",
    performer: "Đội Dịch vụ Tòa nhà",
    result: "passed",
    resultLabel: "Đạt tiêu chuẩn vận hành",
    notes: "Xịt rửa dàn nhôm và khử mùi máng gom nước ngưng.",
    runtimeHoursAtService: 2500,
  },
];

/**
 * Dynamically resolves maintenance plans based on live twin device telemetry.
 * If device simulation reports remaining hours (e.g. 0 during scenario "ac-03-maintenance-due"),
 * the plan dynamically recalculates due status and remaining label.
 */
export function resolveMaintenancePlans(
  plans: readonly MaintenancePlanItem[],
  devices: readonly TwinDevice[],
): MaintenancePlanItem[] {
  return plans.map((plan) => {
    if (plan.basis !== "runtime_hours" || !plan.deviceId) return plan;

    const device = devices.find((d) => d.id === plan.deviceId);
    if (!device || device.maintenanceHoursRemaining === undefined) return plan;

    const rem = device.maintenanceHoursRemaining;
    let dueStatus: MaintenancePlanItem["dueStatus"];
    let remainingLabel: string;

    if (rem <= 0) {
      dueStatus = "due";
      remainingLabel = "Đến hạn · 0 giờ vận hành";
    } else if (rem <= 12) {
      dueStatus = "due-soon";
      remainingLabel = `Còn ${rem} giờ vận hành`;
    } else {
      dueStatus = "normal";
      remainingLabel = `Còn ${rem.toLocaleString("en-US")} giờ vận hành`;
    }

    return {
      ...plan,
      remainingHours: rem,
      dueStatus,
      remainingLabel,
    };
  });
}

export interface AssetMaintenanceRow {
  asset: AssetDigitalIdentity;
  device?: TwinDevice;
  status: AssetMaintenanceStatus;
  statusLabel: string;
  statusTone: "normal" | "warning" | "critical" | "offline";
  runtimeHours: number;
  nextPlan?: MaintenancePlanItem;
  totalPlansCount: number;
  additionalPlansCount: number;
  remainingLabel: string;
  nextMilestoneLabel: string;
}

/**
 * Builds aggregated asset overview rows for Tab 1 (Danh sách tài sản).
 */
export function buildAssetMaintenanceRows(
  assets: readonly AssetDigitalIdentity[],
  plans: readonly MaintenancePlanItem[],
  devices: readonly TwinDevice[],
): AssetMaintenanceRow[] {
  return assets.map((asset) => {
    const device = devices.find((d) => d.id === asset.deviceId);
    const assetPlans = plans.filter((p) => p.assetId === asset.id);

    // Calculate actual runtime hours
    const runtimeHours = device?.maintenanceHoursRemaining === undefined
      ? asset.runtimeHours
      : asset.maintenanceIntervalHours - device.maintenanceHoursRemaining;

    if (!asset.hasMaintenancePlan || assetPlans.length === 0) {
      return {
        asset,
        device,
        status: "unconfigured",
        statusLabel: "Chưa có kế hoạch",
        statusTone: "offline",
        runtimeHours,
        totalPlansCount: 0,
        additionalPlansCount: 0,
        remainingLabel: "Chưa thiết lập kế hoạch",
        nextMilestoneLabel: "—",
      };
    }

    // Determine the most urgent plan
    // Priority: due / overdue > due-soon > normal
    const overduePlan = assetPlans.find((p) => p.dueStatus === "due" || p.dueStatus === "overdue");
    const dueSoonPlan = assetPlans.find((p) => p.dueStatus === "due-soon");
    const nextPlan = overduePlan ?? dueSoonPlan ?? assetPlans[0];

    let status: AssetMaintenanceStatus = "normal";
    let statusLabel = "Đúng lịch";
    let statusTone: "normal" | "warning" | "critical" | "offline" = "normal";

    if (overduePlan || (device?.maintenanceHoursRemaining !== undefined && device.maintenanceHoursRemaining <= 0)) {
      status = "due";
      statusLabel = "Đến hạn bảo trì";
      statusTone = "critical";
    } else if (dueSoonPlan || (device?.maintenanceHoursRemaining !== undefined && device.maintenanceHoursRemaining <= 12)) {
      status = "due-soon";
      statusLabel = "Sắp đến hạn bảo trì";
      statusTone = "warning";
    }

    const nextMilestoneLabel = nextPlan ? nextPlan.nextMilestoneLabel : `${asset.maintenanceIntervalHours.toLocaleString("en-US")} giờ`;
    const remainingLabel = nextPlan ? nextPlan.remainingLabel : "Theo hồ sơ mẫu";

    return {
      asset,
      device,
      status,
      statusLabel,
      statusTone,
      runtimeHours,
      nextPlan,
      totalPlansCount: assetPlans.length,
      additionalPlansCount: Math.max(0, assetPlans.length - 1),
      remainingLabel,
      nextMilestoneLabel,
    };
  });
}

/**
 * Computes top 4 KPI cards for the asset maintenance module.
 */
export function computeMaintenanceKpiSummary(
  assets: readonly AssetDigitalIdentity[],
  plans: readonly MaintenancePlanItem[],
): MaintenanceKpiSummary {
  const assetsInScopeCount = assets.length;
  const dueSoonPlansCount = plans.filter((p) => p.dueStatus === "due-soon").length;
  const overduePlansCount = plans.filter((p) => p.dueStatus === "due" || p.dueStatus === "overdue").length;
  const unconfiguredAssetsCount = assets.filter((a) => !a.hasMaintenancePlan).length;

  return {
    assetsInScopeCount,
    dueSoonPlansCount,
    overduePlansCount,
    unconfiguredAssetsCount,
  };
}
