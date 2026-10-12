import { useMemo, useState } from "react";
import { Cpu, Wifi, WifiOff, Wrench } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ModulePageHeader from "../../components/common/ModulePageHeader";
import TableScrollHint from "../../components/common/TableScrollHint";
import DetailStatCard from "../../components/dashboard/DetailStatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { filterTwinDevices, formatLastSeen, getPrimaryMetricValue } from "../../features/devices/deviceSelectors";
import type { DeviceFilter } from "../../features/devices/types";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import type { OperationalStatus } from "../../types/models";

const filters: readonly { id: DeviceFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "offline", label: "Offline" },
  { id: "warning", label: "Warning" },
];

const statusLabels: Record<OperationalStatus, string> = {
  normal: "Online",
  warning: "Warning",
  critical: "Critical",
  offline: "Offline",
};

export default function DevicesPage() {
  const [filter, setFilter] = useState<DeviceFilter>("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const scope = useDashboardScopeData();
  const { devices, sensors, rooms } = scope;
  const roomId = searchParams.get("roomId");
  const deviceId = searchParams.get("deviceId");
  const selectedRoom = rooms.find((room) => room.id === roomId);
  const selectedDevice = devices.find((device) => device.id === deviceId);
  const selectedDeviceRoom = selectedDevice && rooms.find((room) => room.id === selectedDevice.roomId);
  const scopedDevices = useMemo(
    () => deviceId
      ? selectedDevice ? [selectedDevice] : []
      : selectedRoom ? devices.filter((device) => device.roomId === selectedRoom.id) : devices,
    [deviceId, devices, selectedDevice, selectedRoom],
  );
  const trackedOnlineCount = scopedDevices.filter((device) => device.status === "normal").length;
  const trackedOfflineCount = scopedDevices.filter((device) => device.status === "offline").length;
  const warningCount = scopedDevices.filter((device) => device.status === "warning" || device.status === "critical").length;
  const filteredDevices = useMemo(() => filterTwinDevices(scopedDevices, filter), [scopedDevices, filter]);
  const aggregateRooms = selectedDevice
    ? rooms.filter((room) => room.id === selectedDevice.roomId)
    : selectedRoom ? [selectedRoom] : rooms;
  const totalDeviceCount = deviceId
    ? Number(Boolean(selectedDevice))
    : aggregateRooms.reduce((total, room) => total + room.deviceCount, 0);
  const onlineCount = deviceId
    ? Number(selectedDevice?.status === "normal")
    : aggregateRooms.reduce((total, room) => total + room.onlineDeviceCount, 0);
  const offlineCount = deviceId
    ? Number(selectedDevice?.status === "offline")
    : aggregateRooms.reduce((total, room) => total + room.offlineDeviceCount, 0);
  const aggregateDeviceCount = Math.max(0, totalDeviceCount - scopedDevices.length);
  const counts: Record<DeviceFilter, number> = { all: scopedDevices.length, online: trackedOnlineCount, offline: trackedOfflineCount, warning: warningCount };
  const clearQueryFilter = (key: string) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    next.delete(key);
    return next;
  }, { replace: true });

  return (
    <section className="dashboard-page detail-module-page" aria-labelledby="module-page-title">
      <ModulePageHeader
        section="MONITORING / DEVICES"
        title={`Thiết bị ${scope.scopeLabel}`}
        description={`Trạng thái vận hành và dữ liệu gần nhất của thiết bị trong ${scope.scopeLabel}.`}
        scopeLabel={scope.scopeLabel}
      />

      {selectedDevice ? (
        <div className="device-room-context" role="status" aria-label={`Devices filtered by ${selectedDevice.name}`}>
          <span>Đang xem thiết bị</span>
          <strong>{selectedDevice.name}</strong>
          <span>{selectedDeviceRoom?.name ?? scope.scopeLabel}</span>
          <button type="button" onClick={() => clearQueryFilter("deviceId")}>Xóa lọc thiết bị</button>
        </div>
      ) : deviceId ? (
        <div className="device-room-context" role="status" aria-label={`Device not found: ${deviceId}`}>
          <span>Không tìm thấy thiết bị</span>
          <strong>{deviceId}</strong>
          <span>trong phạm vi {scope.scopeLabel}</span>
          <button type="button" onClick={() => clearQueryFilter("deviceId")}>Xóa lọc thiết bị</button>
        </div>
      ) : selectedRoom ? (
        <div className="device-room-context" role="status" aria-label={`Devices filtered by ${selectedRoom.name}`}>
          <span>Đang lọc theo khu vực</span>
          <strong>{selectedRoom.name}</strong>
          <button type="button" onClick={() => clearQueryFilter("roomId")}>Xóa lọc khu vực</button>
        </div>
      ) : null}

      <section className="detail-stat-grid detail-stat-grid--devices" aria-label="Device health summary">
        <DetailStatCard label={selectedDevice ? "Thiết bị đang xem" : "Tổng thiết bị khu vực"} value={String(totalDeviceCount)} detail={selectedDevice ? "Đã lọc theo đúng thiết bị" : `${scopedDevices.length} theo dõi riêng · ${aggregateDeviceCount} tổng hợp`} icon={Cpu} />
        <DetailStatCard label="Online" value={String(onlineCount)} detail={selectedDevice ? statusLabels[selectedDevice.status] : `${trackedOnlineCount} mẫu online · tổng theo phòng`} icon={Wifi} tone="green" />
        <DetailStatCard label="Offline" value={String(offlineCount)} detail={selectedDevice ? statusLabels[selectedDevice.status] : `${trackedOfflineCount} mẫu offline · tổng theo phòng`} icon={WifiOff} tone={offlineCount ? "red" : "green"} />
        <DetailStatCard label="Cảnh báo (mẫu)" value={String(warningCount)} detail={selectedDevice ? statusLabels[selectedDevice.status] : "Thiết bị theo dõi riêng cần chú ý"} icon={Wrench} tone={warningCount ? "amber" : "green"} />
      </section>

      <section className="detail-panel" aria-labelledby="device-list-title">
        <header className="detail-panel-header device-list-heading">
          <div>
            <p className="section-eyebrow">{scope.isBuildingScope ? "BUILDING INVENTORY" : `${scope.scopeLabel.toUpperCase()} INVENTORY`}</p>
            <h2 id="device-list-title">Thiết bị đang giám sát</h2>
          </div>
          <div className="device-filter-group" role="group" aria-label="Filter devices by status">
            {filters.map((option) => (
              <button
                aria-pressed={filter === option.id}
                className={filter === option.id ? "device-filter-button is-active" : "device-filter-button"}
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
              >
                {option.label}<span>{counts[option.id]}</span>
              </button>
            ))}
          </div>
        </header>
        <div className="detail-table-scroll" role="region" aria-label={`Devices in ${scope.scopeLabel}; horizontal scroll to see all columns`} tabIndex={0}>
          <table className="detail-data-table device-data-table" aria-label={`Devices in ${scope.scopeLabel}`}>
            <thead><tr><th>Device ID</th><th>Name</th><th>Type</th><th>Room</th><th>Status</th><th>Last Seen</th><th>Primary metric</th></tr></thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr key={device.id}>
                  <td><span className="detail-entity-id">{device.id}</span></td>
                  <th scope="row">{device.name}</th>
                  <td>{device.type}</td>
                  <td>{rooms.find((room) => room.id === device.roomId)?.name ?? "—"}</td>
                  <td><StatusBadge status={device.status} label={statusLabels[device.status]} /></td>
                  <td><time dateTime={device.lastSeenAt}>{formatLastSeen(device.lastSeenAt)}</time></td>
                  <td>{getPrimaryMetricValue(device, sensors)}</td>
                </tr>
              ))}
              {filteredDevices.length === 0 && (
                <tr><td className="detail-empty-cell" colSpan={7}>{deviceId && !selectedDevice ? `Không tìm thấy thiết bị ${deviceId} trong phạm vi này.` : "Không có thiết bị trong trạng thái này."}</td></tr>
              )}
            </tbody>
          </table>
          <TableScrollHint />
        </div>
        <p className="detail-panel-footnote">{selectedDevice ? `${selectedDevice.name} là thiết bị được chọn; bộ lọc trạng thái áp dụng riêng cho thiết bị này.` : `${selectedRoom?.name ?? scope.scopeLabel} có ${totalDeviceCount} thiết bị theo tổng từng phòng; danh sách và bộ lọc áp dụng cho ${scopedDevices.length} thiết bị mô hình hóa riêng trong phạm vi này. Các số còn lại là tổng hợp mock.`}</p>
      </section>
    </section>
  );
}
