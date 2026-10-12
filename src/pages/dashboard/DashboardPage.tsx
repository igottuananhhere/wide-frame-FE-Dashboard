import { lazy, Suspense, useMemo } from "react";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import AlertItem from "../../components/dashboard/AlertItem";
import TableScrollHint from "../../components/common/TableScrollHint";
import ScopedDashboardLink from "../../components/common/ScopedDashboardLink";
import AssetExceptionTable from "../../components/dashboard/AssetExceptionTable";
import SimulationControlPanel from "../../components/dashboard/SimulationControlPanel";
import Floor1MapPanel from "../../components/floor/Floor1MapPanel";
import KpiCard from "../../components/dashboard/KpiCard";
import MetricCard from "../../components/dashboard/MetricCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { useTwinStore } from "../../features/twin/twinStore";
import { useAuthStore } from "../../features/auth/authStore";
import { canControlDevice } from "../../features/auth/permissions";
import { buildAreaEnvironmentReadings } from "../../features/environment/environmentSelectors";
import { floor1EnvironmentThresholds } from "../../data/mock/floor1Environment.mock";
import { floor1EnergyComparison } from "../../data/mock/floor1EnergyDetail.mock";
import { floor1MonthlyEnergyForecast } from "../../data/mock/energyForecast.mock";
import { floor2MonthlyEnergyForecast } from "../../data/mock/floor2EnergyDetail.mock";
import { ACTIVE_FLOOR_ID, ALL_BUILDING_SCOPE_ID, DEMO_FLOOR_2_ID } from "../../data/mock/buildingLocations";
import BuildingOverviewPage from "./BuildingOverviewPage";
import FloorNoDataState from "../../components/common/FloorNoDataState";
import type { DashboardLocationContextValue } from "../../features/building/types";
import { buildAssetExceptions, buildAttentionQueue, buildEnvironmentSummary, buildOverviewKpis } from "../../features/twin/twinSelectors";
import { calculateEnergyTotal, calculateEnergyWaste, formatEnergyCostVnd } from "../../features/energy/energySelectors";
import { floor2EnergyComparison } from "../../data/mock/floor2EnergyDetail.mock";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import { formatTelemetryTime, getDataFreshnessPresentation } from "../../features/building/dataFreshness";

const EnergyChart = lazy(() => import("../../components/dashboard/EnergyChart"));

const kpiRoutes: Record<string, string> = {
  "energy-today": "/dashboard/energy",
  "energy-waste": "/dashboard/energy",
  "device-health": "/dashboard/devices",
  environment: "/dashboard/environment",
  alerts: "/dashboard/incidents",
};

export default function DashboardPage() {
  const location = useOutletContext<DashboardLocationContextValue>();
  const selectedFloor = location.locations
    .find((item) => item.building.id === location.buildingId)?.floors
    .find((floor) => floor.id === location.floorId);

  if (location.floorId === ALL_BUILDING_SCOPE_ID) return <BuildingOverviewPage />;
  if (selectedFloor?.dataAvailability !== "simulation") {
    return (
      <FloorNoDataState
        floorName={selectedFloor?.name ?? "Tầng đã chọn"}
        onBackToBuilding={() => location.onLocationChange(location.buildingId, ALL_BUILDING_SCOPE_ID)}
      />
    );
  }
  return <FloorOverviewPage floorId={selectedFloor.id} floorName={selectedFloor.name} />;
}

