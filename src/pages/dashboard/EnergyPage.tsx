import { lazy, Suspense, useMemo } from "react";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Zap } from "lucide-react";
import ModulePageHeader from "../../components/common/ModulePageHeader";
import TableScrollHint from "../../components/common/TableScrollHint";
import DetailStatCard from "../../components/dashboard/DetailStatCard";
import EnergyForecastCard from "../../components/dashboard/EnergyForecastCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { floor1MonthlyEnergyForecast } from "../../data/mock/energyForecast.mock";
import { ACTIVE_FLOOR_ID, DEMO_FLOOR_2_ID } from "../../data/mock/buildingLocations";
import { floor1AbnormalAreaThresholdKwh, floor1EnergyComparison } from "../../data/mock/floor1EnergyDetail.mock";
import { floor2AbnormalAreaThresholdKwh, floor2EnergyComparison, floor2MonthlyEnergyForecast } from "../../data/mock/floor2EnergyDetail.mock";
import {
  buildEnergyAreaRows,
  buildEnergyDeviceRows,
  calculateEnergyTotal,
  calculateEnergyWaste,
  formatEnergyCostVnd,
} from "../../features/energy/energySelectors";
import { calculateMonthlyEnergyForecast, combineMonthlyEnergyForecastConfigs } from "../../features/energy/energyForecast";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import { useTwinStore } from "../../features/twin/twinStore";

const EnergyChart = lazy(() => import("../../components/dashboard/EnergyChart"));
const areaThresholds = {
  [ACTIVE_FLOOR_ID]: floor1AbnormalAreaThresholdKwh,
  [DEMO_FLOOR_2_ID]: floor2AbnormalAreaThresholdKwh,
};

