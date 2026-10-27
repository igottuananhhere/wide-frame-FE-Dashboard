import { lazy, Suspense, useMemo, useState } from "react";
import { Activity, ArrowUpRight, BellRing, Building2, Wind, Zap } from "lucide-react";
import AlertItem from "../../components/dashboard/AlertItem";
import AssetExceptionsSection from "../../components/dashboard/AssetExceptionsSection";
import BuildingStackPanel from "../../components/dashboard/BuildingStackPanel";
import DetailStatCard from "../../components/dashboard/DetailStatCard";
import ScopedDashboardLink from "../../components/common/ScopedDashboardLink";
import BuildingFloorSelector from "../../components/layout/BuildingFloorSelector";
import MetricCard from "../../components/dashboard/MetricCard";
import OverviewDateFilter from "../../components/dashboard/OverviewDateFilter";
import {
  type DateFilterRange,
  computeDateFilterMetrics,
  formatIsoDateVi,
  getLocalTodayIso,
} from "../../features/dashboard/dateFilterUtils";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { ACTIVE_FLOOR_ID, BUILDING_LOCATIONS } from "../../data/mock/buildingLocations";
import { floor1EnvironmentThresholds } from "../../data/mock/floor1Environment.mock";
import { floor1EnergyComparison } from "../../data/mock/floor1EnergyDetail.mock";
import { useAuthStore } from "../../features/auth/authStore";
import { canControlDevice } from "../../features/auth/permissions";
import { buildAreaEnvironmentReadings } from "../../features/environment/environmentSelectors";
import { buildAssetExceptions, buildAttentionQueue, buildEnvironmentSummary } from "../../features/twin/twinSelectors";
import { isUnresolvedIncident } from "../../features/alerts/alertSelectors";
import { useTwinStore } from "../../features/twin/twinStore";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import { formatTelemetryTime, getDataFreshnessPresentation } from "../../features/building/dataFreshness";

const EnergyChart = lazy(() => import("../../components/dashboard/EnergyChart"));