function FloorOverviewPage({ floorId, floorName }: { floorId: string; floorName: string }) {
  const scope = useDashboardScopeData();
  const { rooms, alerts, devices, airQualityByRoom } = scope;
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const lastUpdatedByFloor = useTwinStore((state) => state.lastUpdatedByFloor);
  const energyHistoryByFloor = useTwinStore((state) => state.energyHistoryByFloor);
  const energyChartSource = floorId === DEMO_FLOOR_2_ID ? "dated-sample" : "current-day";
  const energyChartData = energyHistoryByFloor[floorId] ?? [];
  const freshness = getDataFreshnessPresentation(floorId, automaticTelemetryRunning);
  const scopedUpdatedAt = freshness.updatedFloorId
    ? lastUpdatedByFloor[freshness.updatedFloorId]
    : undefined;
  const role = useAuthStore((state) => state.role);
  const environmentReadings = useMemo(
    () => buildAreaEnvironmentReadings(rooms, airQualityByRoom, floor1EnvironmentThresholds),
    [rooms, airQualityByRoom],
  );
  const environment = useMemo(
    () => buildEnvironmentSummary(environmentReadings, floor1EnvironmentThresholds),
    [environmentReadings],
  );
  const energyTotalKwh = calculateEnergyTotal(rooms);
  const overviewKpis = useMemo(() => {
    const summary = buildOverviewKpis(rooms, alerts, environment, floorId === DEMO_FLOOR_2_ID
      ? floor2EnergyComparison.yesterdayKwh
      : floor1EnergyComparison.yesterdayKwh);
    if (floorId !== ACTIVE_FLOOR_ID) return summary;

    const waste = calculateEnergyWaste(
      energyTotalKwh,
      floor1MonthlyEnergyForecast.baselineTodayKwh,
      floor1MonthlyEnergyForecast.averageRateVndPerKwh,
    );
    return [...summary, {
      id: "energy-waste",
      label: "Điện lãng phí (ước tính)",
      value: `${waste.excessKwh.toFixed(1)} kWh`,
      icon: "energy" as const,
      details: [
        { label: `${formatEnergyCostVnd(waste.estimatedCostVnd)} · mức demo`, tone: waste.excessKwh > 0 ? "warning" as const : "online" as const },
        { label: `Baseline mẫu ${floor1MonthlyEnergyForecast.baselineTodayKwh.toFixed(1)} kWh · ${floor1MonthlyEnergyForecast.readingDate.split("-").reverse().join("/")}` },
      ],
    }];
  }, [rooms, alerts, environment, floorId, energyTotalKwh]);
  const attentionQueue = useMemo(() => buildAttentionQueue(alerts), [alerts]);
  const assetExceptions = useMemo(() => buildAssetExceptions(devices, rooms), [devices, rooms]);
  const energyTotal = `${energyTotalKwh.toFixed(1)} kWh`;
  const yesterdayEnergy = floorId === DEMO_FLOOR_2_ID
    ? floor2EnergyComparison.yesterdayKwh
    : floor1EnergyComparison.yesterdayKwh;
  const energyChangePercent = ((energyTotalKwh / yesterdayEnergy) - 1) * 100;
  const highestEnergyArea = [...rooms].sort((first, second) => second.energyConsumption - first.energyConsumption)[0];

  return (
    <section className="dashboard-page overview-page" aria-labelledby="overview-title">
      <header className="overview-page-heading">
        <div className="overview-heading-copy">
          <div className="dashboard-breadcrumb">ICS Digital Twin <span>/</span> {floorName}</div>
          <h1 id="overview-title">Tổng quan vận hành {floorName}</h1>
          <p>{floorId === DEMO_FLOOR_2_ID ? "Dữ liệu mẫu tĩnh · không cập nhật trực tiếp" : "Trạng thái khu vực và thiết bị · dữ liệu mô phỏng"}</p>
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
          <span className="overview-period"><CalendarDays aria-hidden="true" size={15} /> Hôm nay</span>
          <a
            className="digital-twin-action"
            href="https://warm-dodol-8b85a2.netlify.app/index.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở Digital Twin 3D <ArrowUpRight aria-hidden="true" size={16} />
          </a>
        </div>
      </header>

      <section className={`overview-kpi-grid${overviewKpis.length > 4 ? " overview-kpi-grid--five" : ""}`} aria-label="Chỉ số vận hành chính">
        {overviewKpis.map((item) => <KpiCard item={item} key={item.id} to={kpiRoutes[item.id]} />)}
      </section>

      {canControlDevice(role) && floorId === ACTIVE_FLOOR_ID && <SimulationControlPanel />}

      <div className="overview-primary-grid overview-primary-grid--map-first">
        <section className="overview-panel attention-panel" aria-labelledby="attention-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">ƯU TIÊN XỬ LÝ</p>
              <h2 id="attention-title">Sự cố chưa giải quyết</h2>
            </div>
            <span className="attention-total">{attentionQueue.length}</span>
          </header>
          <div className="attention-list">
            {attentionQueue.map((item) => <AlertItem item={item} key={item.id} />)}
          </div>
        </section>

        {floorId === ACTIVE_FLOOR_ID
          ? <Floor1MapPanel />
          : <FloorRoomStatusTable floorName={floorName} rooms={rooms} />}
      </div>

      <div className="overview-secondary-grid">
        <section className="overview-panel energy-panel" aria-labelledby="energy-title">
          <header className="overview-panel-heading">
            <div>
            <p className="section-eyebrow">ĐIỆN NĂNG LŨY KẾ · kWh</p>
              <h2 id="energy-title">Tổng quan năng lượng</h2>
            </div>
            <div className="energy-total">
              <strong>{energyTotal}</strong>
              <span>{energyChangePercent > 0 ? "+" : ""}{energyChangePercent.toFixed(1)}%</span>
            </div>
          </header>
          <Suspense fallback={<div className="energy-chart energy-chart--loading" role="status">Đang tải biểu đồ năng lượng…</div>}>
            <EnergyChart
              data={energyChartData}
              source={energyChartSource}
              scopeLabel={floorName}
              sampleDate={energyChartSource === "dated-sample" ? floor2MonthlyEnergyForecast.readingDate : undefined}
            />
          </Suspense>
          <div className="energy-highest-area">
            <span>Khu vực tiêu thụ cao nhất</span>
            <strong>{highestEnergyArea?.name ?? "—"}</strong>
          </div>
        </section>

        <section className="overview-panel environment-panel" aria-labelledby="environment-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">CHẤT LƯỢNG MÔI TRƯỜNG · {floorName.toUpperCase()}</p>
              <h2 id="environment-title">Môi trường</h2>
            </div>
            <StatusBadge status={environment.status} label={environment.overall} />
          </header>
          <div className="environment-metric-grid">
            {environment.metrics.map((metric) => <MetricCard metric={metric} key={metric.id} />)}
          </div>
          <div className="environment-attention" aria-label="Khu vực môi trường vượt ngưỡng">
            <div className="environment-attention-heading">
              <span aria-hidden="true" />
              <strong>{environment.areasToReview} khu vực vượt ngưỡng môi trường</strong>
            </div>
            {environment.attentionAreas.length > 0 ? environment.attentionAreas.slice(0, 2).map((area) => (
              <ScopedDashboardLink className="environment-attention-link" key={area.roomId} to={`/dashboard/environment?roomId=${encodeURIComponent(area.roomId)}`}>
                <strong>{area.roomName}</strong>
                <span>{area.issues.join(" · ")}</span>
              </ScopedDashboardLink>
            )) : <span className="environment-attention-clear">Tất cả chỉ số đang trong ngưỡng</span>}
          </div>
        </section>
      </div>

      <section className="overview-panel asset-exceptions-panel" aria-labelledby="asset-exceptions-title">
        <header className="overview-panel-heading">
          <div>
            <p className="section-eyebrow">THIẾT BỊ & BẢO TRÌ · {floorName.toUpperCase()}</p>
            <h2 id="asset-exceptions-title">Tài sản cần xử lý</h2>
          </div>
          <ScopedDashboardLink className="panel-text-link" to="/dashboard/assets">Tất cả tài sản <ArrowUpRight aria-hidden="true" size={14} /></ScopedDashboardLink>
        </header>
        <AssetExceptionTable items={assetExceptions} />
      </section>
    </section>
  );
}

