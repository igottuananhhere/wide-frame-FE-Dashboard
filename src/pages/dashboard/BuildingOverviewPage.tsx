import { lazy, Suspense, useMemo } from "react";
import { Activity, ArrowUpRight, BellRing, Building2, Zap } from "lucide-react";
import AlertItem from "../../components/dashboard/AlertItem";
import AssetExceptionTable from "../../components/dashboard/AssetExceptionTable";
import BuildingStackPanel from "../../components/dashboard/BuildingStackPanel";
import DetailStatCard from "../../components/dashboard/DetailStatCard";
import ScopedDashboardLink from "../../components/common/ScopedDashboardLink";
import MetricCard from "../../components/dashboard/MetricCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { ACTIVE_FLOOR_ID, BUILDING_LOCATIONS, DEMO_FLOOR_2_ID } from "../../data/mock/buildingLocations";
import { floor1EnvironmentThresholds } from "../../data/mock/floor1Environment.mock";
import { floor1EnergyComparison } from "../../data/mock/floor1EnergyDetail.mock";
import { floor2EnergyComparison, floor2MonthlyEnergyForecast } from "../../data/mock/floor2EnergyDetail.mock";
import { buildAreaEnvironmentReadings } from "../../features/environment/environmentSelectors";
import { buildAssetExceptions, buildAttentionQueue, buildEnvironmentSummary } from "../../features/twin/twinSelectors";
import { isUnresolvedIncident } from "../../features/alerts/alertSelectors";
import { useTwinStore } from "../../features/twin/twinStore";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import { formatTelemetryTime, getDataFreshnessPresentation } from "../../features/building/dataFreshness";

const EnergyChart = lazy(() => import("../../components/dashboard/EnergyChart"));

