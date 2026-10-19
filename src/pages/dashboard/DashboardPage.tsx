import { lazy, Suspense, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import AlertItem from "../../components/dashboard/AlertItem";
import ScopedDashboardLink from "../../components/common/ScopedDashboardLink";
import BuildingFloorSelector from "../../components/layout/BuildingFloorSelector";
import AssetExceptionsSection from "../../components/dashboard/AssetExceptionsSection";
import SimulationControlPanel from "../../components/dashboard/SimulationControlPanel";
import Floor1MapPanel from "../../components/floor/Floor1MapPanel";
import KpiCard from "../../components/dashboard/KpiCard";
import MetricCard from "../../components/dashboard/MetricCard";
import OverviewDateFilter from "../../components/dashboard/OverviewDateFilter";
import {
  type DateFilterRange,
  computeDateFilterMetrics,
  formatIsoDateVi,
  getLocalTodayIso,
} from "../../features/dashboard/dateFilterUtils";
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
  const { location, selectedBuilding, rooms: rawRooms, alerts, devices, sensors, airQualityByRoom, energyDeviceReadings } = scope;
  const events = useTwinStore((state) => state.events);
  const acknowledgeAlert = useTwinStore((state) => state.acknowledgeAlert);
  const floors = selectedBuilding?.floors ?? BUILDING_LOCATIONS[0]?.floors ?? [];
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const lastUpdatedByFloor = useTwinStore((state) => state.lastUpdatedByFloor);
  const energyHistoryByFloor = useTwinStore((state) => state.energyHistoryByFloor);
  const hourlyDeviceReadingsByFloor = useTwinStore((state) => state.hourlyDeviceReadingsByFloor);
  const isFloor2 = floorId === DEMO_FLOOR_2_ID;
  const freshness = getDataFreshnessPresentation(floorId, automaticTelemetryRunning);
  const scopedUpdatedAt = freshness.updatedFloorId
    ? lastUpdatedByFloor[freshness.updatedFloorId]
    : undefined;
  const referenceNow = scopedUpdatedAt ?? lastUpdatedByFloor[ACTIVE_FLOOR_ID] ?? 0;
  const todayIso = useMemo(() => getLocalTodayIso(referenceNow), [referenceNow]);
  const defaultDateIso = isFloor2 ? floor2MonthlyEnergyForecast.readingDate : todayIso;
  const [selectedRangeByFloor, setSelectedRangeByFloor] = useState<Record<string, DateFilterRange>>({});
  const selectedRange = useMemo(
    () =>
      selectedRangeByFloor[floorId] ?? {
        startDate: defaultDateIso,
        endDate: defaultDateIso,
      },
    [selectedRangeByFloor, floorId, defaultDateIso],
  );
  const setSelectedRange = (nextRange: DateFilterRange) => {
    setSelectedRangeByFloor((prev) => ({ ...prev, [floorId]: nextRange }));
  };

  const baseEnergyTotalKwh = useMemo(() => calculateEnergyTotal(rawRooms), [rawRooms]);
  const yesterdayTargetKwh = isFloor2
    ? floor2EnergyComparison.yesterdayKwh
    : floor1EnergyComparison.yesterdayKwh;
  const dateMetrics = useMemo(
    () =>
      computeDateFilterMetrics(selectedRange, todayIso, baseEnergyTotalKwh, yesterdayTargetKwh, {
        scopeFloorId: floorId,
      }),
    [selectedRange, todayIso, baseEnergyTotalKwh, yesterdayTargetKwh, floorId],
  );

  const isFloor2SampleDate =
    isFloor2 &&
    selectedRange.startDate === floor2MonthlyEnergyForecast.readingDate &&
    selectedRange.endDate === floor2MonthlyEnergyForecast.readingDate;
  const isBaselineDate = isFloor2 ? isFloor2SampleDate : dateMetrics.isToday;
  const hasHistoricalData = dateMetrics.hasHistoricalData;
  const energyChartSource = isFloor2 || !dateMetrics.isToday ? "dated-sample" : "current-day";

  const rooms = useMemo(() => {
    if (isBaselineDate || !hasHistoricalData) return rawRooms;
    const scaled = rawRooms.map((room) => ({
      ...room,
      energyConsumption: Number((room.energyConsumption * dateMetrics.energyScale).toFixed(1)),
      temperature: Number((room.temperature + dateMetrics.tempOffset).toFixed(1)),
      humidity: Math.max(30, Math.min(85, room.humidity + dateMetrics.humidityOffset)),
    }));
    if (scaled.length > 0) {
      const targetTotal = Number((baseEnergyTotalKwh * dateMetrics.energyScale).toFixed(1));
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
  }, [rawRooms, isBaselineDate, hasHistoricalData, dateMetrics, baseEnergyTotalKwh]);

  const energyChartData = useMemo(() => {
    if (!hasHistoricalData || !dateMetrics.hasHourlySeries) return [];
    const rawEnergyChartData = energyHistoryByFloor[floorId] ?? [];
    if (isBaselineDate) return rawEnergyChartData;
    return rawEnergyChartData.map((point) => ({
      ...point,
      kwh: Number((point.kwh * dateMetrics.hourlyScale).toFixed(1)),
    }));
  }, [energyHistoryByFloor, floorId, isBaselineDate, hasHistoricalData, dateMetrics]);

  const hourlyDeviceReadings = useMemo(() => {
    if (!hasHistoricalData || !dateMetrics.hasHourlySeries) return [];
    const rawHourlyDeviceReadings = hourlyDeviceReadingsByFloor[floorId] ?? [];
    if (isBaselineDate) return rawHourlyDeviceReadings;
    return rawHourlyDeviceReadings.map((reading) => ({
      ...reading,
      hourlyKwh: Number((reading.hourlyKwh * dateMetrics.hourlyScale).toFixed(2)),
    }));
  }, [hourlyDeviceReadingsByFloor, floorId, isBaselineDate, hasHistoricalData, dateMetrics]);

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
    const comparisonYesterdayKwh = yesterdayTargetKwh * dateMetrics.dayCount;
    const energyLabel = !hasHistoricalData
      ? `Điện năng (${formatIsoDateVi(selectedRange.startDate).slice(0, 5)})`
      : isBaselineDate
        ? isFloor2
          ? "Điện năng mẫu (08/10)"
          : "Điện năng hôm nay"
        : dateMetrics.dayCount > 1
          ? `Điện năng (${dateMetrics.dayCount} ngày)`
          : dateMetrics.isYesterday
            ? "Điện năng hôm qua"
            : `Điện năng (${formatIsoDateVi(selectedRange.startDate).slice(0, 5)})`;

    const summary = buildOverviewKpis(rooms, alerts, environment, comparisonYesterdayKwh, {
      monitoredDeviceCount: devices.length,
      energyLabel,
      hasHistoricalData,
      hasPreviousPeriodComparison: dateMetrics.hasPreviousPeriodComparison,
      comparisonPeriodLabel: dateMetrics.isToday ? "cả ngày hôm qua" : "ngày 07/10/2026",
      energySubNote: isBaselineDate
        ? isFloor2
          ? "Mẫu tĩnh ngày 08/10/2026 (00:00–17:00 · kWh)"
          : "Lũy kế trong ngày (00:00–17:00 · kWh)"
        : `Kỳ chọn: ${dateMetrics.periodLabelVi} · kWh`,
    });

    if (floorId !== ACTIVE_FLOOR_ID) return summary;

    const waste = calculateEnergyWaste(
      energyTotalKwh,
      floor1MonthlyEnergyForecast.baselineTodayKwh * dateMetrics.dayCount,
      floor1MonthlyEnergyForecast.averageRateVndPerKwh,
    );
    const hasReliableExcess = hasHistoricalData && waste.excessKwh > 0;

    return [...summary, {
      id: "energy-waste",
      label: "Điện lãng phí (ước tính)",
      value: hasReliableExcess ? `${waste.excessKwh.toFixed(1)} kWh` : "Chưa đủ dữ liệu",
      icon: "energy" as const,
      details: !hasHistoricalData
        ? [
            { label: "Chưa có dữ liệu điện năng cho ngày đã chọn", tone: "normal" as const },
            { label: `Chưa có bản ghi lịch sử để đối chiếu baseline mẫu` },
          ]
        : hasReliableExcess
          ? [
              { label: `${formatEnergyCostVnd(waste.estimatedCostVnd)} · mức demo`, tone: "warning" as const },
              { label: `Vượt baseline mẫu ${(floor1MonthlyEnergyForecast.baselineTodayKwh * dateMetrics.dayCount).toFixed(1)} kWh · ngày ${baselineDateFormatted}` },
            ]
          : [
              { label: "Tạm tính: 0.0 kWh · 0 VND", tone: "normal" as const },
              { label: `Thiếu baseline theo giờ · Baseline mẫu ${(floor1MonthlyEnergyForecast.baselineTodayKwh * dateMetrics.dayCount).toFixed(1)} kWh (${baselineDateFormatted})` },
            ],
    }];
  }, [rooms, alerts, devices.length, environment, floorId, isFloor2, isBaselineDate, hasHistoricalData, energyTotalKwh, baselineDateFormatted, yesterdayTargetKwh, dateMetrics, selectedRange.startDate]);

  const attentionQueue = useMemo(() => buildAttentionQueue(alerts, referenceNow), [alerts, referenceNow]);
  const assetExceptions = useMemo(() => buildAssetExceptions(devices, rooms), [devices, rooms]);
  const highestEnergyArea = [...rooms].sort((first, second) => second.energyConsumption - first.energyConsumption)[0];

  const assetExceptionsFootnote = isFloor2
    ? `Danh sách gồm ${assetExceptions.length} thiết bị/tài sản có trạng thái bất thường hoặc cần bảo trì tại Floor 2 (dữ liệu mẫu tĩnh ngày 08/10/2026).`
    : `Danh sách gồm ${assetExceptions.length} thiết bị/tài sản có trạng thái bất thường hoặc cần bảo trì tại ${floorName} (không tính cảm biến TEMP-04 tại Meeting Room 02 vì thiết bị vẫn online bình thường, chỉ chỉ số môi trường CO₂ vượt ngưỡng).`;

  return (
    <section className="dashboard-page overview-page" aria-labelledby="overview-title">
      <header className="overview-page-heading">
        <div className="overview-heading-copy">
          <div className="dashboard-breadcrumb">ICS Digital Twin <span>/</span> {floorName}</div>
          <h1 id="overview-title">Tổng quan vận hành {floorName}</h1>
          {isFloor2 && (
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
          <OverviewDateFilter
            selectedRange={selectedRange}
            todayIso={todayIso}
            onRangeChange={setSelectedRange}
          />
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
              <p className="panel-scope-subnote">Trạng thái hiện tại · Không lọc theo ngày lịch sử</p>
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

        <Floor1MapPanel
          floorId={floorId}
          floorName={floorName}
          roomsOverride={rooms}
          isStaticSample={isFloor2 || !dateMetrics.isToday}
          sampleDateLabel={isFloor2 && isFloor2SampleDate ? "00:00–17:00 ngày 08/10/2026" : dateMetrics.periodLabelVi}
          hasHistoricalData={hasHistoricalData}
        />
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
              sampleDate={
                energyChartSource === "dated-sample"
                  ? dateMetrics.effectiveSampleDate ?? selectedRange.startDate
                  : undefined
              }
              snapshotTotalKwh={hasHistoricalData ? energyTotalKwh : undefined}
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
            <strong>
              {hasHistoricalData && highestEnergyArea
                ? `${highestEnergyArea.name} (${highestEnergyArea.energyConsumption.toFixed(1)} kWh)`
                : "Chưa có dữ liệu"}
            </strong>
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
        footnote={assetExceptionsFootnote}
      />
    </section>
  );
}