function FloorRoomStatusTable({ floorName, rooms }: { floorName: string; rooms: readonly FloorRoomSnapshot[] }) {
  const statusLabels = { normal: "Bình thường", warning: "Cần chú ý", critical: "Critical", offline: "Offline" } as const;

  return (
    <section className="overview-panel floor-status-panel floor-room-status-panel floor-room-status-table" aria-labelledby="floor-room-status-title">
      <header className="overview-panel-heading">
        <div>
          <p className="section-eyebrow">ROOM STATUS · {floorName.toUpperCase()} · SIMULATION</p>
          <h2 id="floor-room-status-title">Tình trạng theo khu vực</h2>
        </div>
        <span className="detail-panel-tag">{rooms.length} KHU VỰC</span>
      </header>
      <div className="detail-table-scroll" role="region" aria-label={`Room status for ${floorName}; horizontal scroll to see all columns`} tabIndex={0}>
        <table className="detail-data-table" aria-label={`Room status for ${floorName}`}>
          <thead><tr><th>Khu vực</th><th>Trạng thái</th><th>Nhiệt độ</th><th>Độ ẩm</th><th>Điện năng</th><th>Thiết bị</th></tr></thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <th scope="row">{room.name}</th>
                <td><StatusBadge status={room.status} label={statusLabels[room.status]} /></td>
                <td>{room.temperature.toFixed(1)}°C</td>
                <td>{room.humidity}%</td>
                <td>{room.energyConsumption.toFixed(1)} kWh</td>
                <td>{room.onlineDeviceCount}/{room.deviceCount} online</td>
              </tr>
            ))}
          </tbody>
        </table>
        <TableScrollHint />
      </div>
      <p className="detail-panel-footnote">Dữ liệu {floorName} là bộ mẫu được tạo để minh họa cách theo dõi tầng riêng; chưa lấy từ thiết bị thật.</p>
    </section>
  );
}