export default function BuildingOverviewPage() {
  const scope = useDashboardScopeData();
  const { location, selectedBuilding, dataFloors, rooms, devices, alerts, airQualityByRoom } = scope;
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const lastUpdatedByFloor = useTwinStore((state) => state.lastUpdatedByFloor);
  const energyHistoryByFloor = useTwinStore((state) => state.energyHistoryByFloor);
  const freshness = getDataFreshnessPresentation(location.floorId, automaticTelemetryRunning);
  const scopedUpdatedAt = freshness.updatedFloorId
    ? lastUpdatedByFloor[freshness.updatedFloorId]
    : undefined;
  const floors = selectedBuilding?.floors ?? BUILDING_LOCATIONS[0]?.floors ?? [];
  const unresolvedAlerts = alerts.filter(isUnresolvedIncident);
  const unacknowledgedCount = unresolvedAlerts.filter((alert) => alert.status === "active").length;
  const acknowledgedCount = unresolvedAlerts.filter((alert) => alert.status === "acknowledged").length;
  const environmentReadings = useMemo(
    () => buildAreaEnvironmentReadings(rooms, airQualityByRoom, floor1EnvironmentThresholds),
    [rooms, airQualityByRoom],
  );
  const environment = useMemo(
    () => buildEnvironmentSummary(environmentReadings, floor1EnvironmentThresholds),
    [environmentReadings],
  );
  const attentionQueue = buildAttentionQueue(alerts);
  const assetExceptions = useMemo(
    () => buildAssetExceptions(devices, rooms),
    [devices, rooms],
  );
  const knownDeviceCount = rooms.reduce((total, room) => total + room.deviceCount, 0);
  const onlineDeviceCount = rooms.reduce((total, room) => total + room.onlineDeviceCount, 0);
  const offlineDeviceCount = rooms.reduce((total, room) => total + room.offlineDeviceCount, 0);
  const recordedEnergy = rooms.reduce((total, room) => total + room.energyConsumption, 0);
  const yesterdayEnergy = dataFloors.reduce((total, floor) => total + (floor.id === ACTIVE_FLOOR_ID
    ? floor1EnergyComparison.yesterdayKwh
    : floor.id === DEMO_FLOOR_2_ID ? floor2EnergyComparison.yesterdayKwh : 0), 0);
  const energyChangePercent = yesterdayEnergy > 0 ? ((recordedEnergy / yesterdayEnergy) - 1) * 100 : 0;
  const highestEnergyArea = [...rooms].sort((first, second) => second.energyConsumption - first.energyConsumption)[0];

  return (
    <section className="dashboard-page building-overview-page" aria-labelledby="building-overview-title">
      <header className="overview-page-heading">
        <div className="overview-heading-copy">
          <div className="dashboard-breadcrumb">ICS Digital Twin <span>/</span> ICS Headquarters</div>
          <h1 id="building-overview-title">Tổng quan vận hành tòa nhà</h1>
          <p>Toàn cảnh tình trạng vận hành và các điểm cần xử lý trong tòa nhà</p>
        </div>
        <div className="overview-heading-actions">
          <span className={`overview-live overview-live--${freshness.mode}`} role="status" aria-label={freshness.ariaLabel}>
            <i aria-hidden="true" /> {freshness.label}
          </span>
          {scopedUpdatedAt !== undefined && (
            <time
              aria-label="Floor 1 telemetry last updated"
              className="overview-freshness-time"
              dateTime={new Date(scopedUpdatedAt).toISOString()}
            >
              {formatTelemetryTime(scopedUpdatedAt)}
            </time>
          )}
          <span className="building-coverage-pill"><Building2 aria-hidden="true" size={15} /> {dataFloors.length}/{floors.length} tầng có dữ liệu</span>
        </div>
      </header>

      <section className="detail-stat-grid building-overview-stats" aria-label="Tóm tắt dữ liệu vận hành đang có">
        <DetailStatCard label="Tầng có dữ liệu" value={`${dataFloors.length} / ${floors.length}`} detail={`${dataFloors.map((floor) => floor.name).join(" + ")} · mô phỏng`} icon={Building2} tone="cyan" />
        <DetailStatCard label="Thiết bị đã ghi nhận" value={`${onlineDeviceCount} / ${knownDeviceCount}`} detail={`${offlineDeviceCount} offline · ${rooms.length} khu vực có dữ liệu`} icon={Activity} tone={offlineDeviceCount ? "amber" : "green"} />
        <DetailStatCard label="Sự cố chưa giải quyết" value={String(unresolvedAlerts.length)} detail={`${unacknowledgedCount} chưa tiếp nhận · ${acknowledgedCount} đang xử lý`} icon={BellRing} tone={unresolvedAlerts.some((alert) => alert.severity === "critical") ? "red" : unresolvedAlerts.length ? "amber" : "green"} />
        <DetailStatCard label="Điện năng đã ghi nhận hôm nay" value={`${recordedEnergy.toFixed(1)} kWh`} detail={`${energyChangePercent > 0 ? "+" : ""}${energyChangePercent.toFixed(1)}% so với hôm qua`} icon={Zap} tone="cyan" />
      </section>

      <div className="building-command-grid building-command-grid--map-first">
        <section className="overview-panel attention-panel building-attention-panel" aria-labelledby="building-attention-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">ƯU TIÊN XỬ LÝ · CÁC TẦNG CÓ DỮ LIỆU</p>
              <h2 id="building-attention-title">Sự cố chưa giải quyết</h2>
            </div>
            <span className="attention-total">{unresolvedAlerts.length}</span>
          </header>
          {attentionQueue.length > 0 ? (
            <div className="attention-list building-attention-list">
              {attentionQueue.map((item) => <AlertItem item={item} key={item.id} />)}
            </div>
          ) : (
            <p className="building-empty-state">Không có sự cố chưa giải quyết trong phạm vi có dữ liệu.</p>
          )}
          <ScopedDashboardLink className="building-panel-link" to="/dashboard/incidents">Mở danh sách sự cố <ArrowUpRight aria-hidden="true" size={14} /></ScopedDashboardLink>
        </section>

        <BuildingStackPanel floors={floors} rooms={rooms} alerts={alerts} onSelectFloor={(floorId) => location.onLocationChange(location.buildingId, floorId)} />
      </div>

      <div className="overview-secondary-grid building-overview-secondary-grid">
        <section className="overview-panel energy-panel" aria-labelledby="building-energy-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">NĂNG LƯỢNG · TỔNG CÁC TẦNG CÓ DỮ LIỆU</p>
              <h2 id="building-energy-title">Điện năng ghi nhận hôm nay</h2>
            </div>
            <div className="energy-total">
              <strong>{recordedEnergy.toFixed(1)} kWh</strong>
              <span>{energyChangePercent > 0 ? "+" : ""}{energyChangePercent.toFixed(1)}%</span>
            </div>
          </header>
          <Suspense fallback={<div className="energy-chart energy-chart--loading" role="status">Đang tải biểu đồ năng lượng…</div>}>
            <EnergyChart
              data={energyHistoryByFloor[ACTIVE_FLOOR_ID] ?? []}
              source="current-day"
              scopeLabel="Floor 1"
              scopeNote={`Floor 2 · dữ liệu mẫu tĩnh ngày ${floor2MonthlyEnergyForecast.readingDate.split("-").reverse().join("/")} không gộp vào xu hướng hôm nay`}
            />
          </Suspense>
          <div className="energy-highest-area">
            <span>Khu vực dùng điện cao nhất</span>
            <strong>{highestEnergyArea?.name ?? "—"} · {highestEnergyArea?.energyConsumption.toFixed(1) ?? "0.0"} kWh</strong>
          </div>
          <p className="building-data-note">Đang cộng {dataFloors.length} tầng có dữ liệu · {yesterdayEnergy.toFixed(1)} kWh hôm qua. Floors chưa cấu hình không được tính.</p>
          <ScopedDashboardLink className="building-panel-link" to="/dashboard/energy">Chi tiết năng lượng <ArrowUpRight aria-hidden="true" size={14} /></ScopedDashboardLink>
        </section>

        <section className="overview-panel environment-panel building-environment-panel" aria-labelledby="building-environment-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">CHẤT LƯỢNG MÔI TRƯỜNG · TẤT CẢ TẦNG CÓ DỮ LIỆU</p>
              <h2 id="building-environment-title">Điều kiện các khu vực</h2>
            </div>
            <StatusBadge status={environment.status} label={environment.overall} />
          </header>
          <div className="environment-metric-grid">
            {environment.metrics.map((metric) => <MetricCard metric={metric} key={metric.id} />)}
          </div>
          <div className="building-environment-areas">
            <div className="building-environment-areas-heading">
              <strong>Khu vực cần chú ý</strong>
              <StatusBadge status={environment.status} label={`${environment.areasToReview} khu vực`} />
            </div>
            {environment.attentionAreas.length > 0 ? environment.attentionAreas.map((area) => (
              <ScopedDashboardLink className="environment-attention-link" key={area.roomId} to={`/dashboard/environment?roomId=${encodeURIComponent(area.roomId)}`}>
                <strong>{area.roomName}</strong>
                <span>{area.issues.join(" · ")}</span>
              </ScopedDashboardLink>
            )) : <span className="environment-attention-clear">Không có khu vực vượt ngưỡng trong phạm vi có dữ liệu.</span>}
          </div>
          <ScopedDashboardLink className="building-panel-link" to="/dashboard/environment">Chi tiết môi trường <ArrowUpRight aria-hidden="true" size={14} /></ScopedDashboardLink>
        </section>
      </div>

      <section className="overview-panel asset-exceptions-panel" aria-labelledby="building-assets-title">
        <header className="overview-panel-heading">
          <div>
            <p className="section-eyebrow">THIẾT BỊ & BẢO TRÌ · TẤT CẢ TẦNG CÓ DỮ LIỆU</p>
            <h2 id="building-assets-title">Tài sản cần xử lý</h2>
          </div>
          <ScopedDashboardLink className="panel-text-link" to="/dashboard/assets">Tất cả tài sản <ArrowUpRight aria-hidden="true" size={14} /></ScopedDashboardLink>
        </header>
        {assetExceptions.length > 0
          ? <AssetExceptionTable items={assetExceptions} />
          : <p className="building-empty-state">Không có thiết bị hoặc tài sản cần xử lý trong phạm vi có dữ liệu.</p>}
        <p className="detail-panel-footnote">Danh sách lấy từ thiết bị có trạng thái bất thường hoặc cần bảo trì ở các tầng đã cấu hình.</p>
      </section>

      <p className="building-scope-disclosure">Phạm vi tổng hợp: <strong>{dataFloors.map((floor) => floor.name).join(" + ")} · dữ liệu mô phỏng</strong>. Floors chưa có telemetry được hiển thị trong sơ đồ nhưng không được cộng vào tổng vận hành.</p>
    </section>
  );
}
