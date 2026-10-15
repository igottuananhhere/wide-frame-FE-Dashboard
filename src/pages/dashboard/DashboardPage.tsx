import { lazy, Suspense, useMemo } from "react";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import AlertItem from "../../components/dashboard/AlertItem";
import TableScrollHint from "../../components/common/TableScrollHint";
import ScopedDashboardLink from "../../components/common/ScopedDashboardLink";
import BuildingFloorSelector from "../../components/layout/BuildingFloorSelector";
import AssetExceptionsSection from "../../components/dashboard/AssetExceptionsSection";
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
import { floor1EnergyComparison, floor1HourlyEnergyThresholdConfig } from "../../data/mock/floor1EnergyDetail.mock";
import { floor1MonthlyEnergyForecast } from "../../data/mock/energyForecast.mock";
import { floor2MonthlyEnergyForecast } from "../../data/mock/floor2EnergyDetail.mock";
import { ACTIVE_FLOOR_ID, ALL_BUILDING_SCOPE_ID, BUILDING_LOCATIONS, DEMO_FLOOR_2_ID } from "../../data/mock/buildingLocations";
import BuildingOverviewPage from "./BuildingOverviewPage";
import FloorNoDataState from "../../components/common/FloorNoDataState";
import type { DashboardLocationContextValue } from "../../features/building/types";
import {
  buildAssetExceptions,
  buildAttentionQueue,
  buildEnvironmentSummary,
  buildOverviewKpis,
} from "../../features/twin/twinSelectors";
import { calculateEnergyTotal, calculateEnergyWaste, formatEnergyCostVnd } from "../../features/energy/energySelectors";
import { floor2EnergyComparison } from "../../data/mock/floor2EnergyDetail.mock";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import { formatTelemetryTime, getDataFreshnessPresentation } from "../../features/building/dataFreshness";

const EnergyChart = lazy(() => import("../../components/dashboard/EnergyChart"));

