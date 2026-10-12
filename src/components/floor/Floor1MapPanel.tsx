import { useLayoutEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import { ACTIVE_FLOOR_ID } from "../../data/mock/buildingLocations";
import { floor1SchematicGeometry } from "../../data/mock/floor1.mock";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import { useTwinStore } from "../../features/twin/twinStore";
import Floor1SvgMap from "./Floor1SvgMap";
import RoomDetailDrawer from "./RoomDetailDrawer";

const statusLabels = {
  normal: "Bình thường",
  warning: "Cần chú ý",
  critical: "Critical",
  offline: "Offline",
} as const;

export default function Floor1MapPanel() {
  const [hoveredRoom, setHoveredRoom] = useState<FloorRoomSnapshot | null>(null);
  const selectedRoomTrigger = useRef<HTMLElement | SVGElement | null>(null);
  const drawerCloseButton = useRef<HTMLButtonElement>(null);
  const allRooms = useTwinStore((state) => state.rooms);
  const allDevices = useTwinStore((state) => state.devices);
  const rooms = allRooms.filter((room) => room.floorId === ACTIVE_FLOOR_ID);
  const roomIds = new Set(rooms.map((room) => room.id));
  const devices = allDevices.filter((device) => roomIds.has(device.roomId));
  const selectedRoomId = useTwinStore((state) => state.selectedRoomId);
  const selectRoom = useTwinStore((state) => state.selectRoom);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;
  const operationalExceptions = rooms.filter((room) => room.status !== "normal");

  useLayoutEffect(() => {
    if (selectedRoomId) drawerCloseButton.current?.focus();
  }, [selectedRoomId]);

  const selectRoomFromTrigger = (room: FloorRoomSnapshot, trigger: HTMLElement | SVGElement) => {
    selectedRoomTrigger.current = trigger;
    trigger.focus();
    selectRoom(room.id);
  };

  const closeRoomDrawer = () => {
    if (selectedRoomTrigger.current?.isConnected) selectedRoomTrigger.current.focus();
    selectRoom(null);
  };

  const roomCause = (room: FloorRoomSnapshot) => {
    const causes = devices
      .filter((device) => device.roomId === room.id && device.status !== "normal")
      .map((device) => `${device.name} ${device.status === "offline" ? "mất kết nối" : "cảnh báo"}`);
    if (room.temperature >= 29) causes.unshift(`Nhiệt độ ${room.temperature.toFixed(1)}°C · Critical`);
    else if (room.temperature >= 27) causes.unshift(`Nhiệt độ ${room.temperature.toFixed(1)}°C · Cảnh báo`);
    if (room.offlineDeviceCount > causes.filter((cause) => cause.includes("mất kết nối")).length) {
      causes.push(`${room.offlineDeviceCount} thiết bị offline theo tổng khu vực`);
    }
    return causes.join(" · ") || "Trạng thái vận hành cần kiểm tra";
  };

  return (
    <section className="overview-panel floor-status-panel floor1-map-panel" aria-labelledby="floor-map-title">
      <header className="overview-panel-heading">
        <div>
          <p className="section-eyebrow">ICS HEADQUARTERS / FLOOR 1</p>
          <h2 id="floor-map-title">Sơ đồ vận hành Floor 1</h2>
        </div>
        <span className="panel-heading-icon" aria-hidden="true"><MapPinned size={17} /></span>
      </header>

      <div className="floor-map-stage">
        <Floor1SvgMap
          rooms={rooms}
          geometry={floor1SchematicGeometry}
          selectedRoomId={selectedRoomId}
          onSelectRoom={selectRoomFromTrigger}
          onHoverRoom={setHoveredRoom}
        />

        {hoveredRoom && (
          <div className="floor-map-tooltip" role="tooltip">
            <div>
              <strong>{hoveredRoom.name}</strong>
              <span className={"floor-map-tooltip-status floor-map-tooltip-status--" + hoveredRoom.status}>
                {statusLabels[hoveredRoom.status]}
              </span>
            </div>
            <span>{hoveredRoom.temperature.toFixed(1)}°C <i /> {hoveredRoom.humidity}% RH</span>
            <span>{hoveredRoom.energyConsumption.toFixed(1)} kWh hôm nay</span>
          </div>
        )}

        {selectedRoom && (
          <RoomDetailDrawer room={selectedRoom} closeButtonRef={drawerCloseButton} onClose={closeRoomDrawer} />
        )}
      </div>

      <footer className="floor-map-footer">
        <div className="floor-map-legend" aria-label="Room status legend">
          <span className="floor-map-legend-item floor-map-legend-item--normal"><i>✓</i> Bình thường</span>
          <span className="floor-map-legend-item floor-map-legend-item--warning"><i>!</i> Cần chú ý</span>
          <span className="floor-map-legend-item floor-map-legend-item--critical"><i>!</i> Critical</span>
          <span className="floor-map-legend-item floor-map-legend-item--offline"><i>×</i> Offline</span>
        </div>
        <div className="floor-map-exception-summary" aria-label="Tóm tắt ngoại lệ vận hành">
          <strong>{operationalExceptions.length} khu vực có ngoại lệ vận hành</strong>
          {operationalExceptions.length > 0 ? (
            <div className="floor-map-exception-list">
              {operationalExceptions.map((room) => (
                <button
                  aria-label={`${room.name}: ${statusLabels[room.status]}. ${roomCause(room)}. Chọn để xem chi tiết.`}
                  className={`floor-map-exception floor-map-exception--${room.status}`}
                  key={room.id}
                  onClick={(event) => selectRoomFromTrigger(room, event.currentTarget)}
                  type="button"
                >
                  <span><b>{room.name}</b><i>{statusLabels[room.status]}</i></span>
                  <small>{roomCause(room)}</small>
                </button>
              ))}
            </div>
          ) : <span className="floor-map-hint">Tất cả khu vực đang bình thường</span>}
        </div>
        <span className="floor-map-hint">Chọn khu vực trên sơ đồ hoặc danh sách để xem telemetry</span>
      </footer>
    </section>
  );
}