export default function EnergyPage() {
  const scope = useDashboardScopeData();
  const { rooms, devices, energyDeviceReadings } = scope;
  const energyHistoryByFloor = useTwinStore((state) => state.energyHistoryByFloor);
  const energyChartFloorId = scope.floorIds.includes(ACTIVE_FLOOR_ID) ? ACTIVE_FLOOR_ID : DEMO_FLOOR_2_ID;
  const energyChartSource = energyChartFloorId === DEMO_FLOOR_2_ID ? "dated-sample" : "current-day";
  const energyChartScopeLabel = energyChartFloorId === DEMO_FLOOR_2_ID ? "Floor 2" : "Floor 1";
  const energyChartScopeNote = scope.isBuildingScope
    ? `Floor 2 · dữ liệu mẫu tĩnh ngày ${floor2MonthlyEnergyForecast.readingDate.split("-").reverse().join("/")} không gộp vào xu hướng hôm nay`
    : undefined;
  const areaRows = useMemo(
    () => buildEnergyAreaRows(rooms, areaThresholds),
    [rooms],
  );
  const deviceRows = useMemo(
    () => buildEnergyDeviceRows(devices, rooms, energyDeviceReadings),
    [devices, rooms, energyDeviceReadings],
  );
  const energyToday = calculateEnergyTotal(rooms);
  const yesterdayKwh = scope.floorIds.reduce((total, floorId) => total + (floorId === ACTIVE_FLOOR_ID
    ? floor1EnergyComparison.yesterdayKwh
    : floorId === DEMO_FLOOR_2_ID ? floor2EnergyComparison.yesterdayKwh : 0), 0);
  const energyChangePercent = yesterdayKwh > 0 ? ((energyToday / yesterdayKwh) - 1) * 100 : 0;
  const forecastConfigs = scope.floorIds.flatMap((floorId) => floorId === ACTIVE_FLOOR_ID
    ? [floor1MonthlyEnergyForecast]
    : floorId === DEMO_FLOOR_2_ID ? [floor2MonthlyEnergyForecast] : []);
  const combinedForecastConfig = combineMonthlyEnergyForecastConfigs(
    forecastConfigs,
    scope.isBuildingScope ? "BUILDING-METERS-DEMO" : forecastConfigs.map((config) => config.meterId).join(" + "),
  );
  const monthlyForecast = combinedForecastConfig
    ? calculateMonthlyEnergyForecast(combinedForecastConfig, energyToday)
    : null;
  const floor1Waste = scope.floorIds.length === 1 && scope.floorIds[0] === ACTIVE_FLOOR_ID
    ? calculateEnergyWaste(
      energyToday,
      floor1MonthlyEnergyForecast.baselineTodayKwh,
      floor1MonthlyEnergyForecast.averageRateVndPerKwh,
    )
    : null;
  const scopeTitle = scope.isBuildingScope ? "Năng lượng toàn tòa nhà" : `Năng lượng ${scope.scopeLabel}`;
  const highestArea = areaRows[0];
  const abnormalAreas = areaRows.filter((area) => area.abnormal);
  const abnormalDevices = deviceRows.filter((device) => device.abnormal);
  const maximumAreaKwh = Math.max(...areaRows.map((area) => area.energyKwh), 1);

  return (
    <section className="dashboard-page detail-module-page" aria-labelledby="module-page-title">
      <ModulePageHeader
        section="MONITORING / ENERGY"
        title={scopeTitle}
        description={`Mức tiêu thụ theo thời gian, khu vực và thiết bị · ${scope.scopeLabel} · dữ liệu mô phỏng.`}
        scopeLabel={scope.scopeLabel}
      />

      <section className={`detail-stat-grid${floor1Waste ? " detail-stat-grid--energy-waste" : ""}`} aria-label="Energy summary">
        <DetailStatCard label="Điện năng hôm nay" value={`${energyToday.toFixed(1)} kWh`} detail="Tổng theo khu vực" icon={Zap} />
        <DetailStatCard
          label="So với hôm qua"
          value={`${energyChangePercent > 0 ? "+" : ""}${energyChangePercent.toFixed(1)}%`}
          detail={`Hôm qua · ${yesterdayKwh.toFixed(1)} kWh`}
          icon={energyChangePercent >= 0 ? ArrowUpRight : ArrowDownRight}
          tone={energyChangePercent > 0 ? "amber" : "green"}
        />
        <DetailStatCard label="Khu vực tiêu thụ cao nhất" value={highestArea?.name ?? "—"} detail={`${highestArea?.energyKwh.toFixed(1) ?? "0.0"} kWh hôm nay`} icon={Activity} />
        <DetailStatCard label="Vượt ngưỡng tiêu thụ" value={String(abnormalAreas.length + abnormalDevices.length)} detail="Khu vực / thiết bị cần xem xét" icon={AlertTriangle} tone={abnormalAreas.length ? "amber" : "green"} />
        {floor1Waste && (
          <DetailStatCard
            label="Điện lãng phí (ước tính)"
            value={`${floor1Waste.excessKwh.toFixed(1)} kWh`}
            detail={`${formatEnergyCostVnd(floor1Waste.estimatedCostVnd)} · ${floor1MonthlyEnergyForecast.averageRateVndPerKwh.toLocaleString("vi-VN")} VND/kWh · baseline mẫu ${floor1MonthlyEnergyForecast.baselineTodayKwh.toFixed(1)} kWh (${floor1MonthlyEnergyForecast.readingDate.split("-").reverse().join("/")})`}
            icon={AlertTriangle}
            tone={floor1Waste.excessKwh > 0 ? "amber" : "green"}
          />
        )}
      </section>

      {monthlyForecast && <EnergyForecastCard forecast={monthlyForecast} />}

      <section className="detail-panel energy-trend-panel" aria-labelledby="energy-trend-title">
        <header className="detail-panel-header">
          <div>
            <p className="section-eyebrow">TREND · ĐIỆN NĂNG LŨY KẾ (kWh)</p>
            <h2 id="energy-trend-title">Xu hướng điện năng lũy kế</h2>
          </div>
          <span className="detail-panel-tag">
            {energyChartSource === "dated-sample"
              ? `MẪU TĨNH · ${floor2MonthlyEnergyForecast.readingDate.split("-").reverse().join("/")}`
              : scope.isBuildingScope ? "FLOOR 1 · HÔM NAY" : "HÔM NAY"}
          </span>
        </header>
        <Suspense fallback={<div className="energy-chart-loading" role="status">Đang tải biểu đồ…</div>}>
          <EnergyChart
            data={energyHistoryByFloor[energyChartFloorId] ?? []}
            source={energyChartSource}
            scopeLabel={energyChartScopeLabel}
            sampleDate={energyChartSource === "dated-sample" ? floor2MonthlyEnergyForecast.readingDate : undefined}
            scopeNote={energyChartScopeNote}
          />
        </Suspense>
      </section>

      <div className="detail-two-column-grid">
        <section className="detail-panel" aria-labelledby="energy-area-title">
          <header className="detail-panel-header">
            <div>
              <p className="section-eyebrow">AREA BREAKDOWN</p>
              <h2 id="energy-area-title">Điện năng theo khu vực</h2>
            </div>
            <span className="detail-unit-note">kWh hôm nay</span>
          </header>
          <div className="energy-area-list">
            {areaRows.map((area, index) => (
              <div className="energy-area-row" key={area.roomId}>
                <div className="energy-area-row-heading">
                  <span className="energy-area-rank">{String(index + 1).padStart(2, "0")}</span>
                  <span className="energy-area-name">{area.name}</span>
                  <strong>{area.energyKwh.toFixed(1)} <small>kWh</small></strong>
                </div>
                <div className="energy-area-track" aria-label={`${area.name}: ${area.energyKwh.toFixed(1)} kWh`}>
                  <span className={area.abnormal ? "is-abnormal" : ""} style={{ width: `${(area.energyKwh / maximumAreaKwh) * 100}%` }} />
                </div>
                {area.abnormal && <span className="energy-row-warning"><AlertTriangle aria-hidden="true" size={12} /> Vượt ngưỡng {areaThresholds[area.floorId] ?? 0} kWh/ngày</span>}
              </div>
            ))}
          </div>
          <p className="detail-panel-footnote">Ngưỡng cảnh báo theo tầng: Floor 1 · {floor1AbnormalAreaThresholdKwh} kWh/ngày; Floor 2 · {floor2AbnormalAreaThresholdKwh} kWh/ngày.</p>
        </section>

        <section className="detail-panel energy-exceptions-panel" aria-labelledby="energy-exceptions-title">
          <header className="detail-panel-header">
            <div>
              <p className="section-eyebrow">ATTENTION</p>
              <h2 id="energy-exceptions-title">Tiêu thụ bất thường</h2>
            </div>
            <StatusBadge status={abnormalAreas.length + abnormalDevices.length > 0 ? "warning" : "normal"} label={`${abnormalAreas.length + abnormalDevices.length} mục`} />
          </header>
          <ul className="energy-exception-list">
            {abnormalAreas.map((area) => (
              <li key={area.roomId}>
                <span className="energy-exception-symbol"><AlertTriangle aria-hidden="true" size={15} /></span>
                <div><strong>{area.name}</strong><span>{area.energyKwh.toFixed(1)} kWh · ngưỡng {areaThresholds[area.floorId] ?? 0} kWh</span></div>
                <StatusBadge status="warning" label="Cao" />
              </li>
            ))}
            {abnormalDevices.map((device) => (
              <li key={device.deviceId}>
                <span className="energy-exception-symbol"><Zap aria-hidden="true" size={15} /></span>
                <div><strong>{device.name}</strong><span>{device.roomName} · {device.energyKwh.toFixed(1)} kWh</span></div>
                <StatusBadge status="warning" label="Cao" />
              </li>
            ))}
            {abnormalAreas.length + abnormalDevices.length === 0 && <li className="detail-empty-state">Không có mức tiêu thụ vượt ngưỡng.</li>}
          </ul>
          <p className="detail-panel-footnote">Ngưỡng thiết bị theo mock cấu hình riêng của từng mẫu thiết bị.</p>
        </section>
      </div>

      <section className="detail-panel" aria-labelledby="energy-device-title">
        <header className="detail-panel-header">
          <div>
            <p className="section-eyebrow">DEVICE BREAKDOWN</p>
            <h2 id="energy-device-title">Điện năng theo thiết bị</h2>
          </div>
          <span className="detail-panel-tag">{deviceRows.length} THIẾT BỊ MẪU</span>
        </header>
        <div className="detail-table-scroll" role="region" aria-label="Energy by device; horizontal scroll to see all columns" tabIndex={0}>
          <table className="detail-data-table" aria-label="Energy by device">
            <thead><tr><th>Thiết bị</th><th>Loại</th><th>Khu vực</th><th>Điện năng hôm nay</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {deviceRows.map((device) => (
                <tr key={device.deviceId}>
                  <th scope="row">{device.name}</th>
                  <td>{device.type}</td>
                  <td>{device.roomName}</td>
                  <td>{device.energyKwh.toFixed(1)} kWh</td>
                  <td><StatusBadge status={device.abnormal ? "warning" : "normal"} label={device.abnormal ? "Cao" : "Bình thường"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableScrollHint />
        </div>
        <p className="detail-panel-footnote">Mức tiêu thụ thiết bị là số liệu mẫu; tổng theo khu vực còn bao gồm các thiết bị tổng hợp khác trong phạm vi đã chọn.</p>
      </section>
    </section>
  );
}
