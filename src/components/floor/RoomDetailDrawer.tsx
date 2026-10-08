import { ArrowUpRight, Boxes, Droplets, Thermometer, Wifi, WifiOff, X, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import { focusTwinEntity } from "../../features/floor/focusTwinEntity";
import StatusBadge from "../dashboard/StatusBadge";

type RoomDetailDrawerProps = {
  room: FloorRoomSnapshot;
  onClose: () => void;
};

export default function RoomDetailDrawer({ room, onClose }: RoomDetailDrawerProps) {
  return (
    <aside className="room-detail-drawer" role="complementary" aria-label={`${room.name} details`}>
      <div className="room-drawer-topline">
        <div>
          <p className="section-eyebrow">ROOM DETAIL / FLOOR 1</p>
          <h3 id="room-detail-title">{room.name}</h3>
        </div>
        <button className="room-drawer-close" type="button" aria-label="Close room details" onClick={onClose}>
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
        <Link className="room-action-secondary" to={`/dashboard/devices?roomId=${encodeURIComponent(room.id)}`}>
          Xem chi tiết <ArrowUpRight aria-hidden="true" size={15} />
        </Link>
        <Link className="room-action-primary" to={focusTwinEntity(room.id)}>
          Xem trên 3D <ArrowUpRight aria-hidden="true" size={15} />
        </Link>
      </div>
    </aside>
  );
}
