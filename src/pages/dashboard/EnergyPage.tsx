import { lazy, Suspense, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Link2,
  Zap,
} from "lucide-react";
import FloorNoDataState from "../../components/common/FloorNoDataState";
import ModulePageHeader from "../../components/common/ModulePageHeader";
import ScopedDashboardLink from "../../components/common/ScopedDashboardLink";
import TableScrollHint from "../../components/common/TableScrollHint";
import DetailStatCard from "../../components/dashboard/DetailStatCard";
import EnergyForecastCard from "../../components/dashboard/EnergyForecastCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import {
  ACTIVE_FLOOR_ID,
  ALL_BUILDING_SCOPE_ID,
  BUILDING_LOCATIONS,
} from "../../data/mock/buildingLocations";
import {
  floor1AbnormalAreaThresholdKwh,
  floor1HourlyEnergyThresholdConfig,
} from "../../data/mock/floor1EnergyDetail.mock";
import {
  floor2AbnormalAreaThresholdKwh,
  floor2MonthlyEnergyForecast,
} from "../../data/mock/floor2EnergyDetail.mock";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import { formatEnergyCostVnd } from "../../features/energy/energySelectors";
import {
  AREA_THRESHOLDS_BY_FLOOR,
  buildUnifiedEnergyWorkspaceModel,
} from "../../features/energy/energyWorkspaceModel";
import { useTwinStore } from "../../features/twin/twinStore";

const EnergyChart = lazy(() => import("../../components/dashboard/EnergyChart"));

