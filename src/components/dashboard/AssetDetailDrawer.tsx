import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  FileText,
  History,
  Info,
  Layers,
  ShieldAlert,
  Sliders,
  User,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from "lucide-react";
import type { AssetException } from "../../features/dashboard/types";
import type { TwinAlert, TwinDevice, TwinSensor, TwinSimulationEvent } from "../../features/twin/types";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import type { Floor } from "../../types/models";
import type { DeviceEnergyReading } from "../../features/energy/types";
import { resolveAssetOperationalContext } from "../../features/assets/assetDetailSelectors";
import { useAuthStore } from "../../features/auth/authStore";
import { useTwinStore } from "../../features/twin/twinStore";
import ScopedDashboardLink from "../common/ScopedDashboardLink";
import StatusBadge from "./StatusBadge";

export type AssetDetailTab = "overview" | "operations" | "maintenance" | "incidents" | "profile";

export interface AssetDetailDrawerProps {
  item: AssetException | null;
  devices: readonly TwinDevice[];
  sensors?: readonly TwinSensor[];
  rooms: readonly FloorRoomSnapshot[];
  floors?: readonly Floor[];
  alerts?: readonly TwinAlert[];
  energyReadings?: readonly DeviceEnergyReading[];
  events?: readonly TwinSimulationEvent[];
  buildingName?: string;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export default function AssetDetailDrawer({
  item,
  devices,
  sensors = [],
  rooms,
  floors = [],
  alerts = [],
  energyReadings = [],
  events = [],
  buildingName = "ICS Headquarters",
  onClose,
  triggerRef,
}: AssetDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<AssetDetailTab>("overview");
  const [prevItemId, setPrevItemId] = useState<string | null>(item?.id ?? null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  // Reset tab to overview when opening a new item
  if (item && item.id !== prevItemId) {
    setPrevItemId(item.id);
    setActiveTab("overview");
  }

  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const isAdmin = role === "Admin";

  const acknowledgeAlert = useTwinStore((state) => state.acknowledgeAlert);

  // Close with Escape key
  useEffect(() => {
    const triggerEl = triggerRef?.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    if (item) {
      document.addEventListener("keydown", handleKeyDown);
      closeButtonRef.current?.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (triggerEl) {
        triggerEl.focus();
      }
    };
  }, [item, onClose, triggerRef]);

  const ctx = useMemo(() => {
    if (!item) return null;
    return resolveAssetOperationalContext(item, {
      devices,
      sensors,
      rooms,
      floors,
      alerts,
      energyReadings,
      events,
      buildingName,
    });
  }, [item, devices, sensors, rooms, floors, alerts, energyReadings, events, buildingName]);

  if (!item || !ctx) {
    return null;
  }

  const tabs: { id: AssetDetailTab; label: string; icon: typeof Activity }[] = [
    { id: "overview", label: "Tổng quan", icon: Activity },
    { id: "operations", label: "Dữ liệu & vận hành", icon: Sliders },
    { id: "maintenance", label: "Bảo trì", icon: Wrench },
    { id: "incidents", label: "Sự cố & nhật ký", icon: ShieldAlert },
    { id: "profile", label: "Hồ sơ & liên kết", icon: Layers },
  ];

  return (
    <div className="asset-detail-overlay" role="presentation" onClick={onClose}>
      <aside
        className="asset-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <header className="asset-drawer-header">
          <div className="asset-drawer-header-content">
            <nav className="asset-drawer-breadcrumb" aria-label="Location hierarchy">
              <span>{ctx.buildingName}</span>
              <span className="crumb-sep">/</span>
              <span>{ctx.floor?.name ?? "Floor"}</span>
              <span className="crumb-sep">/</span>
              <strong>{ctx.room?.name ?? ctx.item.area}</strong>
            </nav>

            <div className="asset-drawer-title-row">
              <div className="asset-drawer-title-group">
                <h2 id={titleId} className="asset-drawer-title">
                  <span className="asset-code-highlight">{ctx.item.id}</span>
                  <span className="asset-drawer-name-sep">·</span>
                  <span className="asset-drawer-name">
                    {ctx.assetIdentity?.name && ctx.assetIdentity.name !== ctx.item.id
                      ? ctx.assetIdentity.name
                      : ctx.device?.name && ctx.device.name !== ctx.item.id
                        ? ctx.device.name
                        : ctx.item.type}
                  </span>
                </h2>
                <span className="asset-drawer-category-tag">{ctx.categoryLabel}</span>
              </div>

              <div className="asset-drawer-header-actions">
                {ctx.fullProfileUrl && (
                  <ScopedDashboardLink
                    className="asset-drawer-full-link"
                    to={ctx.fullProfileUrl}
                    title="Mở hồ sơ đầy đủ"
                  >
                    <span>Mở hồ sơ đầy đủ</span>
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </ScopedDashboardLink>
                )}
                <button
                  ref={closeButtonRef}
                  className="asset-drawer-close-btn"
                  type="button"
                  aria-label="Đóng bảng chi tiết tài sản"
                  onClick={onClose}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Attention Banner */}
          {ctx.hasAttention && (
            <div
              className={`asset-attention-callout asset-attention-callout--${ctx.priority}`}
              role="region"
              aria-label="Khối cần chú ý"
            >
              <div className="asset-attention-icon">
                {ctx.priority === "high" ? (
                  <AlertCircle size={18} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={18} aria-hidden="true" />
                )}
              </div>
              <div className="asset-attention-copy">
                <div className="asset-attention-header">
                  <strong>{ctx.attentionHeadline}</strong>
                  <span className="asset-attention-badge">{ctx.priorityLabel}</span>
                </div>
                <p className="asset-attention-desc">{ctx.attentionDescription}</p>
                <p className="asset-attention-basis">
                  <Info size={13} aria-hidden="true" /> {ctx.attentionBasis}
                </p>
              </div>
              <div className="asset-attention-action">
                <button
                  type="button"
                  className="asset-attention-btn"
                  onClick={() => setActiveTab(ctx.attentionActionTab)}
                >
                  {ctx.attentionRecommendedAction} <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* 4 Status Dimensions Grid */}
          <div className="asset-status-matrix" aria-label="Trạng thái vận hành tổng hợp">
            <div className="asset-status-cell">
              <span className="asset-status-cell-label">Trạng thái vận hành</span>
              <strong className="asset-status-cell-value">
                <StatusBadge
                  status={
                    ctx.operationalStatus === "error"
                      ? "critical"
                      : ctx.operationalStatus === "unverified"
                        ? "warning"
                        : "normal"
                  }
                  label={ctx.operationalStatusLabel}
                />
              </strong>
            </div>

            <div className="asset-status-cell">
              <span className="asset-status-cell-label">{ctx.connectionTargetLabel}</span>
              <strong className="asset-status-cell-value">
                <span className={`status-indicator status-indicator--${ctx.connectionStatus}`}>
                  {ctx.connectionStatus === "online" ? (
                    <Wifi size={13} aria-hidden="true" />
                  ) : (
                    <WifiOff size={13} aria-hidden="true" />
                  )}
                  <span>{ctx.connectionStatusLabel}</span>
                </span>
                <span className="asset-status-subnote">Gần nhất: {ctx.lastSeenFormatted}</span>
              </strong>
            </div>

            <div className="asset-status-cell">
              <span className="asset-status-cell-label">Tình trạng bảo trì</span>
              <strong className="asset-status-cell-value">
                <StatusBadge
                  status={
                    ctx.maintenanceStatus === "due"
                      ? "critical"
                      : ctx.maintenanceStatus === "due-soon"
                        ? "warning"
                        : ctx.maintenanceStatus === "normal"
                          ? "normal"
                          : "offline"
                  }
                  label={ctx.maintenanceStatusLabel}
                />
              </strong>
            </div>

            <div className="asset-status-cell">
              <span className="asset-status-cell-label">Mức độ ưu tiên</span>
              <strong className="asset-status-cell-value">
                <span className={`priority-tag priority-tag--${ctx.priority}`}>{ctx.priorityLabel}</span>
                <span className="asset-status-subnote">{ctx.priorityReason}</span>
              </strong>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="asset-drawer-tabs" role="tablist" aria-label="Phân hệ hồ sơ tài sản">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-controls={`panel-${tab.id}`}
                  aria-selected={isActive}
                  className={`asset-tab-btn ${isActive ? "is-active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={14} aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Drawer Body Scroll Container */}
        <div className="asset-drawer-body">
          {/* TAB 1: TỔNG QUAN */}
          {activeTab === "overview" && (
            <div
              id="panel-overview"
              role="tabpanel"
              aria-labelledby="tab-overview"
              className="asset-tab-panel"
            >
              {/* Block A: Tình trạng hiện tại */}
              <section className="asset-detail-card" aria-labelledby="sec-current-state">
                <h3 id="sec-current-state" className="asset-card-title">
                  <Activity size={15} aria-hidden="true" /> Tình trạng hiện tại
                </h3>
                <div className="asset-state-grid">
                  <div className="asset-state-item">
                    <span>Trạng thái máy móc:</span>
                    <strong>{ctx.operationalStatusLabel}</strong>
                  </div>
                  <div className="asset-state-item">
                    <span>Kết nối dữ liệu:</span>
                    <strong>{ctx.connectionStatusLabel} · {ctx.lastSeenFormatted}</strong>
                  </div>
                  <div className="asset-state-item">
                    <span>Kế hoạch bảo trì:</span>
                    <strong>{ctx.maintenanceStatusLabel}</strong>
                  </div>
                </div>
              </section>

              {/* Block B: Vấn đề đang mở */}
              <section className="asset-detail-card" aria-labelledby="sec-open-issues">
                <h3 id="sec-open-issues" className="asset-card-title">
                  <ShieldAlert size={15} aria-hidden="true" /> Vấn đề đang mở ({ctx.relatedAlerts.length})
                </h3>
                {ctx.relatedAlerts.length > 0 ? (
                  <div className="asset-issues-list">
                    {ctx.relatedAlerts.map((alert) => (
                      <div key={alert.id} className="asset-issue-item">
                        <div className="asset-issue-top">
                          <StatusBadge
                            status={alert.severity === "critical" ? "critical" : "warning"}
                            label={alert.severity.toUpperCase()}
                          />
                          <strong className="asset-issue-title">{alert.title}</strong>
                          <span className="asset-issue-time">{alert.reading ?? alert.status}</span>
                        </div>
                        <p className="asset-issue-msg">{alert.message}</p>
                      </div>
                    ))}
                    <div className="asset-issues-actions">
                      <button
                        type="button"
                        className="asset-jump-tab-link"
                        onClick={() => setActiveTab("incidents")}
                      >
                        Mở chi tiết xử lý sự cố <ArrowRight size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="asset-empty-text">
                    <CheckCircle2 size={16} aria-hidden="true" /> Hiện không có sự cố chưa giải quyết trên thiết bị này.
                  </p>
                )}
              </section>

              {/* Block C: Chỉ số quan trọng */}
              <section className="asset-detail-card" aria-labelledby="sec-key-metrics">
                <h3 id="sec-key-metrics" className="asset-card-title">
                  <Sliders size={15} aria-hidden="true" /> Chỉ số quan trọng (Đo đạc thực tế)
                </h3>
                {ctx.metrics.length > 0 ? (
                  <div className="asset-metrics-grid">
                    {ctx.metrics.map((metric) => (
                      <div key={metric.id} className="asset-metric-box">
                        <div className="asset-metric-header">
                          <span className="asset-metric-name">{metric.label}</span>
                          <span
                            className={`asset-metric-confirm-pill ${metric.isConfirmed ? "is-confirmed" : "is-estimated"}`}
                          >
                            {metric.isConfirmed ? "Đã xác nhận" : "Ước tính"}
                          </span>
                        </div>
                        <div className="asset-metric-val">{metric.value}</div>
                        <div className="asset-metric-meta">
                          <span>Nguồn: {metric.source}</span>
                          {metric.confirmationNote && (
                            <span className="asset-metric-subtext">{metric.confirmationNote}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="asset-empty-text">Chưa có chỉ số đo đạc thời gian thực cho thiết bị này.</p>
                )}
              </section>

              {/* Block D: Bảo trì tiếp theo */}
              {(ctx.maintenanceCycleInfo || ctx.maintenancePlans.length > 0) && (
                <section className="asset-detail-card" aria-labelledby="sec-next-maintenance">
                  <h3 id="sec-next-maintenance" className="asset-card-title">
                    <Wrench size={15} aria-hidden="true" />
                    <span>Bảo trì tiếp theo</span>
                    <span className="asset-card-title-meta">Ngày tham chiếu: {ctx.referenceDateLabel}</span>
                  </h3>
                  {ctx.maintenanceCycleInfo && (
                    <div className="asset-maintenance-preview">
                      <div className="asset-maint-headline">
                        <strong>{ctx.maintenanceCycleInfo.itemTitle}</strong>
                        <span className="asset-maint-hours-pill">
                          Còn {ctx.maintenanceCycleInfo.remainingHours} giờ vận hành
                        </span>
                      </div>
                      <div className="asset-maint-progress-wrap">
                        <div
                          className="asset-maint-progress-bar"
                          style={{ width: `${ctx.maintenanceCycleInfo.percentComplete}%` }}
                        />
                      </div>
                      <div className="asset-maint-progress-labels">
                        <span>Đã chạy: {ctx.maintenanceCycleInfo.accumulatedHours}h</span>
                        <span>Chu kỳ: {ctx.maintenanceCycleInfo.intervalHours}h</span>
                      </div>
                      <p className="asset-maint-explanation">
                        <Info size={13} aria-hidden="true" /> {ctx.maintenanceCycleInfo.explanation}
                      </p>
                    </div>
                  )}
                  {ctx.maintenancePlans.length > 0 && (
                    <div className="asset-maint-plans-list" aria-label="Danh sách hạng mục bảo trì theo lịch">
                      {ctx.maintenancePlans.map((plan) => (
                        <div key={plan.id} className="asset-maint-plan-item">
                          <div className="asset-maint-headline">
                            <strong>{plan.title}</strong>
                            <StatusBadge
                              status={
                                plan.dueStatus === "overdue" || plan.dueStatus === "due"
                                  ? "critical"
                                  : plan.dueStatus === "due-soon"
                                    ? "warning"
                                    : "normal"
                              }
                              label={plan.remainingLabel}
                            />
                          </div>
                          <div className="asset-maint-progress-labels">
                            <span>Căn cứ: {plan.basisLabel} ({plan.nominalCycleLabel})</span>
                            <span>Mốc đến hạn: {plan.nextMilestoneLabel}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Block F: Trách nhiệm & Ảnh hưởng */}
              <section className="asset-detail-card" aria-labelledby="sec-responsibility">
                <h3 id="sec-responsibility" className="asset-card-title">
                  <User size={15} aria-hidden="true" /> Trách nhiệm & Phạm vi ảnh hưởng
                </h3>
                <div className="asset-responsibility-grid">
                  <div>
                    <span className="asset-resp-label">Bộ phận phụ trách:</span>
                    <strong>
                      {ctx.category === "air-conditioner"
                        ? "Đội Cơ điện & Lạnh trung tâm (MEP Team)"
                        : ctx.category === "controller"
                          ? "Đội Quản lý BMS & Tự động hóa"
                          : "Đội Vận hành Hạ tầng Tòa nhà"}
                    </strong>
                  </div>
                  <div>
                    <span className="asset-resp-label">Khu vực phụ thuộc:</span>
                    <strong>
                      {ctx.room?.name ?? ctx.item.area} ({ctx.floor?.name ?? "Floor"})
                    </strong>
                  </div>
                  <div>
                    <span className="asset-resp-label">Tài sản liên đới:</span>
                    <span>
                      {ctx.category === "controller"
                        ? "Các cảm biến đo môi trường và thiết bị bus trong khu vực."
                        : "Không gian làm việc và tiện nghi nhiệt độ phòng."}
                    </span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: DỮ LIỆU & VẬN HÀNH */}
          {activeTab === "operations" && (
            <div
              id="panel-operations"
              role="tabpanel"
              aria-labelledby="tab-operations"
              className="asset-tab-panel"
            >
              {/* Phân định IR Control & BMS */}
              {ctx.category === "air-conditioner" && (
                <div className="asset-ir-disclaimer" role="note">
                  <div className="asset-ir-disclaimer-heading">
                    <Info size={16} aria-hidden="true" />
                    <strong>Nguyên lý điều khiển qua Gateway IR / BMS</strong>
                  </div>
                  <div className="asset-ir-steps">
                    <div className="asset-ir-step">
                      <span className="asset-ir-step-num">1</span>
                      <div>
                        <strong>Lệnh điều khiển</strong>
                        <p>Lệnh đặt 24°C / Quạt Auto từ lịch trình BMS đã gửi đến bộ phát hồng ngoại.</p>
                      </div>
                    </div>
                    <div className="asset-ir-step">
                      <span className="asset-ir-step-num">2</span>
                      <div>
                        <strong>Kết quả truyền lệnh</strong>
                        <p>Bộ phát IR đã phát tín hiệu thành công (Đã xác nhận truyền).</p>
                      </div>
                    </div>
                    <div className="asset-ir-step">
                      <span className="asset-ir-step-num">3</span>
                      <div>
                        <strong>Trạng thái vật lý dàn lạnh</strong>
                        <p className="asset-text-caution">
                          Chưa có cảm biến phản hồi hai chiều từ dàn lạnh vật lý; giờ chạy là ước tính theo thời gian lệnh mở.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bảng thông số vận hành chi tiết */}
              <section className="asset-detail-card" aria-labelledby="sec-operational-metrics">
                <h3 id="sec-operational-metrics" className="asset-card-title">
                  <Sliders size={15} aria-hidden="true" /> Thông số đo đạc & Vận hành chi tiết
                </h3>
                <div className="asset-operational-table-wrap">
                  <table className="asset-operational-table">
                    <thead>
                      <tr>
                        <th>Thông số</th>
                        <th>Giá trị hiện tại</th>
                        <th>Nguồn xác nhận</th>
                        <th>Độ tin cậy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ctx.metrics.map((metric) => (
                        <tr key={metric.id}>
                          <td><strong>{metric.label}</strong></td>
                          <td><span className="asset-metric-cell-val">{metric.value}</span></td>
                          <td><span className="asset-metric-cell-src">{metric.source}</span></td>
                          <td>
                            <span
                              className={`asset-metric-confirm-pill ${metric.isConfirmed ? "is-confirmed" : "is-estimated"}`}
                            >
                              {metric.isConfirmed ? "Xác nhận cảm biến" : "Ước tính theo lệnh"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="detail-panel-footnote">
                  Hệ thống không gán chỉ số của cảm biến phòng thành cảm biến tích hợp của điều hòa. Không gán tổng điện năng phòng thành điện năng riêng của một thiết bị.
                </p>
              </section>
            </div>
          )}

          {/* TAB 3: BẢO TRÌ */}
          {activeTab === "maintenance" && (
            <div
              id="panel-maintenance"
              role="tabpanel"
              aria-labelledby="tab-maintenance"
              className="asset-tab-panel"
            >
              {/* Phần A: Kế hoạch hiện tại */}
              <section className="asset-detail-card" aria-labelledby="sec-plan">
                <h3 id="sec-plan" className="asset-card-title">
                  <Wrench size={15} aria-hidden="true" />
                  <span>Kế hoạch bảo trì chu kỳ</span>
                  <span className="asset-card-title-meta">Ngày tham chiếu: {ctx.referenceDateLabel}</span>
                </h3>
                {ctx.maintenanceCycleInfo ? (
                  <div className="asset-maint-detail-box">
                    <div className="asset-maint-row">
                      <span>Hạng mục bảo dưỡng:</span>
                      <strong>{ctx.maintenanceCycleInfo.itemTitle}</strong>
                    </div>
                    <div className="asset-maint-row">
                      <span>Căn cứ xác định:</span>
                      <span>{ctx.maintenanceCycleInfo.basisLabel}</span>
                    </div>
                    <div className="asset-maint-row">
                      <span>Ngưỡng chu kỳ định mức:</span>
                      <strong>{ctx.maintenanceCycleInfo.intervalHours.toLocaleString("en-US")} giờ vận hành</strong>
                    </div>
                    <div className="asset-maint-row">
                      <span>Giờ máy nén đã chạy trong kỳ:</span>
                      <strong>{ctx.maintenanceCycleInfo.accumulatedHours.toLocaleString("en-US")} giờ</strong>
                    </div>
                    <div className="asset-maint-row">
                      <span>Giờ vận hành còn lại:</span>
                      <strong className="asset-highlight-remaining">
                        {ctx.maintenanceCycleInfo.remainingHours} giờ
                      </strong>
                    </div>

                    <div className="asset-maint-progress-wrap asset-maint-progress-wrap--lg">
                      <div
                        className="asset-maint-progress-bar"
                        style={{ width: `${ctx.maintenanceCycleInfo.percentComplete}%` }}
                      />
                    </div>
                    <div className="asset-maint-progress-labels">
                      <span>Tiến độ chu kỳ: {ctx.maintenanceCycleInfo.percentComplete}%</span>
                      <span>Hết chu kỳ sau: {ctx.maintenanceCycleInfo.remainingHours}h chạy máy</span>
                    </div>

                    <div className="asset-callout-explanation">
                      <strong>Giải thích chỉ số "Còn {ctx.maintenanceCycleInfo.remainingHours}h vận hành":</strong>
                      <p>{ctx.maintenanceCycleInfo.explanation}</p>
                    </div>
                  </div>
                ) : (
                  <p className="asset-empty-text">Thiết bị chưa được cấu hình chu kỳ bảo dưỡng theo giờ chạy.</p>
                )}

                {ctx.maintenancePlans.length > 0 && (
                  <div className="asset-maint-plans-list" aria-label="Chi tiết các hạng mục kế hoạch bảo trì">
                    {ctx.maintenancePlans.map((plan) => (
                      <div key={plan.id} className="asset-history-item">
                        <div className="asset-history-head">
                          <span className="asset-history-date">
                            {plan.basisLabel} · Mốc kế tiếp: <strong>{plan.nextMilestoneLabel}</strong>
                          </span>
                          <StatusBadge
                            status={
                              plan.dueStatus === "overdue" || plan.dueStatus === "due"
                                ? "critical"
                                : plan.dueStatus === "due-soon"
                                  ? "warning"
                                  : "normal"
                            }
                            label={plan.remainingLabel}
                          />
                        </div>
                        <strong className="asset-history-title">{plan.title}</strong>
                        <p className="asset-history-performer">
                          <User size={13} aria-hidden="true" /> Phụ trách: {plan.assignee}
                        </p>
                        {plan.notes && <p className="asset-history-notes">{plan.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Phần B: Lịch sử bảo trì */}
              <section className="asset-detail-card" aria-labelledby="sec-history">
                <h3 id="sec-history" className="asset-card-title">
                  <History size={15} aria-hidden="true" /> Lịch sử bảo trì đã thực hiện
                </h3>
                {ctx.maintenanceHistory.length > 0 ? (
                  <div className="asset-history-list">
                    {ctx.maintenanceHistory.map((hist) => (
                      <div key={hist.id} className="asset-history-item">
                        <div className="asset-history-head">
                          <span className="asset-history-date">{hist.completedAt}</span>
                          <span className="asset-history-badge">{hist.resultLabel}</span>
                        </div>
                        <strong className="asset-history-title">{hist.itemTitle}</strong>
                        <p className="asset-history-performer">
                          <User size={13} aria-hidden="true" /> Thực hiện: {hist.performer}
                        </p>
                        <p className="asset-history-notes">{hist.notes}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="asset-empty-text">Chưa ghi nhận bản ghi bảo trì lịch sử cho thiết bị này.</p>
                )}
              </section>

              {/* Phần C: Ghi nhận bảo trì (Thực hiện khi có API / Báo rõ thiếu sót) */}
              <section className="asset-detail-card" aria-labelledby="sec-record-maintenance">
                <h3 id="sec-record-maintenance" className="asset-card-title">
                  <FileText size={15} aria-hidden="true" /> Ghi nhận hoàn thành bảo trì
                </h3>

                <div className="asset-api-status-banner">
                  <div className="asset-api-status-badge">API CMMS Backend: Chưa kết nối</div>
                  <p>
                    Hệ thống ICS Digital Twin hiện tại chưa có API ghi nhận bảo trì từ máy chủ. Theo quy chuẩn kỹ thuật, hệ thống không tạo nút lưu giả hoặc dùng local state giả lập lưu thành công khi chưa có xác nhận từ backend.
                  </p>
                </div>

                <div className="asset-maintenance-form-preview" aria-disabled="true">
                  <div className="asset-form-group">
                    <label>Hạng mục thực hiện:</label>
                    <input
                      type="text"
                      disabled
                      value={ctx.maintenanceCycleInfo?.itemTitle ?? "Bảo dưỡng định kỳ"}
                    />
                  </div>
                  <div className="asset-form-group">
                    <label>Người thực hiện (Theo tài khoản hiện hành):</label>
                    <input
                      type="text"
                      disabled
                      value={`${user?.displayName ?? "Kỹ thuật viên"} (${role ?? "Viewer"})`}
                    />
                  </div>
                  <div className="asset-form-group">
                    <label>Kết quả kiểm định:</label>
                    <input type="text" disabled value="Đạt tiêu chuẩn vận hành" />
                  </div>
                  <div className="asset-form-group">
                    <label>Ghi chú kỹ thuật:</label>
                    <textarea
                      disabled
                      rows={2}
                      value="Form sẵn sàng tích hợp khi endpoint POST /api/maintenance/records khả dụng."
                    />
                  </div>
                  <div className="asset-form-submit-row">
                    <button type="button" disabled className="asset-form-btn-disabled">
                      Lưu phiếu bảo trì (Chờ API)
                    </button>
                    {!isAdmin && (
                      <span className="asset-perm-warning">
                        Tài khoản hiện tại ({role}) chỉ có quyền xem (Viewer).
                      </span>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: SỰ CỐ & NHẬT KÝ */}
          {activeTab === "incidents" && (
            <div
              id="panel-incidents"
              role="tabpanel"
              aria-labelledby="tab-incidents"
              className="asset-tab-panel"
            >
              {/* Phần A: Sự cố */}
              <section className="asset-detail-card" aria-labelledby="sec-incidents-list">
                <h3 id="sec-incidents-list" className="asset-card-title">
                  <ShieldAlert size={15} aria-hidden="true" /> Sự cố & Bất thường liên quan ({ctx.relatedAlerts.length})
                </h3>

                {ctx.relatedAlerts.length > 0 ? (
                  <div className="asset-incidents-full-list">
                    {ctx.relatedAlerts.map((alert) => {
                      const isActive = alert.status === "active";
                      return (
                        <article key={alert.id} className="asset-incident-card">
                          <div className="asset-incident-card-top">
                            <StatusBadge
                              status={alert.severity === "critical" ? "critical" : "warning"}
                              label={alert.severity.toUpperCase()}
                            />
                            <strong>{alert.title}</strong>
                            <span className="asset-incident-status-tag">
                              {alert.status === "active"
                                ? "Chưa tiếp nhận"
                                : alert.status === "acknowledged"
                                  ? "Đang xử lý"
                                  : "Đã xử lý"}
                            </span>
                          </div>

                          <p className="asset-incident-desc">{alert.message}</p>

                          <div className="asset-incident-meta-row">
                            <span>Vị trí: {alert.location}</span>
                            <span>Thời điểm: {new Date(alert.occurredAt).toLocaleTimeString("vi-VN")}</span>
                            {alert.reading && <span>Thông số: {alert.reading}</span>}
                          </div>

                          <div className="asset-incident-guide">
                            <strong>Hướng dẫn xử lý đề xuất:</strong>
                            <p>
                              {ctx.category === "controller"
                                ? "1. Kiểm tra nguồn cấp bộ điều khiển 24V. 2. Kiểm tra cáp tín hiệu mạng LAN/BACnet. 3. Thử khởi động lại gateway."
                                : ctx.category === "sensor"
                                  ? "1. Kiểm tra pin hoặc nguồn cấp cảm biến. 2. Kiểm tra cự ly thu phát sóng IoT. 3. Vệ sinh đầu đo cảm biến."
                                  : "1. Kiểm tra phin lọc bụi. 2. Xác nhận lịch vận hành ngoài giờ. 3. Liên hệ đội Cơ điện MEP chuẩn bị vật tư bảo dưỡng."}
                            </p>
                          </div>

                          {isActive && (
                            <div className="asset-incident-action-row">
                              <button
                                type="button"
                                className="asset-ack-btn"
                                disabled={!isAdmin}
                                title={!isAdmin ? "Chỉ tài khoản Admin mới có quyền tiếp nhận cảnh báo" : "Xác nhận đã tiếp nhận cảnh báo"}
                                onClick={() => acknowledgeAlert(alert.id)}
                              >
                                Tiếp nhận cảnh báo
                              </button>
                              {!isAdmin && (
                                <span className="asset-perm-hint">Cần quyền Admin để tiếp nhận</span>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="asset-empty-text">
                    <CheckCircle2 size={16} aria-hidden="true" /> Không có sự cố nào được ghi nhận cho thiết bị này.
                  </p>
                )}
              </section>

              {/* Phần B: Nhật ký thời gian */}
              <section className="asset-detail-card" aria-labelledby="sec-timeline-logs">
                <h3 id="sec-timeline-logs" className="asset-card-title">
                  <History size={15} aria-hidden="true" /> Nhật ký hoạt động & Thay đổi
                </h3>
                {ctx.timelineLogs.length > 0 ? (
                  <div className="asset-timeline">
                    {ctx.timelineLogs.map((log) => (
                      <div key={log.id} className="asset-timeline-entry">
                        <div className="asset-timeline-dot" />
                        <div className="asset-timeline-content">
                          <div className="asset-timeline-head">
                            <strong>{log.action}</strong>
                            <span className="asset-timeline-time">{log.timeFormatted}</span>
                          </div>
                          <span className="asset-timeline-actor">Bởi: {log.actor}</span>
                          <p className="asset-timeline-detail">{log.details}</p>
                          <span
                            className={`asset-timeline-conf ${log.confirmationStatus === "confirmed" ? "is-conf" : "is-est"}`}
                          >
                            {log.confirmationStatus === "confirmed" ? "Dữ liệu xác nhận" : "Lệnh ước tính"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="asset-empty-text">Chưa có nhật ký hoạt động gần đây.</p>
                )}
              </section>
            </div>
          )}

          {/* TAB 5: HỒ SƠ & LIÊN KẾT */}
          {activeTab === "profile" && (
            <div
              id="panel-profile"
              role="tabpanel"
              aria-labelledby="tab-profile"
              className="asset-tab-panel"
            >
              {/* Phần A: Hồ sơ phần cứng (Digital Identity) */}
              <section className="asset-detail-card" aria-labelledby="sec-hardware-profile">
                <h3 id="sec-hardware-profile" className="asset-card-title">
                  <Cpu size={15} aria-hidden="true" /> Hồ sơ tài sản (Digital Identity)
                </h3>

                {ctx.assetIdentity ? (
                  <div className="asset-profile-table-grid">
                    <div>
                      <span className="asset-profile-field-label">Mã tài sản (Asset ID):</span>
                      <strong>{ctx.assetIdentity.id}</strong>
                    </div>
                    <div>
                      <span className="asset-profile-field-label">Thiết bị liên kết (Device ID):</span>
                      <strong>{ctx.assetIdentity.deviceId}</strong>
                    </div>
                    <div>
                      <span className="asset-profile-field-label">Hãng sản xuất:</span>
                      <strong>{ctx.assetIdentity.manufacturer}</strong>
                    </div>
                    <div>
                      <span className="asset-profile-field-label">Model:</span>
                      <strong>{ctx.assetIdentity.model}</strong>
                    </div>
                    <div>
                      <span className="asset-profile-field-label">Số Serial:</span>
                      <strong className="asset-serial-code">{ctx.assetIdentity.serialNumber}</strong>
                    </div>
                    <div>
                      <span className="asset-profile-field-label">Ngày lắp đặt:</span>
                      <strong>
                        {new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(
                          new Date(`${ctx.assetIdentity.installationDate}T00:00:00`),
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="asset-profile-field-label">Tổng giờ máy nén tích lũy:</span>
                      <strong>{ctx.assetIdentity.runtimeHours.toLocaleString("en-US")} giờ</strong>
                    </div>
                    <div>
                      <span className="asset-profile-field-label">Chu kỳ bảo dưỡng khuyến nghị:</span>
                      <strong>{ctx.assetIdentity.maintenanceIntervalHours.toLocaleString("en-US")} giờ</strong>
                    </div>
                  </div>
                ) : (
                  <div className="asset-no-identity-note">
                    <p>
                      <strong>Thiết bị chưa có hồ sơ tài sản độc lập (Asset Digital Identity):</strong>
                    </p>
                    <p>
                      Thiết bị này đang được theo dõi dưới dạng Device/Sensor IoT (Device ID: <code>{ctx.item.deviceId}</code>). Chưa có hồ sơ phần cứng, nhà sản xuất hoặc số serial riêng trong hệ thống quản lý tài sản.
                    </p>
                  </div>
                )}
              </section>

              {/* Phần B: Liên kết hệ thống */}
              <section className="asset-detail-card" aria-labelledby="sec-relationships">
                <h3 id="sec-relationships" className="asset-card-title">
                  <Layers size={15} aria-hidden="true" /> Mạng lưới liên kết thực tế
                </h3>
                <div className="asset-rel-list">
                  {ctx.relationships.map((rel) => (
                    <div key={rel.id} className="asset-rel-item">
                      <div className="asset-rel-info">
                        <strong>{rel.name}</strong>
                        <span className="asset-rel-role">Vai trò: {rel.role}</span>
                        <span className="asset-rel-type">Loại: {rel.type}</span>
                      </div>
                      {rel.targetUrl && (
                        <ScopedDashboardLink className="asset-rel-link" to={rel.targetUrl}>
                          Xem <ArrowUpRight size={13} aria-hidden="true" />
                        </ScopedDashboardLink>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
