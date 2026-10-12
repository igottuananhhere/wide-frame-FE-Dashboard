import { useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertOctagon,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  FileQuestion,
  Filter,
  History,
  Layers,
  MapPin,
  Package,
  RotateCcw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ModulePageHeader from "../../components/common/ModulePageHeader";
import TableScrollHint from "../../components/common/TableScrollHint";
import AssetDetailDrawer from "../../components/dashboard/AssetDetailDrawer";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { floor1AssetIdentities } from "../../data/mock/floor1AssetIdentities.mock";
import { floor2AssetIdentities } from "../../data/mock/floor2AssetIdentities.mock";
import type { AssetException } from "../../features/dashboard/types";
import { useAuthStore } from "../../features/auth/authStore";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import { useTwinStore } from "../../features/twin/twinStore";
import {
  buildAssetMaintenanceRows,
  computeMaintenanceKpiSummary,
  initialMaintenanceHistory,
  initialMaintenancePlans,
  resolveMaintenancePlans,
} from "../../features/assets/maintenanceData";
import type {
  AssetDigitalIdentity,
  MaintenanceHistoryRecord,
  MaintenancePlanItem,
} from "../../features/assets/types";

export type AssetTabKey = "assets" | "plans" | "history";

export default function AssetsPage() {
  const scope = useDashboardScopeData();
  const [searchParams, setSearchParams] = useSearchParams();
  const { devices, rooms, floors, alerts, sensors } = scope;
  const events = useTwinStore((state) => state.events);
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const isAdmin = role === "Admin";

  const assetIdParam = searchParams.get("assetId");

  // Tab selection
  const [activeTab, setActiveTab] = useState<AssetTabKey>("assets");

  // Main interactive state
  const [plans, setPlans] = useState<MaintenancePlanItem[]>([...initialMaintenancePlans]);
  const [historyRecords, setHistoryRecords] = useState<MaintenanceHistoryRecord[]>([
    ...initialMaintenanceHistory,
  ]);

  // Drawer state
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<AssetException | null>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);

  // Maintenance Recording Modal (Admin only)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordingPlan, setRecordingPlan] = useState<MaintenancePlanItem | null>(null);
  const [recordPerformer, setRecordPerformer] = useState("");
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [recordResult, setRecordResult] = useState<"passed" | "needs_monitoring" | "failed">("passed");
  const [recordHours, setRecordHours] = useState<number | "">("");
  const [recordNotes, setRecordNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordSuccessToast, setRecordSuccessToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const recordModalTitleId = useId();

  // Tab 1 Filters
  const [assetSearch, setAssetSearch] = useState("");
  const [assetStatusFilter, setAssetStatusFilter] = useState<string>("all");
  const [assetRoomFilter, setAssetRoomFilter] = useState<string>("all");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>("all");

  // Tab 2 Filters
  const [planSearch, setPlanSearch] = useState("");
  const [planAssetFilter, setPlanAssetFilter] = useState<string>(assetIdParam ?? "all");
  const [planDueFilter, setPlanDueFilter] = useState<string>("all");
  const [planBasisFilter, setPlanBasisFilter] = useState<string>("all");

  // Tab 3 Filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyAssetFilter, setHistoryAssetFilter] = useState<string>(assetIdParam ?? "all");
  const [historyResultFilter, setHistoryResultFilter] = useState<string>("all");

  // Room IDs in current scope
  const roomIds = useMemo(() => new Set(rooms.map((r) => r.id)), [rooms]);

  // Assets in current scope
  const allScopedAssets = useMemo(() => {
    return [...floor1AssetIdentities, ...floor2AssetIdentities].filter((asset) =>
      roomIds.has(asset.roomId),
    );
  }, [roomIds]);

  // If assetId is in URL, find selected asset
  const selectedAsset = useMemo(() => {
    return allScopedAssets.find((a) => a.id === assetIdParam);
  }, [allScopedAssets, assetIdParam]);

  // Clear assetId from URL
  const clearAssetFilter = () => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("assetId");
        return next;
      },
      { replace: true },
    );
    setPlanAssetFilter("all");
    setHistoryAssetFilter("all");
  };

  // Dynamically resolved plans in current scope
  const scopedResolvedPlans = useMemo(() => {
    const resolved = resolveMaintenancePlans(plans, devices);
    return resolved.filter((plan) => {
      // Must belong to an asset in the current scope
      return allScopedAssets.some((a) => a.id === plan.assetId);
    });
  }, [plans, devices, allScopedAssets]);

  // 4 Top KPI Metrics across current building/floor scope
  const kpis = useMemo(() => {
    return computeMaintenanceKpiSummary(allScopedAssets, scopedResolvedPlans);
  }, [allScopedAssets, scopedResolvedPlans]);

  // Built asset rows for Tab 1
  const assetRows = useMemo(() => {
    const rawRows = buildAssetMaintenanceRows(allScopedAssets, scopedResolvedPlans, devices);
    return rawRows.filter((row) => {
      // URL parameter filter
      if (assetIdParam && row.asset.id !== assetIdParam) return false;

      // Text search
      if (assetSearch.trim()) {
        const q = assetSearch.toLowerCase();
        const matchCode = row.asset.name.toLowerCase().includes(q);
        const matchId = row.asset.id.toLowerCase().includes(q);
        const matchMfr = row.asset.manufacturer.toLowerCase().includes(q);
        const matchModel = row.asset.model.toLowerCase().includes(q);
        const matchSerial = row.asset.serialNumber.toLowerCase().includes(q);
        if (!matchCode && !matchId && !matchMfr && !matchModel && !matchSerial) return false;
      }

      // Status filter
      if (assetStatusFilter !== "all" && row.status !== assetStatusFilter) {
        return false;
      }

      // Room filter
      if (assetRoomFilter !== "all" && row.asset.roomId !== assetRoomFilter) {
        return false;
      }

      // Category filter
      if (assetCategoryFilter !== "all" && row.asset.category !== assetCategoryFilter) {
        return false;
      }

      return true;
    });
  }, [
    allScopedAssets,
    scopedResolvedPlans,
    devices,
    assetIdParam,
    assetSearch,
    assetStatusFilter,
    assetRoomFilter,
    assetCategoryFilter,
  ]);

  // Filtered plans for Tab 2
  const visiblePlans = useMemo(() => {
    return scopedResolvedPlans.filter((plan) => {
      if (assetIdParam && plan.assetId !== assetIdParam) return false;
      if (planAssetFilter !== "all" && plan.assetId !== planAssetFilter) return false;

      if (planDueFilter !== "all") {
        if (planDueFilter === "due") {
          if (plan.dueStatus !== "due" && plan.dueStatus !== "overdue") return false;
        } else if (plan.dueStatus !== planDueFilter) {
          return false;
        }
      }

      if (planBasisFilter !== "all" && plan.basis !== planBasisFilter) {
        return false;
      }

      if (planSearch.trim()) {
        const q = planSearch.toLowerCase();
        const matchTitle = plan.title.toLowerCase().includes(q);
        const matchAsset = plan.assetName.toLowerCase().includes(q);
        const matchAssignee = plan.assignee.toLowerCase().includes(q);
        if (!matchTitle && !matchAsset && !matchAssignee) return false;
      }

      return true;
    });
  }, [scopedResolvedPlans, assetIdParam, planAssetFilter, planDueFilter, planBasisFilter, planSearch]);

  // Filtered history for Tab 3
  const visibleHistory = useMemo(() => {
    const scopedRecords = historyRecords.filter((rec) =>
      allScopedAssets.some((a) => a.id === rec.assetId),
    );
    return scopedRecords.filter((rec) => {
      if (assetIdParam && rec.assetId !== assetIdParam) return false;
      if (historyAssetFilter !== "all" && rec.assetId !== historyAssetFilter) return false;

      if (historyResultFilter !== "all" && rec.result !== historyResultFilter) {
        return false;
      }

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchTitle = rec.itemTitle.toLowerCase().includes(q);
        const matchAsset = rec.assetName.toLowerCase().includes(q);
        const matchPerformer = rec.performer.toLowerCase().includes(q);
        const matchNotes = rec.notes.toLowerCase().includes(q);
        if (!matchTitle && !matchAsset && !matchPerformer && !matchNotes) return false;
      }

      return true;
    });
  }, [historyRecords, allScopedAssets, assetIdParam, historyAssetFilter, historyResultFilter, historySearch]);

  // Convert AssetDigitalIdentity to AssetException for AssetDetailDrawer
  const openDrawerForAsset = (asset: AssetDigitalIdentity, triggerEl?: HTMLElement | null) => {
    if (triggerEl) drawerTriggerRef.current = triggerEl;
    const device = devices.find((d) => d.id === asset.deviceId);
    const room = rooms.find((r) => r.id === asset.roomId);
    const rem = device?.maintenanceHoursRemaining;
    const isOffline = device?.status === "offline";
    const isCritical = device?.status === "critical";

    let status: "normal" | "warning" | "critical" | "offline";
    if (isOffline) status = "offline";
    else if (isCritical) status = "critical";
    else if (rem !== undefined && rem <= 0) status = "critical";
    else if (rem !== undefined && rem <= 12) status = "warning";
    else status = device?.status ?? "normal";

    const issue = isOffline
      ? "Mất kết nối"
      : rem === 0
        ? "Đến hạn bảo trì"
        : rem !== undefined && rem <= 12
          ? "Sắp đến hạn bảo trì"
          : !asset.hasMaintenancePlan
            ? "Chưa có kế hoạch bảo trì"
            : "Đúng lịch";

    const item: AssetException = {
      id: asset.name,
      deviceId: asset.deviceId,
      assetId: asset.id,
      type: asset.category === "air-conditioner" ? "Điều hòa trung tâm" : "Bộ điều khiển BMS",
      area: room?.name ?? "Khu vực",
      status: (status === "normal" ? "warning" : status) as AssetException["status"],
      issue,
      actionLabel: "Xem hồ sơ tài sản",
    };

    setSelectedDrawerItem(item);
  };

  // Helper to jump to Plans tab with an asset preselected
  const navigateToPlansForAsset = (assetId: string) => {
    setActiveTab("plans");
    setPlanAssetFilter(assetId);
  };

  // Helper to jump to History tab with an asset preselected
  const navigateToHistoryForAsset = (assetId: string) => {
    setActiveTab("history");
    setHistoryAssetFilter(assetId);
  };

  // Handler for Opening Maintenance Record Modal
  const handleOpenRecordModal = (plan: MaintenancePlanItem, triggerEl?: HTMLElement | null) => {
    if (!isAdmin) return;
    if (triggerEl) drawerTriggerRef.current = triggerEl;
    setRecordingPlan(plan);
    setRecordPerformer(user?.displayName ?? "KTV. Quản trị MEP");
    setRecordDate(new Date().toISOString().split("T")[0]);
    setRecordResult("passed");
    setRecordHours(typeof plan.nextMilestoneValue === "number" ? plan.nextMilestoneValue : 4874);
    setRecordNotes("");
    setFormError(null);
    setIsRecordModalOpen(true);
  };

  // Handle Maintenance Record Submission
  const handleSubmitMaintenanceRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !recordingPlan) return;

    if (!recordDate) {
      setFormError("Vui lòng chọn ngày thực tế thực hiện.");
      return;
    }
    if (!recordPerformer.trim() || recordPerformer.trim().length < 3) {
      setFormError("Vui lòng nhập tên người hoặc đơn vị thực hiện.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    setTimeout(() => {
      const newRecordId = `maint-rec-${Date.now()}`;
      const completedFormatted = new Intl.DateTimeFormat("vi-VN").format(new Date(recordDate));

      const newRecord: MaintenanceHistoryRecord = {
        id: newRecordId,
        planId: recordingPlan.id,
        assetId: recordingPlan.assetId,
        deviceId: recordingPlan.deviceId,
        assetName: recordingPlan.assetName,
        itemTitle: recordingPlan.title,
        completedAt: completedFormatted,
        completedAtIso: recordDate,
        performer: recordPerformer.trim(),
        result: recordResult,
        resultLabel:
          recordResult === "passed"
            ? "Đạt tiêu chuẩn vận hành"
            : recordResult === "needs_monitoring"
              ? "Cần theo dõi thêm"
              : "Chưa đạt yêu cầu",
        notes:
          recordNotes.trim() ||
          `Đã hoàn thành bảo trì định kỳ cho hạng mục ${recordingPlan.title}. Tình trạng sau bảo dưỡng ổn định.`,
        runtimeHoursAtService: typeof recordHours === "number" ? recordHours : undefined,
      };

      // 1. Append to history records
      setHistoryRecords((prev) => [newRecord, ...prev]);

      // 2. Update the maintenance plan's next milestone & remaining hours
      setPlans((prev) =>
        prev.map((p) => {
          if (p.id !== recordingPlan.id) return p;

          if (p.basis === "runtime_hours") {
            const nextMilestone =
              typeof p.nextMilestoneValue === "number"
                ? p.nextMilestoneValue + p.intervalValue
                : 5374;
            return {
              ...p,
              nextMilestoneValue: nextMilestone,
              nextMilestoneLabel: `${nextMilestone.toLocaleString("en-US")} giờ`,
              remainingHours: p.intervalValue,
              remainingLabel: `Còn ${p.intervalValue.toLocaleString("en-US")} giờ vận hành`,
              dueStatus: "normal" as const,
              progressStatus: "scheduled" as const,
              lastCompletedDate: completedFormatted,
            };
          } else {
            return {
              ...p,
              dueStatus: "normal" as const,
              remainingLabel: `Còn ${p.intervalValue} ngày`,
              progressStatus: "scheduled" as const,
              lastCompletedDate: completedFormatted,
            };
          }
        }),
      );

      // 3. Update twin store device state to reset simulated maintenance
      if (recordingPlan.deviceId) {
        useTwinStore.setState((state) => ({
          devices: state.devices.map((d) =>
            d.id === recordingPlan.deviceId
              ? {
                  ...d,
                  maintenanceHoursRemaining: recordingPlan.intervalValue,
                  status: d.status === "warning" ? "normal" : d.status,
                }
              : d,
          ),
        }));
      }

      setIsSubmitting(false);
      setIsRecordModalOpen(false);
      setRecordSuccessToast(
        `Đã ghi nhận bảo trì thành công cho ${recordingPlan.assetName} · ${recordingPlan.title}. Phiên Digital Twin đã được cập nhật mốc kế tiếp.`,
      );

      setTimeout(() => setRecordSuccessToast(null), 6000);
    }, 450);
  };

  return (
    <section className="dashboard-page detail-module-page" aria-labelledby="module-page-title">
      <ModulePageHeader
        section="OPERATION / ASSETS & MAINTENANCE"
        title={`Tài sản & bảo trì · ${scope.scopeLabel}`}
        description={`Quản lý danh mục tài sản, kế hoạch bảo dưỡng định kỳ và lịch sử thực hiện trong phạm vi ${scope.scopeLabel}.`}
        scopeLabel={scope.scopeLabel}
      />

      {/* Scope, CMMS notice, and Mock data disclosure */}
      <div className="asset-module-meta-bar" role="note" aria-label="Thông tin nguồn dữ liệu bảo trì">
        <div className="asset-meta-tags">
          <span className="detail-panel-tag">DỮ LIỆU MẪU MÔ PHỎNG</span>
          <span className="asset-meta-scope">
            Phạm vi: <strong>{scope.scopeLabel}</strong> · Cập nhật theo telemetry tầng có cấu hình
          </span>
        </div>
        <p className="asset-meta-cmms-note">
          Chưa kết nối API hệ thống CMMS/ERP hai chiều. Mọi tương tác ghi nhận được lưu trữ trong phiên làm việc của Digital Twin.
        </p>
      </div>

      {/* Filter Context Bar when assetId is in URL */}
      {assetIdParam && (
        <div
          className="asset-filter-context"
          role="status"
          aria-label={selectedAsset ? `Asset profile ${selectedAsset.name}` : `Asset not found: ${assetIdParam}`}
        >
          {selectedAsset ? (
            <>
              <span>Đang xem hồ sơ bảo trì</span>
              <strong>{selectedAsset.name}</strong>
              <span>
                {rooms.find((room) => room.id === selectedAsset.roomId)?.name ?? scope.scopeLabel}
              </span>
            </>
          ) : (
            <span>Không tìm thấy hồ sơ tài sản {assetIdParam} trong phạm vi {scope.scopeLabel}.</span>
          )}
          <button type="button" onClick={clearAssetFilter}>
            Hiện tất cả tài sản
          </button>
        </div>
      )}

      {/* Toast confirmation */}
      {recordSuccessToast && (
        <div className="asset-toast-banner" role="status" aria-live="polite">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{recordSuccessToast}</span>
          <button
            type="button"
            className="asset-toast-close"
            onClick={() => setRecordSuccessToast(null)}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 4 Clickable KPI Summary Cards */}
      <section className="asset-kpi-section" aria-label="Chỉ số tổng hợp bảo trì tài sản">
        <div className="asset-kpi-grid">
          {/* KPI A: Assets in scope */}
          <button
            type="button"
            className={`asset-kpi-card ${activeTab === "assets" && assetStatusFilter === "all" ? "asset-kpi-card--active" : ""}`}
            onClick={() => {
              setActiveTab("assets");
              setAssetStatusFilter("all");
            }}
            aria-label={`Tài sản trong phạm vi: ${kpis.assetsInScopeCount} tài sản. Bấm để xem danh sách tài sản.`}
          >
            <div className="asset-kpi-top">
              <span className="asset-kpi-label">Tài sản trong phạm vi</span>
              <Package size={17} className="asset-kpi-icon asset-kpi-icon--teal" aria-hidden="true" />
            </div>
            <div className="asset-kpi-value">{kpis.assetsInScopeCount}</div>
            <div className="asset-kpi-subtext">Tài sản vật lý có hồ sơ định danh</div>
          </button>

          {/* KPI B: Due-soon items */}
          <button
            type="button"
            className={`asset-kpi-card ${activeTab === "plans" && planDueFilter === "due-soon" ? "asset-kpi-card--active" : ""}`}
            onClick={() => {
              setActiveTab("plans");
              setPlanDueFilter("due-soon");
            }}
            aria-label={`Hạng mục sắp đến hạn: ${kpis.dueSoonPlansCount} hạng mục. Bấm để xem kế hoạch sắp đến hạn.`}
          >
            <div className="asset-kpi-top">
              <span className="asset-kpi-label">Hạng mục sắp đến hạn</span>
              <Clock size={17} className="asset-kpi-icon asset-kpi-icon--amber" aria-hidden="true" />
            </div>
            <div className="asset-kpi-value asset-kpi-value--warning">{kpis.dueSoonPlansCount}</div>
            <div className="asset-kpi-subtext">Cần chuẩn bị vật tư & ca trực</div>
          </button>

          {/* KPI C: Overdue / Due items */}
          <button
            type="button"
            className={`asset-kpi-card ${activeTab === "plans" && planDueFilter === "due" ? "asset-kpi-card--active" : ""}`}
            onClick={() => {
              setActiveTab("plans");
              setPlanDueFilter("due");
            }}
            aria-label={`Hạng mục quá hạn: ${kpis.overduePlansCount} hạng mục. Bấm để xem kế hoạch quá hạn.`}
          >
            <div className="asset-kpi-top">
              <span className="asset-kpi-label">Hạng mục quá hạn</span>
              <AlertOctagon size={17} className="asset-kpi-icon asset-kpi-icon--red" aria-hidden="true" />
            </div>
            <div className="asset-kpi-value asset-kpi-value--critical">{kpis.overduePlansCount}</div>
            <div className="asset-kpi-subtext">Vượt mốc giờ hoặc lịch quy định</div>
          </button>

          {/* KPI D: Assets without plan */}
          <button
            type="button"
            className={`asset-kpi-card ${activeTab === "assets" && assetStatusFilter === "unconfigured" ? "asset-kpi-card--active" : ""}`}
            onClick={() => {
              setActiveTab("assets");
              setAssetStatusFilter("unconfigured");
            }}
            aria-label={`Tài sản chưa có kế hoạch: ${kpis.unconfiguredAssetsCount} tài sản. Bấm để lọc tài sản cần thiết lập kế hoạch.`}
          >
            <div className="asset-kpi-top">
              <span className="asset-kpi-label">Tài sản chưa có kế hoạch</span>
              <FileQuestion size={17} className="asset-kpi-icon asset-kpi-icon--muted" aria-hidden="true" />
            </div>
            <div className="asset-kpi-value asset-kpi-value--muted">{kpis.unconfiguredAssetsCount}</div>
            <div className="asset-kpi-subtext">Cần cấu hình chu kỳ bảo dưỡng</div>
          </button>
        </div>
      </section>

      {/* Main Tabs Navigation */}
      <section className="asset-main-management-card" aria-label="Khu vực quản lý bảo trì tài sản">
        <header className="asset-tabs-header">
          <div className="asset-tabs-nav" role="tablist" aria-label="Phân nhóm quản lý bảo trì">
            <button
              type="button"
              role="tab"
              id="tab-assets-btn"
              aria-selected={activeTab === "assets"}
              aria-controls="tab-assets-panel"
              className={`asset-tab-btn ${activeTab === "assets" ? "asset-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("assets")}
            >
              <Package size={15} aria-hidden="true" />
              <span>Tài sản</span>
              <span className="asset-tab-badge">{allScopedAssets.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-plans-btn"
              aria-selected={activeTab === "plans"}
              aria-controls="tab-plans-panel"
              className={`asset-tab-btn ${activeTab === "plans" ? "asset-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("plans")}
            >
              <Layers size={15} aria-hidden="true" />
              <span>Kế hoạch bảo trì</span>
              <span className="asset-tab-badge">{scopedResolvedPlans.length}</span>
              {kpis.dueSoonPlansCount + kpis.overduePlansCount > 0 && (
                <span className="asset-tab-alert-dot" title="Có hạng mục cần xử lý" />
              )}
            </button>

            <button
              type="button"
              role="tab"
              id="tab-history-btn"
              aria-selected={activeTab === "history"}
              aria-controls="tab-history-panel"
              className={`asset-tab-btn ${activeTab === "history" ? "asset-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <History size={15} aria-hidden="true" />
              <span>Lịch sử bảo trì</span>
              <span className="asset-tab-badge">
                {
                  historyRecords.filter((rec) => allScopedAssets.some((a) => a.id === rec.assetId))
                    .length
                }
              </span>
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* TAB 1: DANH SÁCH TÀI SẢN */}
        {/* ========================================================= */}
        {activeTab === "assets" && (
          <div
            id="tab-assets-panel"
            role="tabpanel"
            aria-labelledby="tab-assets-btn"
            className="asset-tab-panel"
          >
            {/* Toolbar Filters for Assets Tab */}
            <div className="asset-toolbar" role="search" aria-label="Bộ lọc danh sách tài sản">
              <div className="asset-toolbar-search">
                <Search size={14} className="asset-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Tìm theo mã (AC-03), tên, model, serial..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="asset-search-input"
                  aria-label="Tìm kiếm tài sản"
                />
                {assetSearch && (
                  <button
                    type="button"
                    onClick={() => setAssetSearch("")}
                    className="asset-search-clear"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="asset-toolbar-selects">
                <div className="asset-select-wrapper">
                  <Filter size={13} className="asset-select-icon" aria-hidden="true" />
                  <select
                    value={assetStatusFilter}
                    onChange={(e) => setAssetStatusFilter(e.target.value)}
                    className="asset-filter-select"
                    aria-label="Lọc theo tình trạng bảo trì"
                  >
                    <option value="all">Tất cả tình trạng</option>
                    <option value="normal">Đúng lịch</option>
                    <option value="due-soon">Sắp đến hạn</option>
                    <option value="due">Đến hạn / Quá hạn</option>
                    <option value="unconfigured">Chưa có kế hoạch</option>
                  </select>
                </div>

                <div className="asset-select-wrapper">
                  <MapPin size={13} className="asset-select-icon" aria-hidden="true" />
                  <select
                    value={assetRoomFilter}
                    onChange={(e) => setAssetRoomFilter(e.target.value)}
                    className="asset-filter-select"
                    aria-label="Lọc theo phòng / khu vực"
                  >
                    <option value="all">Tất cả khu vực</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="asset-select-wrapper">
                  <Cpu size={13} className="asset-select-icon" aria-hidden="true" />
                  <select
                    value={assetCategoryFilter}
                    onChange={(e) => setAssetCategoryFilter(e.target.value)}
                    className="asset-filter-select"
                    aria-label="Lọc theo loại thiết bị"
                  >
                    <option value="all">Tất cả loại thiết bị</option>
                    <option value="air-conditioner">Điều hòa trung tâm (HVAC)</option>
                    <option value="controller">Bộ điều khiển kỹ thuật (BMS)</option>
                  </select>
                </div>

                {(assetSearch || assetStatusFilter !== "all" || assetRoomFilter !== "all" || assetCategoryFilter !== "all") && (
                  <button
                    type="button"
                    className="asset-filter-reset-btn"
                    onClick={() => {
                      setAssetSearch("");
                      setAssetStatusFilter("all");
                      setAssetRoomFilter("all");
                      setAssetCategoryFilter("all");
                    }}
                  >
                    <RotateCcw size={12} aria-hidden="true" />
                    <span>Đặt lại lọc</span>
                  </button>
                )}
              </div>
            </div>

            {/* Asset Directory Table */}
            <div
              className="asset-table-scroll"
              role="region"
              aria-label="Bảng danh mục tài sản; cuộn ngang để xem tất cả các cột"
              tabIndex={0}
            >
              <table className="asset-management-table" aria-label="Danh sách tài sản">
                <thead>
                  <tr>
                    <th scope="col">Tài sản</th>
                    <th scope="col">Vị trí & Quan hệ BMS</th>
                    <th scope="col">Tình trạng bảo trì</th>
                    <th scope="col">Hạng mục kế tiếp</th>
                    <th scope="col">Mốc đến hạn / Phần còn lại</th>
                    <th scope="col" className="asset-col-actions">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assetRows.map((row) => {
                    const room = rooms.find((r) => r.id === row.asset.roomId);
                    const floor = floors.find((f) => f.id === room?.floorId);
                    const floorLabel = floor?.name ?? scope.scopeLabel;
                    return (
                      <tr key={row.asset.id}>
                        {/* Asset Column */}
                        <th scope="row" className="asset-row-header-cell">
                          <div className="asset-cell-title">
                            <h3 className="asset-row-name">{row.asset.name}</h3>
                            <span className="asset-id">{row.asset.id}</span>
                          </div>
                          <div className="asset-cell-sub">
                            <span>
                              <span className="asset-manufacturer">{row.asset.manufacturer}</span> · {row.asset.model}
                            </span>
                            <span className="asset-serial-tag">S/N: {row.asset.serialNumber}</span>
                          </div>
                        </th>

                        {/* Location & BMS Topology Column */}
                        <td>
                          <div className="asset-location-cell">
                            <strong>{room?.name ?? "—"}</strong>
                            <span className="asset-floor-tag">{floorLabel}</span>
                          </div>
                          <div className="asset-relationship-hint" title="Chuỗi topo liên kết từ khu vực tới thiết bị BMS">
                            <span>{room?.name ?? scope.scopeLabel}</span>
                            <ArrowRight size={10} aria-hidden="true" />
                            <span>{row.asset.name}</span>
                            <ArrowRight size={10} aria-hidden="true" />
                            <span>{row.device?.name ?? row.asset.deviceId}</span>
                          </div>
                        </td>

                        {/* Maintenance Status Column */}
                        <td>
                          <StatusBadge status={row.statusTone} label={row.statusLabel} />
                        </td>

                        {/* Next Item Column */}
                        <td>
                          <div className="asset-next-plan-cell">
                            {row.nextPlan ? (
                              <>
                                <strong className="asset-next-plan-title">{row.nextPlan.title}</strong>
                                <span className="asset-plan-basis">
                                  {row.nextPlan.basisLabel} · {row.nextPlan.nominalCycleLabel}
                                </span>
                                {row.additionalPlansCount > 0 && (
                                  <button
                                    type="button"
                                    className="asset-additional-plans-btn"
                                    onClick={() => navigateToPlansForAsset(row.asset.id)}
                                    title={`Xem toàn bộ ${row.totalPlansCount} hạng mục bảo trì của ${row.asset.name}`}
                                  >
                                    +{row.additionalPlansCount} hạng mục khác ↗
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="asset-unconfigured-note">Chưa cấu hình kế hoạch</span>
                            )}
                          </div>
                        </td>

                        {/* Milestone & Remaining Column */}
                        <td>
                          <div className="asset-milestone-cell">
                            <div className="asset-milestone-row">
                              <span className="asset-milestone-label">Mốc kế tiếp:</span>
                              <strong>{row.nextMilestoneLabel}</strong>
                            </div>
                            <div className="asset-remaining-tag-row">
                              <span
                                className={`asset-remaining-tag asset-remaining-tag--${row.status}`}
                              >
                                {row.remainingLabel}
                              </span>
                            </div>
                            <span className="asset-runtime-subtext">
                              Giờ vận hành tích lũy: {row.runtimeHours.toLocaleString("en-US")} giờ
                            </span>
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="asset-col-actions">
                          <div className="asset-action-btn-group">
                            <button
                              type="button"
                              className="asset-action-btn asset-action-btn--primary"
                              onClick={(e) => openDrawerForAsset(row.asset, e.currentTarget)}
                              aria-label={`Xem chi tiết hồ sơ tài sản: ${row.asset.name}`}
                            >
                              Xem chi tiết
                              <ArrowUpRight size={13} aria-hidden="true" />
                            </button>

                            {row.asset.hasMaintenancePlan && (
                              <button
                                type="button"
                                className="asset-action-btn asset-action-btn--secondary"
                                onClick={() => navigateToPlansForAsset(row.asset.id)}
                                aria-label={`Xem kế hoạch bảo trì của: ${row.asset.name}`}
                              >
                                Xem kế hoạch
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {assetRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="detail-empty-cell">
                        {assetIdParam
                          ? `Không tìm thấy hồ sơ tài sản ${assetIdParam} trong phạm vi ${scope.scopeLabel}.`
                          : "Không có tài sản nào phù hợp với bộ lọc đã chọn."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <TableScrollHint />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: KẾ HOẠCH BẢO TRÌ */}
        {/* ========================================================= */}
        {activeTab === "plans" && (
          <div
            id="tab-plans-panel"
            role="tabpanel"
            aria-labelledby="tab-plans-btn"
            className="asset-tab-panel"
          >
            {/* Toolbar Filters for Plans Tab */}
            <div className="asset-toolbar" role="search" aria-label="Bộ lọc kế hoạch bảo trì">
              <div className="asset-toolbar-search">
                <Search size={14} className="asset-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Tìm theo hạng mục, đơn vị phụ trách, mã tài sản..."
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                  className="asset-search-input"
                  aria-label="Tìm kiếm kế hoạch bảo trì"
                />
                {planSearch && (
                  <button
                    type="button"
                    onClick={() => setPlanSearch("")}
                    className="asset-search-clear"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="asset-toolbar-selects">
                <div className="asset-select-wrapper">
                  <Package size={13} className="asset-select-icon" aria-hidden="true" />
                  <select
                    value={planAssetFilter}
                    onChange={(e) => setPlanAssetFilter(e.target.value)}
                    className="asset-filter-select"
                    aria-label="Lọc theo tài sản"
                  >
                    <option value="all">Tất cả tài sản ({allScopedAssets.length})</option>
                    {allScopedAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} · {asset.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="asset-select-wrapper">
                  <Filter size={13} className="asset-select-icon" aria-hidden="true" />
                  <select
                    value={planDueFilter}
                    onChange={(e) => setPlanDueFilter(e.target.value)}
                    className="asset-filter-select"
                    aria-label="Lọc theo tình trạng đến hạn"
                  >
                    <option value="all">Tất cả tình trạng đến hạn</option>
                    <option value="normal">Đúng lịch</option>
                    <option value="due-soon">Sắp đến hạn</option>
                    <option value="due">Đến hạn / Quá hạn</option>
                  </select>
                </div>

                <div className="asset-select-wrapper">
                  <Layers size={13} className="asset-select-icon" aria-hidden="true" />
                  <select
                    value={planBasisFilter}
                    onChange={(e) => setPlanBasisFilter(e.target.value)}
                    className="asset-filter-select"
                    aria-label="Lọc theo căn cứ bảo trì"
                  >
                    <option value="all">Tất cả căn cứ</option>
                    <option value="runtime_hours">Theo giờ vận hành</option>
                    <option value="calendar">Theo lịch định kỳ</option>
                  </select>
                </div>

                {(planSearch || planAssetFilter !== "all" || planDueFilter !== "all" || planBasisFilter !== "all") && (
                  <button
                    type="button"
                    className="asset-filter-reset-btn"
                    onClick={() => {
                      setPlanSearch("");
                      setPlanAssetFilter("all");
                      setPlanDueFilter("all");
                      setPlanBasisFilter("all");
                    }}
                  >
                    <RotateCcw size={12} aria-hidden="true" />
                    <span>Đặt lại lọc</span>
                  </button>
                )}
              </div>
            </div>

            {/* Plans Table */}
            <div
              className="asset-table-scroll"
              role="region"
              aria-label="Bảng kế hoạch bảo trì; cuộn ngang để xem tất cả các cột"
              tabIndex={0}
            >
              <table className="asset-management-table" aria-label="Kế hoạch bảo trì">
                <thead>
                  <tr>
                    <th scope="col">Tài sản</th>
                    <th scope="col">Hạng mục bảo trì</th>
                    <th scope="col">Căn cứ & Chu kỳ</th>
                    <th scope="col">Mốc kế tiếp</th>
                    <th scope="col">Phần còn lại / Quá hạn</th>
                    <th scope="col">Tình trạng đến hạn</th>
                    <th scope="col">Tiến độ thực hiện</th>
                    <th scope="col">Đơn vị phụ trách</th>
                    <th scope="col" className="asset-col-actions">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePlans.map((plan) => {
                    const asset = allScopedAssets.find((a) => a.id === plan.assetId);
                    const dueTone =
                      plan.dueStatus === "due" || plan.dueStatus === "overdue"
                        ? "critical"
                        : plan.dueStatus === "due-soon"
                          ? "warning"
                          : "normal";
                    const dueLabel =
                      plan.dueStatus === "due"
                        ? "Đến hạn"
                        : plan.dueStatus === "overdue"
                          ? "Quá hạn"
                          : plan.dueStatus === "due-soon"
                            ? "Sắp đến hạn"
                            : "Đúng lịch";

                    const progressLabel =
                      plan.progressStatus === "in_progress"
                        ? "Đang thực hiện"
                        : plan.progressStatus === "completed"
                          ? "Hoàn thành"
                          : "Đã lên lịch";

                    return (
                      <tr key={plan.id}>
                        {/* Asset Column */}
                        <th scope="row" className="asset-row-header-cell">
                          <div className="asset-cell-title">
                            <span className="asset-row-name-inline">{plan.assetName}</span>
                            <span className="asset-id">{plan.assetId}</span>
                          </div>
                          <span className="asset-cell-subtext">{plan.assetModel}</span>
                        </th>

                        {/* Title & Notes */}
                        <td>
                          <div className="plan-title-cell">
                            <strong>{plan.title}</strong>
                            <span className="plan-id-tag">{plan.id}</span>
                            {plan.notes && <p className="plan-notes-text">{plan.notes}</p>}
                          </div>
                        </td>

                        {/* Basis & Cycle */}
                        <td>
                          <div className="plan-basis-cell">
                            <span className="plan-basis-badge">{plan.basisLabel}</span>
                            <strong>{plan.nominalCycleLabel}</strong>
                          </div>
                        </td>

                        {/* Next Milestone */}
                        <td>
                          <div className="plan-milestone-cell">
                            <strong>{plan.nextMilestoneLabel}</strong>
                            {plan.lastCompletedDate && (
                              <span className="plan-last-date">
                                Gần nhất: {plan.lastCompletedDate}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Remaining / Overdue */}
                        <td>
                          <span className={`asset-remaining-tag asset-remaining-tag--${plan.dueStatus}`}>
                            {plan.remainingLabel}
                          </span>
                        </td>

                        {/* Due Status */}
                        <td>
                          <StatusBadge status={dueTone} label={dueLabel} />
                        </td>

                        {/* Progress Status */}
                        <td>
                          <span className={`plan-progress-pill plan-progress-pill--${plan.progressStatus}`}>
                            {progressLabel}
                          </span>
                        </td>

                        {/* Assignee */}
                        <td>
                          <span className="plan-assignee-text">{plan.assignee}</span>
                        </td>

                        {/* Actions */}
                        <td className="asset-col-actions">
                          <div className="asset-action-btn-group">
                            {asset && (
                              <button
                                type="button"
                                className="asset-action-btn asset-action-btn--secondary"
                                onClick={(e) => openDrawerForAsset(asset, e.currentTarget)}
                                aria-label={`Xem chi tiết hồ sơ tài sản: ${plan.assetName}`}
                              >
                                Chi tiết
                              </button>
                            )}

                            <button
                              type="button"
                              className="asset-action-btn asset-action-btn--secondary"
                              onClick={() => navigateToHistoryForAsset(plan.assetId)}
                              aria-label={`Xem lịch sử bảo trì của: ${plan.assetName}`}
                            >
                              Lịch sử
                            </button>

                            {/* Record maintenance button is strictly rendered for Admin only */}
                            {isAdmin && (
                              <button
                                type="button"
                                className="asset-action-btn asset-action-btn--record"
                                onClick={(e) => handleOpenRecordModal(plan, e.currentTarget)}
                                aria-label={`Ghi nhận bảo trì cho hạng mục: ${plan.title}`}
                              >
                                <Wrench size={12} aria-hidden="true" />
                                <span>Ghi nhận bảo trì</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visiblePlans.length === 0 && (
                    <tr>
                      <td colSpan={9} className="detail-empty-cell">
                        Không có kế hoạch bảo trì nào phù hợp với bộ lọc đã chọn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <TableScrollHint />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: LỊCH SỬ BẢO TRÌ */}
        {/* ========================================================= */}
        {activeTab === "history" && (
          <div
            id="tab-history-panel"
            role="tabpanel"
            aria-labelledby="tab-history-btn"
            className="asset-tab-panel"
          >
            {/* Toolbar Filters for History Tab */}
            <div className="asset-toolbar" role="search" aria-label="Bộ lọc lịch sử bảo trì">
              <div className="asset-toolbar-search">
                <Search size={14} className="asset-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Tìm theo hạng mục, kỹ thuật viên, mã tài sản, ghi chú..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="asset-search-input"
                  aria-label="Tìm kiếm biên bản bảo trì"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch("")}
                    className="asset-search-clear"
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="asset-toolbar-selects">
                <div className="asset-select-wrapper">
                  <Package size={13} className="asset-select-icon" aria-hidden="true" />
                  <select
                    value={historyAssetFilter}
                    onChange={(e) => setHistoryAssetFilter(e.target.value)}
                    className="asset-filter-select"
                    aria-label="Lọc theo tài sản"
                  >
                    <option value="all">Tất cả tài sản</option>
                    {allScopedAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} · {asset.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="asset-select-wrapper">
                  <Filter size={13} className="asset-select-icon" aria-hidden="true" />
                  <select
                    value={historyResultFilter}
                    onChange={(e) => setHistoryResultFilter(e.target.value)}
                    className="asset-filter-select"
                    aria-label="Lọc theo kết quả nghiệm thu"
                  >
                    <option value="all">Tất cả kết quả</option>
                    <option value="passed">Đạt tiêu chuẩn vận hành</option>
                    <option value="needs_monitoring">Cần theo dõi thêm</option>
                    <option value="failed">Chưa đạt yêu cầu</option>
                  </select>
                </div>

                {(historySearch || historyAssetFilter !== "all" || historyResultFilter !== "all") && (
                  <button
                    type="button"
                    className="asset-filter-reset-btn"
                    onClick={() => {
                      setHistorySearch("");
                      setHistoryAssetFilter("all");
                      setHistoryResultFilter("all");
                    }}
                  >
                    <RotateCcw size={12} aria-hidden="true" />
                    <span>Đặt lại lọc</span>
                  </button>
                )}
              </div>
            </div>

            {/* History Table */}
            <div
              className="asset-table-scroll"
              role="region"
              aria-label="Bảng lịch sử bảo trì; cuộn ngang để xem tất cả các cột"
              tabIndex={0}
            >
              <table className="asset-management-table" aria-label="Lịch sử bảo trì">
                <thead>
                  <tr>
                    <th scope="col">Tài sản & Hạng mục</th>
                    <th scope="col">Thời điểm thực hiện</th>
                    <th scope="col">Người / Đơn vị thực hiện</th>
                    <th scope="col">Mốc giờ vận hành</th>
                    <th scope="col">Kết quả nghiệm thu</th>
                    <th scope="col">Ghi chú kỹ thuật & Vật tư</th>
                    <th scope="col" className="asset-col-actions">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleHistory.map((rec) => {
                    const asset = allScopedAssets.find((a) => a.id === rec.assetId);
                    const resultTone =
                      rec.result === "passed"
                        ? "normal"
                        : rec.result === "needs_monitoring"
                          ? "warning"
                          : "critical";

                    return (
                      <tr key={rec.id}>
                        {/* Asset & Item Title */}
                        <th scope="row" className="asset-row-header-cell">
                          <div className="asset-cell-title">
                            <span className="asset-row-name-inline">{rec.assetName}</span>
                            <span className="asset-id">{rec.assetId}</span>
                          </div>
                          <strong className="history-item-title">{rec.itemTitle}</strong>
                          <span className="record-id-tag">MÃ BIÊN BẢN: {rec.id}</span>
                        </th>

                        {/* Completed Date */}
                        <td>
                          <div className="history-date-cell">
                            <Calendar size={13} aria-hidden="true" />
                            <time dateTime={rec.completedAtIso ?? rec.completedAt}>
                              {rec.completedAt}
                            </time>
                          </div>
                        </td>

                        {/* Performer */}
                        <td>
                          <span className="history-performer-text">{rec.performer}</span>
                        </td>

                        {/* Runtime Hours at Service */}
                        <td>
                          {rec.runtimeHoursAtService !== undefined ? (
                            <span className="history-hours-text">
                              {rec.runtimeHoursAtService.toLocaleString("en-US")} giờ
                            </span>
                          ) : (
                            <span className="asset-muted-dash">—</span>
                          )}
                        </td>

                        {/* Evaluation Result */}
                        <td>
                          <StatusBadge status={resultTone} label={rec.resultLabel} />
                        </td>

                        {/* Technical Notes & Replaced Parts */}
                        <td>
                          <p className="history-notes-text">{rec.notes}</p>
                        </td>

                        {/* Actions */}
                        <td className="asset-col-actions">
                          {asset && (
                            <button
                              type="button"
                              className="asset-action-btn asset-action-btn--secondary"
                              onClick={(e) => openDrawerForAsset(asset, e.currentTarget)}
                              aria-label={`Xem hồ sơ chi tiết tài sản: ${rec.assetName}`}
                            >
                              Xem hồ sơ
                              <ArrowUpRight size={13} aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {visibleHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="detail-empty-cell">
                        Chưa có biên bản ghi nhận bảo trì nào phù hợp với bộ lọc đã chọn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <TableScrollHint />
            </div>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* MAINTENANCE RECORDING MODAL (ADMIN ONLY) */}
      {/* ========================================================= */}
      {isAdmin && isRecordModalOpen && recordingPlan && (
        <div
          className="record-modal-backdrop"
          role="presentation"
          onClick={() => !isSubmitting && setIsRecordModalOpen(false)}
        >
          <div
            className="record-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={recordModalTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="record-modal-header">
              <div>
                <span className="section-eyebrow">QUY TRÌNH BẢO TRÌ MEP</span>
                <h3 id={recordModalTitleId}>Ghi nhận thực hiện bảo trì</h3>
                <p className="record-modal-subtitle">
                  {recordingPlan.assetName} · {recordingPlan.title}
                </p>
              </div>
              <button
                type="button"
                className="record-modal-close"
                onClick={() => !isSubmitting && setIsRecordModalOpen(false)}
                aria-label="Đóng biểu mẫu"
                disabled={isSubmitting}
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSubmitMaintenanceRecord} className="record-modal-form">
              {formError && (
                <div className="record-modal-error" role="alert">
                  <AlertCircle size={15} aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="record-form-grid">
                <div className="record-form-field">
                  <label htmlFor="field-asset-name">Tài sản & Mã hồ sơ</label>
                  <input
                    id="field-asset-name"
                    type="text"
                    value={`${recordingPlan.assetName} (${recordingPlan.assetId})`}
                    disabled
                    className="record-input record-input--disabled"
                  />
                </div>

                <div className="record-form-field">
                  <label htmlFor="field-plan-title">Hạng mục công việc</label>
                  <input
                    id="field-plan-title"
                    type="text"
                    value={recordingPlan.title}
                    disabled
                    className="record-input record-input--disabled"
                  />
                </div>

                <div className="record-form-field">
                  <label htmlFor="field-record-date">
                    Ngày thực tế thực hiện <span className="field-required">*</span>
                  </label>
                  <input
                    id="field-record-date"
                    type="date"
                    required
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="record-input"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="record-form-field">
                  <label htmlFor="field-record-performer">
                    Kỹ thuật viên / Đơn vị thực hiện <span className="field-required">*</span>
                  </label>
                  <input
                    id="field-record-performer"
                    type="text"
                    required
                    placeholder="Ví dụ: KTV. Nguyễn Văn Hùng · Đội Cơ điện MEP"
                    value={recordPerformer}
                    onChange={(e) => setRecordPerformer(e.target.value)}
                    className="record-input"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="record-form-field">
                  <label htmlFor="field-record-result">
                    Kết quả nghiệm thu <span className="field-required">*</span>
                  </label>
                  <select
                    id="field-record-result"
                    value={recordResult}
                    onChange={(e) =>
                      setRecordResult(
                        e.target.value as "passed" | "needs_monitoring" | "failed",
                      )
                    }
                    className="record-select"
                    disabled={isSubmitting}
                  >
                    <option value="passed">Đạt tiêu chuẩn vận hành</option>
                    <option value="needs_monitoring">Cần theo dõi thêm</option>
                    <option value="failed">Chưa đạt yêu cầu</option>
                  </select>
                </div>

                <div className="record-form-field">
                  <label htmlFor="field-record-hours">
                    Giờ vận hành máy nén tại thời điểm bảo trì (giờ)
                  </label>
                  <input
                    id="field-record-hours"
                    type="number"
                    placeholder="Ví dụ: 4874"
                    value={recordHours}
                    onChange={(e) =>
                      setRecordHours(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="record-input"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="record-form-field record-form-field--full">
                <label htmlFor="field-record-notes">
                  Ghi chú kỹ thuật, thông số kiểm tra & vật tư thay thế
                </label>
                <textarea
                  id="field-record-notes"
                  rows={3}
                  placeholder="Ghi nhận thông số áp suất gas, dòng tải máy nén, tình trạng màng lọc hoặc mã phụ tùng đã thay..."
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  className="record-textarea"
                  disabled={isSubmitting}
                />
              </div>

              {/* Explicit Connection Limitation Notice */}
              <div className="record-notice-box" role="note">
                <strong>Minh bạch kết nối hệ thống:</strong>
                <p>
                  Hệ thống chưa kết nối API CMMS / ERP hai chiều. Thao tác ghi nhận này sẽ cập nhật
                  trực tiếp vào phiên mô phỏng Digital Twin (Twin Store) để làm mới chỉ số đến hạn,
                  đẩy mốc chu kỳ kế tiếp và thêm biên bản vào lịch sử.
                </p>
              </div>

              <footer className="record-modal-footer">
                <button
                  type="button"
                  className="record-btn record-btn--cancel"
                  onClick={() => setIsRecordModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="record-btn record-btn--submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Đang lưu vào phiên mô phỏng..." : "Lưu bản ghi vào phiên mô phỏng"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ASSET DETAIL DRAWER INTEGRATION */}
      {/* ========================================================= */}
      <AssetDetailDrawer
        item={selectedDrawerItem}
        devices={devices}
        sensors={sensors}
        rooms={rooms}
        floors={floors}
        alerts={alerts}
        events={events}
        onClose={() => setSelectedDrawerItem(null)}
        triggerRef={drawerTriggerRef}
      />
    </section>
  );
}
