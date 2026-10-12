import { useMemo } from "react";
import { Activity, Droplets, Leaf, Thermometer } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ModulePageHeader from "../../components/common/ModulePageHeader";
import TableScrollHint from "../../components/common/TableScrollHint";
import DetailStatCard from "../../components/dashboard/DetailStatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { floor1EnvironmentThresholds } from "../../data/mock/floor1Environment.mock";
import { buildAreaEnvironmentReadings } from "../../features/environment/environmentSelectors";
import type { AreaEnvironmentReading } from "../../features/environment/types";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import type { OperationalStatus } from "../../types/models";

const statusLabels: Record<OperationalStatus, string> = {
  normal: "Bình thường",
  warning: "Cần chú ý",
  critical: "Critical",
  offline: "Offline",
};

function MetricReading({ value, unit, status }: { value: string; unit: string; status: OperationalStatus }) {
  return (
    <span className={`environment-reading environment-reading--${status}`}>
      {value} <small>{unit}</small>
      {status !== "normal" && <span className="environment-reading-state">{statusLabels[status]}</span>}
    </span>
  );
}

function average(readings: readonly AreaEnvironmentReading[], field: "temperatureC" | "humidityPercent" | "co2Ppm" | "pm25Micrograms") {
  return readings.length ? readings.reduce((total, reading) => total + reading[field], 0) / readings.length : 0;
}

export default function EnvironmentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = useDashboardScopeData();
  const { rooms, airQualityByRoom } = scope;
  const roomId = searchParams.get("roomId");
  const allReadings = useMemo(
    () => buildAreaEnvironmentReadings(rooms, airQualityByRoom, floor1EnvironmentThresholds),
    [rooms, airQualityByRoom],
  );
  const readings = roomId ? allReadings.filter((reading) => reading.roomId === roomId) : allReadings;
  const flaggedCount = allReadings.filter((reading) => reading.status === "warning" || reading.status === "critical").length;
  const averageTemperature = average(allReadings, "temperatureC");
  const averageHumidity = average(allReadings, "humidityPercent");
  const averageCo2 = average(allReadings, "co2Ppm");

  return (
    <section className="dashboard-page detail-module-page" aria-labelledby="module-page-title">
      <ModulePageHeader
        section="MONITORING / ENVIRONMENT"
        title={`Môi trường · ${scope.scopeLabel}`}
        description={`Theo dõi điều kiện của ${allReadings.length} khu vực trong ${scope.scopeLabel} và nhận biết nhanh chỉ số vượt ngưỡng.`}
        scopeLabel={scope.scopeLabel}
      />

      <section className="detail-stat-grid detail-stat-grid--environment" aria-label="Environmental summary">
        <DetailStatCard label="Nhiệt độ trung bình" value={`${averageTemperature.toFixed(1)}°C`} detail={`Ngưỡng ${floor1EnvironmentThresholds.temperatureMinC}–${floor1EnvironmentThresholds.temperatureMaxC}°C`} icon={Thermometer} />
        <DetailStatCard label="Độ ẩm trung bình" value={`${averageHumidity.toFixed(0)}%`} detail={`Ngưỡng ${floor1EnvironmentThresholds.humidityMinPercent}–${floor1EnvironmentThresholds.humidityMaxPercent}%`} icon={Droplets} tone="green" />
        <DetailStatCard label="CO₂ trung bình" value={`${averageCo2.toFixed(0)} ppm`} detail={`Ngưỡng ≤ ${floor1EnvironmentThresholds.co2MaxPpm} ppm`} icon={Activity} />
        <DetailStatCard label="Khu vực cần xử lý" value={String(flaggedCount)} detail={`trên ${allReadings.length} khu vực ${scope.scopeLabel}`} icon={Leaf} tone={flaggedCount ? "amber" : "green"} />
      </section>

      {roomId && (
        <div className="device-room-context" role="status">
          <span>Đang xem khu vực</span>
          <strong>{allReadings.find((reading) => reading.roomId === roomId)?.roomName ?? "Không tìm thấy khu vực"}</strong>
          <button type="button" onClick={() => setSearchParams({}, { replace: true })}>Hiện tất cả khu vực</button>
        </div>
      )}

      <section className="detail-panel" aria-labelledby="environment-area-title">
        <header className="detail-panel-header">
          <div>
            <p className="section-eyebrow">AREA CONDITIONS</p>
            <h2 id="environment-area-title">Chỉ số theo khu vực</h2>
          </div>
          <span className="detail-panel-tag">{readings.length} / {allReadings.length} KHU VỰC</span>
        </header>
        <div className="detail-table-scroll" role="region" aria-label="Environmental readings by area; horizontal scroll to see all columns" tabIndex={0}>
          <table className="detail-data-table environment-data-table" aria-label="Environmental readings by area">
            <thead><tr><th>Khu vực</th><th>Nhiệt độ</th><th>Độ ẩm</th><th>CO₂</th><th>PM2.5</th><th>Điều kiện</th></tr></thead>
            <tbody>
              {readings.map((reading) => (
                <tr key={reading.roomId}>
                  <th scope="row">{reading.roomName}</th>
                  <td><MetricReading value={reading.temperatureC.toFixed(1)} unit="°C" status={reading.temperatureStatus} /></td>
                  <td><MetricReading value={reading.humidityPercent.toFixed(0)} unit="%" status={reading.humidityStatus} /></td>
                  <td><MetricReading value={reading.co2Ppm.toLocaleString("en-US")} unit="ppm" status={reading.co2Status} /></td>
                  <td><MetricReading value={reading.pm25Micrograms.toString()} unit="µg/m³" status={reading.pm25Status} /></td>
                  <td><StatusBadge status={reading.status} label={statusLabels[reading.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <TableScrollHint />
        </div>
        <footer className="environment-threshold-note">
          <span><b>Ngưỡng vận hành:</b> Nhiệt độ {floor1EnvironmentThresholds.temperatureMinC}–{floor1EnvironmentThresholds.temperatureMaxC}°C · Độ ẩm {floor1EnvironmentThresholds.humidityMinPercent}–{floor1EnvironmentThresholds.humidityMaxPercent}% · CO₂ ≤ {floor1EnvironmentThresholds.co2MaxPpm} ppm · PM2.5 ≤ {floor1EnvironmentThresholds.pm25MaxMicrograms} µg/m³</span>
          <span className="environment-source-note">Nhiệt độ, độ ẩm, CO₂ và PM2.5 dùng cùng trạng thái mô phỏng của Twin Store.</span>
        </footer>
      </section>
    </section>
  );
}