export default function BuildingOverviewPage() {
  const scope = useDashboardScopeData();
  const { location, selectedBuilding, rooms: rawRooms, devices, sensors, alerts, airQualityByRoom, energyDeviceReadings } = scope;
  const events = useTwinStore((state) => state.events);
  const acknowledgeAlert = useTwinStore((state) => state.acknowledgeAlert);
  const role = useAuthStore((state) => state.role);
  const canAck = canControlDevice(role);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const lastUpdatedByFloor = useTwinStore((state) => state.lastUpdatedByFloor);
  const energyHistoryByFloor = useTwinStore((state) => state.energyHistoryByFloor);
  const freshness = getDataFreshnessPresentation(location.floorId, automaticTelemetryRunning);
  const scopedUpdatedAt = freshness.updatedFloorId
    ? lastUpdatedByFloor[freshness.updatedFloorId]
    : undefined;
  const referenceNow = scopedUpdatedAt ?? lastUpdatedByFloor[ACTIVE_FLOOR_ID] ?? 0;
  const todayIso = useMemo(() => getLocalTodayIso(referenceNow), [referenceNow]);
  const [selectedRange, setSelectedRange] = useState<DateFilterRange>(() => ({
    startDate: todayIso,
    endDate: todayIso,
  }));

  const prelimDateMetrics = useMemo(
    () => computeDateFilterMetrics(selectedRange, todayIso, 1, 1),
    [selectedRange, todayIso],
  );
  const scopedBaseEnergy = useMemo(
    () =>
      rawRooms
        .filter((room) => prelimDateMetrics.validFloorIds.includes(room.floorId))
        .reduce((total, room) => total + room.energyConsumption, 0),
    [rawRooms, prelimDateMetrics.validFloorIds],
  );
  const scopedYesterdayEnergy = useMemo(
    () =>
      prelimDateMetrics.validFloorIds.reduce(
        (total, floorId) =>
          total + (floorId === ACTIVE_FLOOR_ID ? floor1EnergyComparison.yesterdayKwh : 0),
        0,
      ),
    [prelimDateMetrics.validFloorIds],
  );
  const dateMetrics = useMemo(
    () => computeDateFilterMetrics(selectedRange, todayIso, scopedBaseEnergy, scopedYesterdayEnergy),
    [selectedRange, todayIso, scopedBaseEnergy, scopedYesterdayEnergy],
  );
  const rooms = rawRooms;
  const energyRooms = useMemo(() => {
    if (!dateMetrics.hasHistoricalData) return [];
    const validRooms = rawRooms.filter((room) => dateMetrics.validFloorIds.includes(room.floorId));
    if (dateMetrics.energyScale === 1) return validRooms;
    const scaled = validRooms.map((room) => ({
      ...room,
      energyConsumption: Number((room.energyConsumption * dateMetrics.energyScale).toFixed(1)),
    }));
    if (scaled.length > 0) {
      const targetTotal = Number((scopedBaseEnergy * dateMetrics.energyScale).toFixed(1));
      const currentSum = Number(scaled.reduce((sum, r) => sum + r.energyConsumption, 0).toFixed(1));
      const diff = Number((targetTotal - currentSum).toFixed(1));
      if (diff !== 0) {
        scaled[0] = {
          ...scaled[0]!,
          energyConsumption: Number((scaled[0]!.energyConsumption + diff).toFixed(1)),
        };
      }
    }
    return scaled;
  }, [rawRooms, dateMetrics, scopedBaseEnergy]);

  const floors = useMemo(
    () => selectedBuilding?.floors ?? BUILDING_LOCATIONS[0]?.floors ?? [],
    [selectedBuilding],
  );
  const validEnergyFloorNames = useMemo(
    () =>
      floors
        .filter((f) => dateMetrics.validFloorIds.includes(f.id))
        .map((f) => f.name),
    [floors, dateMetrics.validFloorIds],
  );
  const validFloorScopeLabel = validEnergyFloorNames.length > 0 ? validEnergyFloorNames.join(" + ") : "Chưa có dữ liệu";

  const buildingEnergyChartData = useMemo(() => {
    if (!dateMetrics.hasHistoricalData || !dateMetrics.hasHourlySeries) return [];
    const floor1Series = energyHistoryByFloor[ACTIVE_FLOOR_ID] ?? [];
    if (dateMetrics.isToday) {
      return floor1Series;
    }
    return floor1Series.map((point) => ({
      ...point,
      kwh: Number((point.kwh * dateMetrics.hourlyScale).toFixed(1)),
    }));
  }, [energyHistoryByFloor, dateMetrics]);

  const unresolvedAlerts = alerts.filter(isUnresolvedIncident);
  const unacknowledgedCount = unresolvedAlerts.filter((alert) => alert.status === "active").length;
  const acknowledgedCount = unresolvedAlerts.filter((alert) => alert.status === "acknowledged").length;
  const resolvedCount = alerts.filter((alert) => alert.status === "resolved").length;
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

  const recordedEnergy = Number(
    energyRooms.reduce((total, room) => total + room.energyConsumption, 0).toFixed(1),
  );
  const comparisonYesterday = scopedYesterdayEnergy;
  const energyChangePercent =
    dateMetrics.hasPreviousPeriodComparison && comparisonYesterday > 0
      ? ((recordedEnergy / comparisonYesterday) - 1) * 100
      : 0;
  const highestEnergyArea = useMemo(
    () => [...energyRooms].sort((first, second) => second.energyConsumption - first.energyConsumption)[0],
    [energyRooms],
  );
  const highestEnergyFloorName = useMemo(
    () => floors.find((f) => f.id === highestEnergyArea?.floorId)?.name,
    [floors, highestEnergyArea],
  );

  const energyStatLabel = dateMetrics.isToday
    ? "Điện năng tầng 1"
    : dateMetrics.dayCount > 1
      ? `Điện năng tầng 1 (${dateMetrics.dayCount} ngày)`
      : dateMetrics.isYesterday
        ? "Điện năng tầng 1 (hôm qua)"
        : `Điện năng tầng 1 (${formatIsoDateVi(selectedRange.startDate)})`;

  const energyStatValue = dateMetrics.hasHistoricalData
    ? `${recordedEnergy.toFixed(1)} kWh`
    : "Chưa có dữ liệu";

  const energyStatDetail = !dateMetrics.hasHistoricalData
    ? "Chưa đủ dữ liệu để so sánh kỳ trước"
    : !dateMetrics.hasPreviousPeriodComparison
      ? `Chưa đủ dữ liệu để so sánh kỳ trước · ${validFloorScopeLabel}`
      : dateMetrics.isToday
        ? `${energyChangePercent > 0 ? "+" : ""}${energyChangePercent.toFixed(1)}% so với hôm qua (${comparisonYesterday.toFixed(1)} kWh) · Phạm vi demo Tầng 1`
        : `${energyChangePercent > 0 ? "+" : ""}${energyChangePercent.toFixed(1)}% so với ngày 07/10/2026 (${comparisonYesterday.toFixed(1)} kWh) · Dữ liệu mẫu ${formatIsoDateVi(selectedRange.startDate)}`;

  const energyPanelTitle = dateMetrics.isToday
    ? "Điện năng tầng 1 ghi nhận hôm nay"
    : dateMetrics.dayCount > 1
      ? `Điện năng tầng 1 (${formatIsoDateVi(selectedRange.startDate)} – ${formatIsoDateVi(selectedRange.endDate)})`
      : `Điện năng tầng 1 ngày ${formatIsoDateVi(selectedRange.startDate)}`;

  const energyScopeNote = dateMetrics.isToday
    ? "Phạm vi vận hành demo: Tầng 1 / 5 tầng — Các tầng 2–5 ngoài phạm vi demo không cộng vào số liệu"
    : `Dữ liệu mẫu Tầng 1 ngày ${formatIsoDateVi(selectedRange.startDate)}`;

  const envAbnormalTone = environment.status === "critical"
    ? "red"
    : environment.areasToReview > 0
      ? "amber"
      : "green";
  const envAbnormalDetail = environment.attentionAreas.length > 0
    ? `${environment.attentionAreas.map((a) => `${a.roomName} (${a.issues.join(", ")})`).join(" · ")}`
    : "Tất cả 8 khu vực Tầng 1 đang trong ngưỡng nhiệt độ, độ ẩm và CO₂ cho phép";

  return (
    <section className="dashboard-page building-overview-page" aria-labelledby="building-overview-title">
      <header className="overview-page-heading">
        <div className="overview-heading-copy">
          <div className="dashboard-breadcrumb">ICS Digital Twin <span>/</span> ICS Headquarters</div>
          <h1 id="building-overview-title">Tổng quan vận hành tòa nhà</h1>
          <p>Phạm vi vận hành demo: Tầng 1 / 5 tầng — Dữ liệu mô phỏng</p>
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
          <OverviewDateFilter
            selectedRange={selectedRange}
            todayIso={todayIso}
            onRangeChange={setSelectedRange}
          />
          <span className="building-coverage-pill">
            <Building2 aria-hidden="true" size={15} /> Phạm vi vận hành demo: Tầng 1 / {floors.length} tầng — Dữ liệu mô phỏng
          </span>
          <BuildingFloorSelector
            buildingId={location.buildingId}
            floorId={location.floorId}
            locations={location.locations}
            onLocationChange={location.onLocationChange}
          />
        </div>
      </header>

      <section className="detail-stat-grid building-overview-stats" aria-label="4 chỉ số KPI chính phạm vi demo">
        <DetailStatCard
          label="Sự cố chưa giải quyết"
          value={String(unresolvedAlerts.length)}
          detail={`${unacknowledgedCount} chưa tiếp nhận · ${acknowledgedCount} đang xử lý (chưa giải quyết) · ${resolvedCount} đã giải quyết`}
          icon={BellRing}
          tone={unresolvedAlerts.some((alert) => alert.severity === "critical") ? "red" : unresolvedAlerts.length ? "amber" : "green"}
        />
        <DetailStatCard
          label="Thiết bị đang kết nối"
          value={`${onlineDeviceCount} / ${knownDeviceCount}`}
          detail={`${offlineDeviceCount} mất kết nối · Tổng thiết bị trong phạm vi demo (Tầng 1)`}
          icon={Activity}
          tone={offlineDeviceCount ? "amber" : "green"}
        />
        <DetailStatCard
          label={energyStatLabel}
          value={energyStatValue}
          detail={energyStatDetail}
          icon={Zap}
          tone="cyan"
        />
        <DetailStatCard
          label="Khu vực có môi trường bất thường"
          value={`${environment.areasToReview} / ${rooms.length}`}
          detail={envAbnormalDetail}
          icon={Wind}
          tone={envAbnormalTone}
        />
      </section>

      <div className="building-command-grid building-command-grid--map-first">
        <section className="overview-panel attention-panel building-attention-panel" aria-labelledby="building-attention-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">ƯU TIÊN XỬ LÝ · PHẠM VI DEMO TẦNG 1</p>
              <h2 id="building-attention-title">Sự cố chưa giải quyết</h2>
              <p className="attention-panel-scope-note">
                Trạng thái hiện tại · Không lọc theo ngày lịch sử ({unacknowledgedCount} chưa tiếp nhận · {acknowledgedCount} đang xử lý · {resolvedCount} đã giải quyết)
              </p>
            </div>
            <span className="attention-total">{unresolvedAlerts.length}</span>
          </header>
          {attentionQueue.length > 0 ? (
            <div className="attention-list building-attention-list">
              {attentionQueue.map((item) => (
                <AlertItem
                  item={item}
                  key={item.id}
                  canAcknowledge={canAck}
                  onAcknowledge={acknowledgeAlert}
                />
              ))}
            </div>
          ) : (
            <p className="building-empty-state">Không có sự cố chưa giải quyết trong phạm vi demo.</p>
          )}
          <ScopedDashboardLink className="building-panel-link" to="/dashboard/incidents">Mở danh sách sự cố <ArrowUpRight aria-hidden="true" size={14} /></ScopedDashboardLink>
        </section>

        <BuildingStackPanel floors={floors} rooms={rooms} alerts={alerts} onSelectFloor={(floorId) => location.onLocationChange(location.buildingId, floorId)} />
      </div>

      <div className="overview-secondary-grid building-overview-secondary-grid">
        <section className="overview-panel energy-panel" aria-labelledby="building-energy-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">NĂNG LƯỢNG · {validFloorScopeLabel.toUpperCase()}</p>
              <h2 id="building-energy-title">{energyPanelTitle}</h2>
            </div>
            <div className="energy-total">
              <strong>{dateMetrics.hasHistoricalData ? `${recordedEnergy.toFixed(1)} kWh` : "Chưa có dữ liệu"}</strong>
              <span>
                {dateMetrics.hasHistoricalData && dateMetrics.hasPreviousPeriodComparison
                  ? `${energyChangePercent > 0 ? "+" : ""}${energyChangePercent.toFixed(1)}%`
                  : "Chưa đủ dữ liệu để so sánh kỳ trước"}
              </span>
            </div>
          </header>
          <Suspense fallback={<div className="energy-chart energy-chart--loading" role="status">Đang tải biểu đồ năng lượng…</div>}>
            <EnergyChart
              data={buildingEnergyChartData}
              source={dateMetrics.isToday ? "current-day" : "dated-sample"}
              sampleDate={dateMetrics.isToday ? undefined : selectedRange.startDate}
              scopeLabel={validFloorScopeLabel}
              scopeNote={energyScopeNote}
            />
          </Suspense>
          <div className="energy-highest-area">
            <span>Khu vực dùng điện cao nhất</span>
            <strong>
              {dateMetrics.hasHistoricalData && highestEnergyArea
                ? `${highestEnergyArea.name}${highestEnergyFloorName ? ` (${highestEnergyFloorName})` : ""} · ${highestEnergyArea.energyConsumption.toFixed(1)} kWh`
                : "Chưa có dữ liệu"}
            </strong>
          </div>
          <p className="building-data-note">
            {dateMetrics.isToday
              ? `Phạm vi vận hành demo: Tầng 1 / ${floors.length} tầng (${comparisonYesterday.toFixed(1)} kWh hôm qua). Các tầng 2–5 ngoài phạm vi demo không cộng vào số liệu vận hành.`
              : dateMetrics.hasHistoricalData
                ? `Dữ liệu mẫu Tầng 1 (${validFloorScopeLabel})${dateMetrics.hasPreviousPeriodComparison ? ` · kỳ trước ${comparisonYesterday.toFixed(1)} kWh` : ""}. Các tầng 2–5 ngoài phạm vi demo không được cộng.`
                : `Chưa có dữ liệu lịch sử năng lượng cho kỳ đã chọn (${dateMetrics.periodLabelVi}).`}
          </p>
          <ScopedDashboardLink className="building-panel-link" to="/dashboard/energy">Chi tiết năng lượng <ArrowUpRight aria-hidden="true" size={14} /></ScopedDashboardLink>
        </section>

        <section className="overview-panel environment-panel building-environment-panel" aria-labelledby="building-environment-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">CHẤT LƯỢNG MÔI TRƯỜNG · TẦNG 1 (PHẠM VI DEMO)</p>
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
            )) : <span className="environment-attention-clear">Không có khu vực vượt ngưỡng trong phạm vi demo.</span>}
          </div>
          <ScopedDashboardLink className="building-panel-link" to="/dashboard/environment">Chi tiết môi trường <ArrowUpRight aria-hidden="true" size={14} /></ScopedDashboardLink>
        </section>
      </div>

      <AssetExceptionsSection
        items={assetExceptions}
        alerts={alerts}
        devices={devices}
        sensors={sensors}
        rooms={rooms}
        floors={floors}
        energyReadings={energyDeviceReadings}
        events={events}
        buildingName={selectedBuilding?.building.name ?? "ICS Headquarters"}
      />

      <p className="building-scope-disclosure">
        <strong>Phạm vi vận hành demo: Tầng 1 / 5 tầng — Dữ liệu mô phỏng.</strong> Các tầng 2–5 hiển thị “Ngoài phạm vi demo” và không được cộng vào tổng thiết bị, sự cố, môi trường, năng lượng hay tài sản.
      </p>
    </section>
  );
}
