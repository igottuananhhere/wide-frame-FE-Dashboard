import { useEffect, useRef } from "react";
import { ArrowUpRight, Boxes, Clock3, Droplets, Thermometer, Wifi, WifiOff, X, Zap } from "lucide-react";
import type { RefObject } from "react";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import ScopedDashboardLink from "../common/ScopedDashboardLink";
import StatusBadge from "../dashboard/StatusBadge";

type RoomDetailDrawerProps = {
  room: FloorRoomSnapshot;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

export default function RoomDetailDrawer({ room, closeButtonRef, onClose }: RoomDetailDrawerProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <aside className="room-detail-drawer" role="complementary" aria-label={`${room.name} details`}>
      <div className="room-drawer-topline">
        <div>
          <p className="section-eyebrow">ROOM DETAIL / FLOOR 1</p>
          <h3 id="room-detail-title">{room.name}</h3>
        </div>
        <button ref={closeButtonRef} className="room-drawer-close" type="button" aria-label="Close room details" onClick={onClose}>
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      <div className="room-detail-status">
        <span>Current status</span>
        <StatusBadge status={room.status} />
      </div>

      <div className="room-metric-list" id="room-detail-metrics">
        <div className="room-metric-row">
          <span className="room-metric-icon room-metric-icon--temperature"><Thermometer aria-hidden="true" size={16} /></span>
          <span>Nhiệt độ</span>
          <strong>{room.temperature.toFixed(1)}°C</strong>
        </div>
        <div className="room-metric-row">
          <span className="room-metric-icon room-metric-icon--humidity"><Droplets aria-hidden="true" size={16} /></span>
          <span>Độ ẩm</span>
          <strong>{room.humidity}%</strong>
        </div>
        <div className="room-metric-row">
          <span className="room-metric-icon room-metric-icon--energy"><Zap aria-hidden="true" size={16} /></span>
          <span>Điện năng</span>
          <strong>{room.energyConsumption.toFixed(1)} kWh</strong>
        </div>
      </div>

      <section className="room-device-summary" aria-label="Device counts">
        <div className="room-device-total">
          <Boxes aria-hidden="true" size={15} />
          <span>Thiết bị</span>
          <strong>{room.deviceCount}</strong>
        </div>
        <div>
          <Wifi aria-hidden="true" size={14} />
          <span>Online</span>
          <strong>{room.onlineDeviceCount}</strong>
        </div>
        <div>
          <WifiOff aria-hidden="true" size={14} />
          <span>Offline</span>
          <strong>{room.offlineDeviceCount}</strong>
        </div>
      </section>

      <div className="room-drawer-actions">
        <ScopedDashboardLink className="room-action-secondary" to={`/dashboard/devices?roomId=${encodeURIComponent(room.id)}`}>
          Xem chi tiết <ArrowUpRight aria-hidden="true" size={15} />
        </ScopedDashboardLink>
        <span className="room-action-unavailable" role="note" aria-label="Room-specific 3D view is not available yet">
          <Clock3 aria-hidden="true" size={14} /> Mô hình 3D · Chưa khả dụng
        </span>
      </div>
    </aside>
  );
}
