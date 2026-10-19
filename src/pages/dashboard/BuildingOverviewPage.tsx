import { lazy, Suspense, useMemo, useState } from "react";
import { Activity, ArrowUpRight, BellRing, Building2, Zap } from "lucide-react";
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
import { ACTIVE_FLOOR_ID, BUILDING_LOCATIONS, DEMO_FLOOR_2_ID } from "../../data/mock/buildingLocations";
import { floor1EnvironmentThresholds } from "../../data/mock/floor1Environment.mock";
import { floor1EnergyComparison } from "../../data/mock/floor1EnergyDetail.mock";
import { floor2EnergyComparison, floor2MonthlyEnergyForecast } from "../../data/mock/floor2EnergyDetail.mock";
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
  const { location, selectedBuilding, dataFloors, rooms: rawRooms, devices, sensors, alerts, airQualityByRoom, energyDeviceReadings } = scope;
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
  const floor1BaseEnergy = useMemo(
    () => rawRooms.filter((r) => r.floorId === ACTIVE_FLOOR_ID).reduce((total, room) => total + room.energyConsumption, 0),
    [rawRooms],
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
          total +
          (floorId === ACTIVE_FLOOR_ID
            ? floor1EnergyComparison.yesterdayKwh
            : floorId === DEMO_FLOOR_2_ID
              ? floor2EnergyComparison.yesterdayKwh
              : 0),
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
    if (dateMetrics.validFloorIds.includes(DEMO_FLOOR_2_ID)) {
      const floor2Series = energyHistoryByFloor[DEMO_FLOOR_2_ID] ?? [];
      if (floor2Series.length === floor1Series.length && floor2Series.length > 0) {
        return floor1Series.map((point, index) => ({
          time: point.time,
          kwh: Number((point.kwh + (floor2Series[index]?.kwh ?? 0)).toFixed(1)),
        }));
      }
      const ratio = floor1BaseEnergy > 0 ? scopedBaseEnergy / floor1BaseEnergy : 1;
      return floor1Series.map((point) => ({
        ...point,
        kwh: Number((point.kwh * ratio).toFixed(1)),
      }));
    }
    return floor1Series.map((point) => ({
      ...point,
      kwh: Number((point.kwh * dateMetrics.hourlyScale).toFixed(1)),
    }));
  }, [energyHistoryByFloor, dateMetrics, floor1BaseEnergy, scopedBaseEnergy]);

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
  const aggregatedDeviceCount = Math.max(0, knownDeviceCount - devices.length);

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
    ? "Điện năng hôm nay (Floor 1)"
    : dateMetrics.dayCount > 1
      ? `Điện năng đã ghi nhận (${dateMetrics.dayCount} ngày)`
      : dateMetrics.isYesterday
        ? "Điện năng đã ghi nhận hôm qua (Floor 1)"
        : `Điện năng ngày ${formatIsoDateVi(selectedRange.startDate)}`;

  const energyStatValue = dateMetrics.hasHistoricalData
    ? `${recordedEnergy.toFixed(1)} kWh`
    : "Chưa có dữ liệu";

  const energyStatDetail = !dateMetrics.hasHistoricalData
    ? "Chưa đủ dữ liệu để so sánh kỳ trước"
    : !dateMetrics.hasPreviousPeriodComparison
      ? `Chưa đủ dữ liệu để so sánh kỳ trước · ${validFloorScopeLabel}`
      : dateMetrics.isToday
        ? `${energyChangePercent > 0 ? "+" : ""}${energyChangePercent.toFixed(1)}% so với hôm qua (${comparisonYesterday.toFixed(1)} kWh) · 1/${floors.length} tầng có dữ liệu hôm nay (Floor 2 là mẫu tĩnh 08/10)`
        : `${energyChangePercent > 0 ? "+" : ""}${energyChangePercent.toFixed(1)}% so với ngày 07/10/2026 (${comparisonYesterday.toFixed(1)} kWh) · ${dateMetrics.validFloorIds.length}/${floors.length} tầng có dữ liệu ngày ${formatIsoDateVi(selectedRange.startDate)}`;

  const energyPanelTitle = dateMetrics.isToday
    ? "Điện năng ghi nhận hôm nay"
    : dateMetrics.dayCount > 1
      ? `Điện năng ghi nhận (${formatIsoDateVi(selectedRange.startDate)} – ${formatIsoDateVi(selectedRange.endDate)})`
      : `Điện năng ghi nhận ngày ${formatIsoDateVi(selectedRange.startDate)}`;

  const energyScopeNote = dateMetrics.isToday
    ? `Floor 2 · dữ liệu mẫu tĩnh ngày ${floor2MonthlyEnergyForecast.readingDate.split("-").reverse().join("/")} không gộp vào xu hướng hôm nay`
    : dateMetrics.isStaticSampleDate
      ? "Tổng hợp cùng ngày mẫu 08/10/2026 của Floor 1 (125.6 kWh) và Floor 2 (141.0 kWh)"
      : `Phạm vi dữ liệu năng lượng: ${validFloorScopeLabel}`;

  return (
    <section className="dashboard-page building-overview-page" aria-labelledby="building-overview-title">
      <header className="overview-page-heading">
        <div className="overview-heading-copy">
          <div className="dashboard-breadcrumb">ICS Digital Twin <span>/</span> ICS Headquarters</div>
          <h1 id="building-overview-title">Tổng quan vận hành tòa nhà</h1>
          <p>Toàn cảnh tình trạng vận hành và các điểm cần xử lý trong tòa nhà</p>
        </div>
        <div className="overview-heading-actions">
          {freshness.mode !== "mixed" && (
            <span className={`overview-live overview-live--${freshness.mode}`} role="status" aria-label={freshness.ariaLabel}>
              <i aria-hidden="true" /> {freshness.label}
            </span>
          )}
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
          <span className="building-coverage-pill"><Building2 aria-hidden="true" size={15} /> {dataFloors.length}/{floors.length} tầng có dữ liệu</span>
          <BuildingFloorSelector
            buildingId={location.buildingId}
            floorId={location.floorId}
            locations={location.locations}
            onLocationChange={location.onLocationChange}
          />
        </div>
      </header>

      <section className="detail-stat-grid building-overview-stats" aria-label="Tóm tắt dữ liệu vận hành đang có">
        <DetailStatCard label="Tầng có dữ liệu" value={`${dataFloors.length} / ${floors.length}`} detail="Floor 1 (mô phỏng hôm nay · 4 CAM) + Floor 2 (mẫu tĩnh 08/10/2026 · 2 CAM)" icon={Building2} tone="cyan" />
        <DetailStatCard label="Thiết bị đã ghi nhận" value={`${onlineDeviceCount} / ${knownDeviceCount}`} detail={`${offlineDeviceCount} offline · ${devices.length} định danh riêng (gồm 6/12 camera toàn tòa) + ${aggregatedDeviceCount} gộp theo phòng`} icon={Activity} tone={offlineDeviceCount ? "amber" : "green"} />
        <DetailStatCard label="Sự cố chưa giải quyết" value={String(unresolvedAlerts.length)} detail={`${unacknowledgedCount} chưa tiếp nhận · ${acknowledgedCount} đang xử lý (chưa giải quyết) · ${resolvedCount} đã giải quyết`} icon={BellRing} tone={unresolvedAlerts.some((alert) => alert.severity === "critical") ? "red" : unresolvedAlerts.length ? "amber" : "green"} />
        <DetailStatCard label={energyStatLabel} value={energyStatValue} detail={energyStatDetail} icon={Zap} tone="cyan" />
      </section>

      <div className="building-command-grid building-command-grid--map-first">
        <section className="overview-panel attention-panel building-attention-panel" aria-labelledby="building-attention-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">ƯU TIÊN XỬ LÝ · CÁC TẦNG CÓ DỮ LIỆU</p>
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
              ? `Đang tính 1/${floors.length} tầng có dữ liệu hôm nay (Floor 1 · ${comparisonYesterday.toFixed(1)} kWh hôm qua). Floor 2 (mẫu tĩnh 08/10/2026) và Floors 3–5 chưa cấu hình không được gộp vào hôm nay.`
              : dateMetrics.hasHistoricalData
                ? `Đang tổng hợp ${dateMetrics.validFloorIds.length}/${floors.length} tầng có dữ liệu (${validFloorScopeLabel})${dateMetrics.hasPreviousPeriodComparison ? ` · kỳ trước ${comparisonYesterday.toFixed(1)} kWh` : ""}. Floors chưa có dữ liệu ngày này không được tính.`
                : `Chưa có bản ghi lịch sử năng lượng cho kỳ đã chọn (${dateMetrics.periodLabelVi}).`}
          </p>
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

      <p className="building-scope-disclosure">Phạm vi tổng hợp: <strong>{dataFloors.map((floor) => floor.name).join(" + ")} · dữ liệu mô phỏng</strong>. Floors chưa có telemetry được hiển thị trong sơ đồ nhưng không được cộng vào tổng vận hành.</p>
    </section>
  );
}