export default function EnergyPage() {
  const scope = useDashboardScopeData();
  const {
    location,
    selectedBuilding,
    selectedFloor,
    dataFloors,
    floorIds,
    isBuildingScope,
    scopeLabel,
    rooms,
    devices,
    energyDeviceReadings,
  } = scope;

  const allRoomsInStore = useTwinStore((state) => state.rooms);
  const energyHistoryByFloor = useTwinStore((state) => state.energyHistoryByFloor);
  const hourlyDeviceReadingsByFloor = useTwinStore((state) => state.hourlyDeviceReadingsByFloor);
  const lastUpdatedByFloor = useTwinStore((state) => state.lastUpdatedByFloor);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);

  const [chartMode, setChartMode] = useState<"hourly" | "cumulative">("hourly");
  const [compareYesterday, setCompareYesterday] = useState<boolean>(false);

  const workspace = useMemo(() => {
    const allBuildingFloors =
      selectedBuilding?.floors ?? BUILDING_LOCATIONS[0]?.floors ?? [];
    return buildUnifiedEnergyWorkspaceModel({
      isBuildingScope,
      scopeLabel,
      selectedFloorId: location.floorId,
      allBuildingFloors,
      configuredFloors: dataFloors,
      scopedFloorIds: floorIds,
      allRoomsInStore,
      scopedRooms: rooms,
      scopedDevices: devices,
      scopedDeviceReadings: energyDeviceReadings,
      energyHistoryByFloor,
      lastUpdatedByFloor,
      automaticTelemetryRunning,
    });
  }, [
    selectedBuilding,
    isBuildingScope,
    scopeLabel,
    location.floorId,
    dataFloors,
    floorIds,
    allRoomsInStore,
    rooms,
    devices,
    energyDeviceReadings,
    energyHistoryByFloor,
    lastUpdatedByFloor,
    automaticTelemetryRunning,
  ]);

  // If user selected an unconfigured floor (e.g., Floor 3, 4, 5), show clear no-data state instead of 0 kWh
  if (!isBuildingScope && selectedFloor?.dataAvailability !== "simulation") {
    return (
      <FloorNoDataState
        floorName={selectedFloor?.name ?? "Tầng đã chọn"}
        onBackToBuilding={() =>
          location.onLocationChange(location.buildingId, ALL_BUILDING_SCOPE_ID)
        }
      />
    );
  }

  const scopeTitle = isBuildingScope
    ? "Năng lượng toàn tòa nhà"
    : `Năng lượng ${scopeLabel}`;
  const highestArea = workspace.areaRows[0];
  const maximumAreaKwh = Math.max(
    ...workspace.areaRows.map((area) => area.energyKwh),
    1,
  );
  const totalAbnormalCount =
    workspace.abnormalAreaCount + workspace.abnormalDeviceCount;
  const scopedUpdatedAt = lastUpdatedByFloor[ACTIVE_FLOOR_ID];
  const hourlyDeviceReadings =
    hourlyDeviceReadingsByFloor[workspace.energyChartFloorId] ?? [];

  return (
    <section
      className="dashboard-page detail-module-page energy-module-page"
      aria-labelledby="module-page-title"
    >
      {/* 1. Phạm vi và trạng thái dữ liệu */}
      <ModulePageHeader
        section="MONITORING / ENERGY"
        title={scopeTitle}
        description={`Mức tiêu thụ điện năng theo thời gian, tầng, khu vực và thiết bị · ${workspace.coverageBadgeLabel}.`}
        scopeLabel={scopeLabel}
      />

      {/* 2. KPI */}
      <section
        className="detail-stat-grid detail-stat-grid--energy-waste"
        aria-label="Energy summary"
      >
        <DetailStatCard
          label="Điện năng hôm nay"
          value={`${workspace.energyTodayKwh.toFixed(1)} kWh`}
          detail={
            isBuildingScope
              ? `${workspace.coverageBadgeLabel} · Đối soát theo khu vực`
              : `Tổng theo ${workspace.areaRows.length} khu vực · ${scopeLabel}`
          }
          icon={Zap}
        />
        <DetailStatCard
          label="So với hôm qua"
          value={workspace.yesterdayComparison.primaryValueLabel}
          detail={workspace.yesterdayComparison.detailLabel}
          icon={
            !workspace.yesterdayComparison.isComparable
              ? Activity
              : (workspace.yesterdayComparison.changePercent ?? 0) >= 0
                ? ArrowUpRight
                : ArrowDownRight
          }
          tone={
            !workspace.yesterdayComparison.isComparable
              ? "cyan"
              : (workspace.yesterdayComparison.changePercent ?? 0) > 0
                ? "amber"
                : "green"
          }
        />
        <DetailStatCard
          label="Khu vực tiêu thụ cao nhất"
          value={highestArea?.name ?? "—"}
          detail={
            highestArea
              ? `${highestArea.energyKwh.toFixed(1)} kWh hôm nay · ${highestArea.floorName ?? scopeLabel}`
              : "0.0 kWh hôm nay"
          }
          icon={Activity}
        />
        <DetailStatCard
          label="Vượt ngưỡng tiêu thụ"
          value={String(totalAbnormalCount)}
          detail={`${workspace.correlatedAlerts.length} cụm cảnh báo (${workspace.abnormalAreaCount} khu vực, ${workspace.abnormalDeviceCount} thiết bị thuộc khu vực)`}
          icon={AlertTriangle}
          tone={totalAbnormalCount > 0 ? "amber" : "green"}
        />
        {workspace.wasteStatus.isAvailable && workspace.wasteStatus.estimate ? (
          <DetailStatCard
            label={workspace.wasteStatus.cardLabel}
            value={`${workspace.wasteStatus.estimate.excessKwh.toFixed(1)} kWh`}
            detail={`${formatEnergyCostVnd(workspace.wasteStatus.estimate.estimatedCostVnd)} · ${workspace.wasteStatus.rateVndPerKwh.toLocaleString("vi-VN")} VND/kWh · baseline mẫu ${(workspace.wasteStatus.baselineKwh ?? 0).toFixed(1)} kWh (${workspace.wasteStatus.baselineDateFormatted})`}
            icon={AlertTriangle}
            tone={workspace.wasteStatus.estimate.excessKwh > 0 ? "amber" : "green"}
          />
        ) : (
          <DetailStatCard
            label={workspace.wasteStatus.cardLabel}
            value={workspace.wasteStatus.unavailableValueLabel}
            detail={workspace.wasteStatus.unavailableDetailLabel}
            icon={AlertTriangle}
            tone="cyan"
          />
        )}
      </section>

      {/* 3. Biểu đồ tiêu thụ */}
      <section
        className="detail-panel energy-trend-panel"
        aria-labelledby="energy-trend-title"
      >
        <header className="detail-panel-header energy-trend-header">
          <div>
            <p className="section-eyebrow">
              {chartMode === "hourly"
                ? "TREND · ĐIỆN NĂNG THEO TỪNG GIỜ (kWh/GIỜ · ĐÃ GHI NHẬN)"
                : "TREND · ĐIỆN NĂNG LŨY KẾ (kWh · ĐÃ GHI NHẬN)"}
            </p>
            <h2 id="energy-trend-title">
              {chartMode === "hourly"
                ? "Biểu đồ điện năng tiêu thụ theo từng giờ"
                : "Xu hướng điện năng lũy kế"}
            </h2>
          </div>
          <div className="energy-chart-controls">
            <div
              className="energy-chart-mode-toggle"
              role="group"
              aria-label="Chế độ hiển thị biểu đồ điện năng"
            >
              <button
                type="button"
                className={`energy-chart-mode-btn${chartMode === "hourly" ? " is-active" : ""}`}
                aria-pressed={chartMode === "hourly"}
                onClick={() => setChartMode("hourly")}
              >
                Theo giờ (kWh/giờ)
              </button>
              <button
                type="button"
                className={`energy-chart-mode-btn${chartMode === "cumulative" ? " is-active" : ""}`}
                aria-pressed={chartMode === "cumulative"}
                onClick={() => setChartMode("cumulative")}
              >
                Lũy kế (kWh)
              </button>
            </div>
            <button
              type="button"
              className={`energy-chart-compare-btn${compareYesterday ? " is-active" : ""}`}
              aria-pressed={compareYesterday}
              onClick={() => setCompareYesterday((prev) => !prev)}
            >
              So sánh cùng giờ hôm qua
            </button>
            <span className="detail-panel-tag">
              {workspace.energyChartSource === "dated-sample"
                ? `MẪU TĨNH · ${floor2MonthlyEnergyForecast.readingDate.split("-").reverse().join("/")}`
                : isBuildingScope
                  ? "FLOOR 1 · ĐÃ GHI NHẬN HÔM NAY"
                  : "ĐÃ GHI NHẬN HÔM NAY"}
            </span>
          </div>
        </header>
        <Suspense
          fallback={
            <div className="energy-chart-loading" role="status">
              Đang tải biểu đồ…
            </div>
          }
        >
          <EnergyChart
            data={workspace.energyChartPoints}
            source={workspace.energyChartSource}
            scopeLabel={workspace.energyChartScopeLabel}
            mode={chartMode}
            sampleDate={
              workspace.energyChartSource === "dated-sample"
                ? floor2MonthlyEnergyForecast.readingDate
                : undefined
            }
            scopeNote={workspace.energyChartScopeNote}
            snapshotTotalKwh={workspace.energyTodayKwh}
            lastUpdatedAt={scopedUpdatedAt}
            isPaused={workspace.isPaused}
            thresholdConfig={floor1HourlyEnergyThresholdConfig}
            hourlyDeviceReadings={hourlyDeviceReadings}
            devices={devices}
            rooms={rooms}
            yesterdayData={workspace.yesterdayComparison.yesterdaySeries}
            compareYesterday={compareYesterday}
            showCaptionInHourlyMode={true}
            includeCumulativeInAriaLabel={true}
          />
        </Suspense>
      </section>

      {/* 4. Cảnh báo vượt ngưỡng */}
      <section
        className="detail-panel energy-exceptions-panel"
        aria-labelledby="energy-exceptions-title"
      >
        <header className="detail-panel-header">
          <div>
            <p className="section-eyebrow">ATTENTION · CẢNH BÁO VƯỢT NGƯỠNG CÓ LIÊN KẾT</p>
            <h2 id="energy-exceptions-title">Tiêu thụ bất thường</h2>
          </div>
          <StatusBadge
            status={totalAbnormalCount > 0 ? "warning" : "normal"}
            label={`${workspace.correlatedAlerts.length} cụm (${totalAbnormalCount} mục)`}
          />
        </header>

        {workspace.correlatedAlerts.length > 0 ? (
          <ul
            className={`energy-exception-list${
              workspace.correlatedAlerts.length > 2 ? " is-scrollable" : ""
            }`}
          >
            {workspace.correlatedAlerts.map((group) => (
              <li key={group.id} className="energy-correlated-alert-item">
                <div className="energy-correlated-alert-main">
                  <span className="energy-exception-symbol">
                    <AlertTriangle aria-hidden="true" size={15} />
                  </span>
                  <div className="energy-correlated-alert-body">
                    <div className="energy-correlated-alert-title">
                      <strong>{group.roomName}</strong>
                      <span className="energy-alert-location-tag">{group.floorName}</span>
                      {group.isCorrelatedAreaAndDevice && (
                        <span className="energy-correlated-badge">
                          <Link2 size={11} aria-hidden="true" /> Khu vực & thiết bị có liên hệ
                        </span>
                      )}
                    </div>
                    <span className="energy-correlated-metrics">
                      Khu vực: <strong>{group.areaEnergyKwh.toFixed(1)} kWh</strong> · ngưỡng{" "}
                      {group.areaThresholdKwh} kWh/ngày (vượt{" "}
                      <strong>+{group.areaExcessKwh.toFixed(1)} kWh</strong>)
                    </span>
                    {group.relatedDevices.map((dev) => (
                      <div key={dev.deviceId} className="energy-correlated-device-sub">
                        <Zap aria-hidden="true" size={13} />
                        <span>
                          Thiết bị thuộc {group.roomName}: <strong>{dev.deviceName}</strong> ({dev.deviceType}) ·{" "}
                          <strong>{dev.energyKwh.toFixed(1)} kWh</strong> · ngưỡng {dev.thresholdKwh} kWh (vượt{" "}
                          <strong>+{dev.excessKwh.toFixed(1)} kWh</strong> · chiếm {dev.shareOfRoomPercent}% khu vực)
                        </span>
                      </div>
                    ))}
                    <p className="energy-correlated-explanation">{group.relationshipSummary}</p>
                  </div>
                </div>
                <div className="energy-correlated-actions">
                  <StatusBadge status="warning" label="Cao" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="detail-empty-state">Không có mức tiêu thụ vượt ngưỡng.</p>
        )}
        <p className="detail-panel-footnote">
          Ngưỡng cảnh báo khu vực: Floor 1 · {floor1AbnormalAreaThresholdKwh} kWh/ngày; Floor 2 ·{" "}
          {floor2AbnormalAreaThresholdKwh} kWh/ngày. Điện năng thiết bị là thành phần nằm trong khu vực, không cộng trùng vào tổng khu vực.
        </p>
      </section>

      {/* 5. Khu vực và thiết bị */}
      <div className="detail-two-column-grid energy-area-device-grid">
        <section className="detail-panel" aria-labelledby="energy-area-title">
          <header className="detail-panel-header">
            <div>
              <p className="section-eyebrow">AREA BREAKDOWN · ĐỐI SOÁT TỔNG TẦNG</p>
              <h2 id="energy-area-title">Điện năng theo khu vực</h2>
            </div>
            <span className="detail-unit-note">
              Tổng: {workspace.reconciliation.allocatedAreaKwh.toFixed(1)} kWh
            </span>
          </header>
          <div className="energy-area-list">
            {workspace.areaRows.map((area, index) => (
              <div className="energy-area-row" key={area.roomId}>
                <div className="energy-area-row-heading">
                  <span className="energy-area-rank">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="energy-area-name">
                    {area.name}
                    {isBuildingScope && area.floorName && (
                      <small className="energy-area-floor-pill">{area.floorName}</small>
                    )}
                  </span>
                  <strong>
                    {area.energyKwh.toFixed(1)} <small>kWh</small>
                  </strong>
                </div>
                <div
                  className="energy-area-track"
                  aria-label={`${area.name}: ${area.energyKwh.toFixed(1)} kWh`}
                >
                  <span
                    className={area.abnormal ? "is-abnormal" : ""}
                    style={{
                      width: `${(area.energyKwh / maximumAreaKwh) * 100}%`,
                    }}
                  />
                </div>
                <div className="energy-area-submeta">
                  <span>
                    Thiết bị đo riêng ({area.sampledDeviceCount}/{area.totalDeviceCount}):{" "}
                    {(area.sampledDevicesKwh ?? 0).toFixed(1)} kWh · Thiết bị khác trong khu vực:{" "}
                    {(area.unmonitoredRoomKwh ?? 0).toFixed(1)} kWh
                  </span>
                  {area.abnormal && (
                    <span className="energy-row-warning">
                      <AlertTriangle aria-hidden="true" size={12} /> Vượt ngưỡng{" "}
                      {AREA_THRESHOLDS_BY_FLOOR[area.floorId] ?? 0} kWh/ngày (+
                      {(area.excessKwh ?? 0).toFixed(1)} kWh)
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="energy-area-reconciliation-row">
              <span>Chưa phân bổ (chênh lệch đồng hồ tầng và tổng khu vực)</span>
              <strong>{workspace.reconciliation.unallocatedAreaKwh.toFixed(1)} kWh</strong>
            </div>
          </div>
          <p className="detail-panel-footnote">
            Ngưỡng cảnh báo theo tầng: Floor 1 · {floor1AbnormalAreaThresholdKwh} kWh/ngày; Floor 2 ·{" "}
            {floor2AbnormalAreaThresholdKwh} kWh/ngày.
          </p>
        </section>

        <section className="detail-panel" aria-labelledby="energy-device-title">
          <header className="detail-panel-header">
            <div>
              <p className="section-eyebrow">
                DEVICE BREAKDOWN · CHI TIẾT THUỘC KHU VỰC (KHÔNG CỘNG TRÙNG)
              </p>
              <h2 id="energy-device-title">Điện năng theo thiết bị</h2>
            </div>
            <div className="energy-device-header-actions">
              <span className="detail-panel-tag">
                {workspace.reconciliation.sampledDeviceCount}/{workspace.reconciliation.totalDeviceCount}{" "}
                THIẾT BỊ CÓ ĐO RIÊNG
              </span>
            </div>
          </header>

          <div className="energy-device-coverage-banner" role="note">
            <span>
              Đang hiển thị{" "}
              <strong>
                {workspace.reconciliation.sampledDeviceCount}/{workspace.reconciliation.totalDeviceCount} thiết bị
              </strong>{" "}
              có đo đếm riêng (tổng{" "}
              <strong>{workspace.reconciliation.sampledDevicesKwh.toFixed(1)} kWh</strong>, chiếm{" "}
              <strong>{workspace.reconciliation.sampledCoveragePercent}%</strong> trên{" "}
              {workspace.reconciliation.totalFloorKwh.toFixed(1)} kWh). Phần còn lại (
              <strong>{workspace.reconciliation.unmonitoredDevicesKwh.toFixed(1)} kWh</strong>) thuộc các thiết bị khác đã tính trong tổng từng khu vực.
            </span>
          </div>

          <div
            className="detail-table-scroll"
            role="region"
            aria-label="Energy by device; horizontal scroll to see all columns"
            tabIndex={0}
          >
            <table className="detail-data-table" aria-label="Energy by device">
              <thead>
                <tr>
                  <th>Thiết bị</th>
                  <th>Loại</th>
                  <th>Khu vực</th>
                  <th>Điện năng hôm nay</th>
                  <th>Ngưỡng / Tỷ trọng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {workspace.deviceRows.map((device) => (
                  <tr key={device.deviceId}>
                    <th scope="row">
                      <ScopedDashboardLink
                        className="energy-device-table-link"
                        to={
                          device.assetId
                            ? `/dashboard/assets?assetId=${encodeURIComponent(device.assetId)}`
                            : `/dashboard/devices?deviceId=${encodeURIComponent(device.deviceId)}`
                        }
                      >
                        {device.name}
                      </ScopedDashboardLink>
                    </th>
                    <td>{device.type}</td>
                    <td>
                      {device.roomName}
                      {isBuildingScope && device.floorName ? ` (${device.floorName})` : ""}
                    </td>
                    <td>{device.energyKwh.toFixed(1)} kWh</td>
                    <td>
                      Ngưỡng {device.thresholdKwh ?? 18} kWh · {device.shareOfRoomPercent ?? 0}% khu vực
                    </td>
                    <td>
                      <StatusBadge
                        status={device.abnormal ? "warning" : "normal"}
                        label={
                          device.abnormal
                            ? `Cao (+${(device.excessKwh ?? 0).toFixed(1)} kWh)`
                            : "Bình thường"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TableScrollHint />
          </div>
          <p className="detail-panel-footnote">
            Mức tiêu thụ thiết bị là chi tiết trực thuộc từng khu vực; không cộng thêm lần nữa vào tổng khu vực hay tổng tầng.
          </p>
        </section>
      </div>

      {/* 7. Dự báo chi phí điện tháng (đặt cuối trang để không đẩy thông tin vận hành xuống sâu) */}
      {workspace.monthlyForecast && (
        <EnergyForecastCard forecast={workspace.monthlyForecast} />
      )}
    </section>
  );
}