const kpiRoutes: Record<string, string> = {
  "device-health": "/dashboard/devices",
  alerts: "/dashboard/incidents",
  environment: "/dashboard/environment",
  "energy-today": "/dashboard/energy",
  "energy-waste": "/dashboard/energy",
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
  const { location, selectedBuilding, rooms, alerts, devices, sensors, airQualityByRoom, energyDeviceReadings } = scope;
  const events = useTwinStore((state) => state.events);
  const acknowledgeAlert = useTwinStore((state) => state.acknowledgeAlert);
  const floors = selectedBuilding?.floors ?? BUILDING_LOCATIONS[0]?.floors ?? [];
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const lastUpdatedByFloor = useTwinStore((state) => state.lastUpdatedByFloor);
  const energyHistoryByFloor = useTwinStore((state) => state.energyHistoryByFloor);
  const hourlyDeviceReadingsByFloor = useTwinStore((state) => state.hourlyDeviceReadingsByFloor);
  const energyChartSource = floorId === DEMO_FLOOR_2_ID ? "dated-sample" : "current-day";
  const energyChartData = energyHistoryByFloor[floorId] ?? [];
  const hourlyDeviceReadings = hourlyDeviceReadingsByFloor[floorId] ?? [];
  const freshness = getDataFreshnessPresentation(floorId, automaticTelemetryRunning);
  const scopedUpdatedAt = freshness.updatedFloorId
    ? lastUpdatedByFloor[freshness.updatedFloorId]
    : undefined;
  const referenceNow = scopedUpdatedAt ?? lastUpdatedByFloor[ACTIVE_FLOOR_ID] ?? 0;
  const role = useAuthStore((state) => state.role);
  const canAck = canControlDevice(role);
  const environmentReadings = useMemo(
    () => buildAreaEnvironmentReadings(rooms, airQualityByRoom, floor1EnvironmentThresholds),
    [rooms, airQualityByRoom],
  );
  const environment = useMemo(
    () => buildEnvironmentSummary(environmentReadings, floor1EnvironmentThresholds),
    [environmentReadings],
  );
  const energyTotalKwh = calculateEnergyTotal(rooms);
  const baselineDateFormatted = floor1MonthlyEnergyForecast.readingDate.split("-").reverse().join("/");
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
    const hasReliableExcess = waste.excessKwh > 0;

    return [...summary, {
      id: "energy-waste",
      label: "Điện lãng phí (ước tính)",
      value: hasReliableExcess ? `${waste.excessKwh.toFixed(1)} kWh` : "Chưa đủ dữ liệu",
      icon: "energy" as const,
      details: hasReliableExcess
        ? [
            { label: `${formatEnergyCostVnd(waste.estimatedCostVnd)} · mức demo`, tone: "warning" as const },
            { label: `Vượt baseline mẫu ${floor1MonthlyEnergyForecast.baselineTodayKwh.toFixed(1)} kWh · ngày ${baselineDateFormatted}` },
          ]
        : [
            { label: "Tạm tính: 0.0 kWh · 0 VND", tone: "normal" as const },
            { label: `Thiếu baseline theo giờ · Baseline mẫu ${floor1MonthlyEnergyForecast.baselineTodayKwh.toFixed(1)} kWh (${baselineDateFormatted})` },
          ],
    }];
  }, [rooms, alerts, environment, floorId, energyTotalKwh, baselineDateFormatted]);

  const attentionQueue = useMemo(() => buildAttentionQueue(alerts, referenceNow), [alerts, referenceNow]);
  const assetExceptions = useMemo(() => buildAssetExceptions(devices, rooms), [devices, rooms]);
  const highestEnergyArea = [...rooms].sort((first, second) => second.energyConsumption - first.energyConsumption)[0];

  return (
    <section className="dashboard-page overview-page" aria-labelledby="overview-title">
      <header className="overview-page-heading">
        <div className="overview-heading-copy">
          <div className="dashboard-breadcrumb">ICS Digital Twin <span>/</span> {floorName}</div>
          <h1 id="overview-title">Tổng quan vận hành {floorName}</h1>
          {floorId === DEMO_FLOOR_2_ID && (
            <p>Dữ liệu mẫu tĩnh · không cập nhật trực tiếp</p>
          )}
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
          <BuildingFloorSelector
            buildingId={location.buildingId}
            floorId={location.floorId}
            locations={location.locations}
            onLocationChange={location.onLocationChange}
          />
        </div>
      </header>

      <section className={`overview-kpi-grid${overviewKpis.length > 4 ? " overview-kpi-grid--five" : ""}`} aria-label="Chỉ số vận hành chính">
        {overviewKpis.map((item) => <KpiCard item={item} key={item.id} to={kpiRoutes[item.id]} />)}
      </section>

      {canControlDevice(role) && floorId === ACTIVE_FLOOR_ID && <SimulationControlPanel />}

      <div className="overview-primary-grid overview-primary-grid--map-first">
        <section className="overview-panel attention-panel building-attention-panel" aria-labelledby="attention-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">ƯU TIÊN XỬ LÝ · {floorName.toUpperCase()}</p>
              <h2 id="attention-title">Sự cố chưa giải quyết</h2>
            </div>
            <span className="attention-total">{attentionQueue.length}</span>
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
            <p className="building-empty-state">Không có sự cố chưa giải quyết trong phạm vi tầng này.</p>
          )}
          <ScopedDashboardLink className="building-panel-link" to="/dashboard/incidents">
            Mở danh sách sự cố <ArrowUpRight aria-hidden="true" size={14} />
          </ScopedDashboardLink>
        </section>

        {floorId === ACTIVE_FLOOR_ID
          ? <Floor1MapPanel />
          : <FloorRoomStatusTable floorName={floorName} rooms={rooms} />}
      </div>

      <div className="overview-secondary-grid">
        <section className="overview-panel energy-panel" aria-labelledby="energy-title">
          <header className="overview-panel-heading">
            <div>
              <p className="section-eyebrow">TỔNG QUAN NĂNG LƯỢNG · {floorName.toUpperCase()} (kWh TRONG MỖI GIỜ)</p>
              <h2 id="energy-title">Điện năng tiêu thụ theo giờ</h2>
            </div>
          </header>
          <Suspense fallback={<div className="energy-chart energy-chart--loading" role="status">Đang tải biểu đồ năng lượng…</div>}>
            <EnergyChart
              data={energyChartData}
              source={energyChartSource}
              scopeLabel={floorName}
              mode="hourly"
              sampleDate={energyChartSource === "dated-sample" ? floor2MonthlyEnergyForecast.readingDate : undefined}
              snapshotTotalKwh={energyTotalKwh}
              lastUpdatedAt={scopedUpdatedAt}
              isPaused={freshness.mode === "paused"}
              thresholdConfig={floor1HourlyEnergyThresholdConfig}
              hourlyDeviceReadings={hourlyDeviceReadings}
              devices={devices}
              rooms={rooms}
            />
          </Suspense>
          <div className="energy-highest-area">
            <span>Khu vực tiêu thụ cao nhất (lũy kế 00:00–17:00)</span>
            <strong>{highestEnergyArea ? `${highestEnergyArea.name} (${highestEnergyArea.energyConsumption.toFixed(1)} kWh)` : "—"}</strong>
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
        eyebrow={`THIẾT BỊ & BẢO TRÌ · ${floorName.toUpperCase()} (${assetExceptions.length} TÀI SẢN)`}
        footnote={`Danh sách gồm ${assetExceptions.length} thiết bị/tài sản có trạng thái bất thường hoặc cần bảo trì tại ${floorName} (không tính cảm biến TEMP-04 tại Meeting Room 02 vì thiết bị vẫn online bình thường, chỉ chỉ số môi trường CO₂ vượt ngưỡng).`}
      />
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
