import { Activity, BarChart3, ShieldAlert, Wind, Zap } from "lucide-react";
import ModulePageHeader from "../../components/common/ModulePageHeader";
import DetailStatCard from "../../components/dashboard/DetailStatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { isUnresolvedIncident } from "../../features/alerts/alertSelectors";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";

export default function AnalyticsPage() {
  const scope = useDashboardScopeData();
  const { rooms, devices, alerts, airQualityByRoom, scopeLabel } = scope;

  const totalEnergy = rooms.reduce((sum, room) => sum + room.energyConsumption, 0);
  const averageEnergyPerRoom = rooms.length > 0 ? totalEnergy / rooms.length : 0;

  const totalDevices = devices.length;
  const onlineDevices = devices.filter((device) => device.status !== "offline").length;
  const uptimePercent = totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 100;

  const normalRooms = rooms.filter((room) => room.status === "normal").length;
  const complianceRate = rooms.length > 0 ? (normalRooms / rooms.length) * 100 : 100;

  const unresolvedAlerts = alerts.filter(isUnresolvedIncident);
  const criticalAlerts = unresolvedAlerts.filter((alert) => alert.severity === "critical").length;

  return (
    <section className="dashboard-page detail-module-page" aria-labelledby="module-page-title">
      <ModulePageHeader
        section="MONITORING / ANALYTICS"
        title={`Phân tích vận hành · ${scopeLabel}`}
        description={`Tổng hợp tương quan năng lượng, môi trường, độ sẵn sàng thiết bị IoT và sự cố trong ${scopeLabel} (Dữ liệu mô phỏng Digital Twin).`}
        scopeLabel={scopeLabel}
      />

      <section className="detail-stat-grid" aria-label="Operational analytics summary">
        <DetailStatCard
          label="Trung bình điện / khu vực"
          value={`${averageEnergyPerRoom.toFixed(1)} kWh`}
          detail={`Tổng ${totalEnergy.toFixed(1)} kWh trên ${rooms.length} khu vực`}
          icon={Zap}
          tone="cyan"
        />
        <DetailStatCard
          label="Tỷ lệ khu vực đạt chuẩn"
          value={`${complianceRate.toFixed(0)}%`}
          detail={`${normalRooms} / ${rooms.length} khu vực trong ngưỡng chuẩn`}
          icon={Wind}
          tone={complianceRate >= 80 ? "green" : "amber"}
        />
        <DetailStatCard
          label="Độ sẵn sàng thiết bị IoT"
          value={`${uptimePercent.toFixed(0)}%`}
          detail={`${onlineDevices} / ${totalDevices} thiết bị đang kết nối`}
          icon={Activity}
          tone={uptimePercent >= 90 ? "green" : "amber"}
        />
        <DetailStatCard
          label="Sự cố cần giải quyết"
          value={String(unresolvedAlerts.length)}
          detail={`${criticalAlerts} sự cố mức Critical`}
          icon={ShieldAlert}
          tone={criticalAlerts > 0 ? "red" : unresolvedAlerts.length > 0 ? "amber" : "green"}
        />
      </section>

      <section className="detail-panel" aria-labelledby="analytics-correlation-title">
        <header className="detail-panel-header">
          <div>
            <p className="section-eyebrow">CROSS-DOMAIN CORRELATION · MOCK TELEMETRY</p>
            <h2 id="analytics-correlation-title">Ma trận hiệu suất khu vực</h2>
          </div>
          <span className="detail-count">
            <BarChart3 size={14} aria-hidden="true" /> {rooms.length} khu vực
          </span>
        </header>

        <div className="detail-table-wrap">
          <table className="detail-table" aria-label={`Analytics correlation matrix for ${scopeLabel}`}>
            <thead>
              <tr>
                <th scope="col">Khu vực</th>
                <th scope="col">Điện năng (kWh)</th>
                <th scope="col">Nhiệt độ</th>
                <th scope="col">Độ ẩm</th>
                <th scope="col">CO₂ (ppm)</th>
                <th scope="col">Thiết bị Online</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => {
                const airQuality = airQualityByRoom.find((item) => item.roomId === room.id);
                return (
                  <tr key={room.id}>
                    <td>
                      <strong>{room.name}</strong>
                      <span>{room.id}</span>
                    </td>
                    <td>{room.energyConsumption.toFixed(1)} kWh</td>
                    <td>{room.temperature.toFixed(1)}°C</td>
                    <td>{room.humidity}%</td>
                    <td>{airQuality?.co2Ppm ?? "—"}</td>
                    <td>
                      {room.onlineDeviceCount} / {room.deviceCount}
                    </td>
                    <td>
                      <StatusBadge status={room.status} label={room.status.toUpperCase()} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

