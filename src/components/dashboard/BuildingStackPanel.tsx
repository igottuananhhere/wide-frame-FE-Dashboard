import type { KeyboardEvent } from "react";
import type { Floor } from "../../types/models";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import type { TwinAlert } from "../../features/twin/types";
import { isUnresolvedIncident } from "../../features/alerts/alertSelectors";
import { ACTIVE_FLOOR_ID } from "../../data/mock/buildingLocations";
import { getCamerasByFloor } from "../../data/mock/cameras.mock";

type BuildingStackPanelProps = {
  floors: readonly Floor[];
  rooms: readonly FloorRoomSnapshot[];
  alerts: readonly TwinAlert[];
  onSelectFloor: (floorId: string) => void;
};

const floorStatusLabel: Record<FloorRoomSnapshot["status"], string> = {
  normal: "Bình thường",
  warning: "Cần chú ý",
  critical: "Critical",
  offline: "Offline",
};

export default function BuildingStackPanel({ floors, rooms, alerts, onSelectFloor }: BuildingStackPanelProps) {
  const orderedFloors = [...floors].sort((first, second) => second.level - first.level);
  const dataFloorNames = floors.filter((floor) => floor.dataAvailability === "simulation").map((floor) => floor.name);
  const outOfScopeFloorNames = floors.filter((floor) => floor.dataAvailability !== "simulation").map((floor) => floor.name);
  const roomStatusCounts = rooms.reduce<Record<FloorRoomSnapshot["status"], number>>((counts, room) => {
    counts[room.status] += 1;
    return counts;
  }, { normal: 0, warning: 0, critical: 0, offline: 0 });
  const floor1Cameras = getCamerasByFloor(ACTIVE_FLOOR_ID);

  const selectByKeyboard = (event: KeyboardEvent<SVGGElement>, floorId: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelectFloor(floorId);
  };

  return (
    <section className="overview-panel building-stack-panel" aria-labelledby="building-stack-title">
      <header className="overview-panel-heading">
        <div>
          <p className="section-eyebrow">BUILDING 2D MONITORING · ICS HEADQUARTERS</p>
          <h2 id="building-stack-title">Sơ đồ giám sát các tầng</h2>
        </div>
        <span className="detail-panel-tag">TẦNG 1 / {floors.length} TẦNG · PHẠM VI DEMO</span>
      </header>

      <div className="building-stack-graphic">
        <svg viewBox="0 0 760 340" role="group" aria-labelledby="building-stack-svg-title building-stack-svg-desc">
          <title id="building-stack-svg-title">Sơ đồ mặt đứng các tầng ICS Headquarters</title>
          <desc id="building-stack-svg-desc">{dataFloorNames.join(" và ")} có dữ liệu vận hành mô phỏng trong phạm vi demo. {outOfScopeFloorNames.join(", ")} hiển thị ngoài phạm vi demo và không cộng vào số liệu vận hành.</desc>
          <rect className="building-stack-shell" x="84" y="13" width="630" height="292" rx="12" />
          <path className="building-stack-roof" d="M84 35 L104 13 H694 L714 35" />
          <text className="building-stack-building-label" x="104" y="29">ICS HQ · FLOOR DIRECTORY</text>
          {orderedFloors.map((floor, index) => {
            const y = 43 + index * 49;
            const hasData = floor.dataAvailability === "simulation";
            const floorRooms = rooms.filter((room) => room.floorId === floor.id);
            const floorAlerts = alerts.filter((alert) => alert.floorId === floor.id && isUnresolvedIncident(alert));
            const deviceCount = floorRooms.reduce((total, room) => total + room.deviceCount, 0);
            const onlineDeviceCount = floorRooms.reduce((total, room) => total + room.onlineDeviceCount, 0);
            const floorCameras = getCamerasByFloor(floor.id);
            const statusCounts = floorRooms.reduce<Record<string, number>>((counts, room) => {
              counts[room.status] = (counts[room.status] ?? 0) + 1;
              return counts;
            }, {});
            const roomHealth = ["normal", "warning", "critical", "offline"]
              .filter((status) => statusCounts[status])
              .map((status) => `${statusCounts[status]} ${floorStatusLabel[status as FloorRoomSnapshot["status"]].toLowerCase()}`)
              .join(" · ");
            const floorStateBadge = floor.id === ACTIVE_FLOOR_ID
              ? "MÔ PHỎNG · ĐANG HOẠT ĐỘNG"
              : hasData
                ? "DỮ LIỆU MÔ PHỎNG"
                : "NGOÀI PHẠM VI DEMO";
            const ariaLabel = hasData
              ? `${floor.name}, dữ liệu mô phỏng: ${floorRooms.length} khu vực, ${onlineDeviceCount}/${deviceCount} thiết bị đang kết nối (${floorCameras.length} camera), ${floorAlerts.length} sự cố chưa giải quyết. ${roomHealth}. Chọn để mở dashboard ${floor.name}.`
              : `${floor.name}, ngoài phạm vi demo. Không cộng vào số liệu vận hành. Chọn để xem thông báo phạm vi demo.`;

            return (
              <g
                aria-label={ariaLabel}
                className={`building-stack-floor${hasData ? " building-stack-floor--active" : " building-stack-floor--empty"}`}
                key={floor.id}
                onClick={() => onSelectFloor(floor.id)}
                onKeyDown={(event) => selectByKeyboard(event, floor.id)}
                role="button"
                tabIndex={0}
              >
                <rect className="building-stack-floor-bg" x="104" y={y} width="590" height="42" rx="7" />
                <rect className="building-stack-level-chip" x="116" y={y + 7} width="38" height="28" rx="5" />
                <text className="building-stack-level" x="135" y={y + 26}>{String(floor.level).padStart(2, "0")}</text>
                <text className="building-stack-floor-name" x="170" y={y + 19}>{floor.name}</text>
                <text className="building-stack-floor-detail" x="170" y={y + 33}>
                  {hasData
                    ? `${floorRooms.length} khu vực · ${onlineDeviceCount}/${deviceCount} thiết bị kết nối (${floorCameras.length} camera) · ${floorAlerts.length} sự cố chưa giải quyết`
                    : "Ngoài phạm vi demo · Không cộng vào số liệu vận hành"}
                </text>
                <circle className={`building-stack-state-dot${hasData ? " building-stack-state-dot--active" : ""}`} cx="676" cy={y + 15} r="4" />
                <text className="building-stack-state-label" x="666" y={y + 31} textAnchor="end">
                  {floorStateBadge}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {rooms.length > 0 && (
        <div className="building-stack-health" aria-label="Phân bố trạng thái khu vực trên tầng trong phạm vi demo">
          <strong>Trạng thái khu vực (Tầng 1)</strong>
          {(["normal", "warning", "critical", "offline"] as const).filter((status) => roomStatusCounts[status] > 0).map((status) => (
            <span className={`building-health-count building-health-count--${status}`} key={status}>
              {roomStatusCounts[status]} {floorStatusLabel[status].toLowerCase()}
            </span>
          ))}
        </div>
      )}

      <div className="building-stack-footer">
        <p><span className="building-stack-key building-stack-key--simulation" />Floor 1 · Dữ liệu vận hành mô phỏng ({rooms.length} khu vực · {floor1Cameras.length} camera khung hình mô phỏng)</p>
        {outOfScopeFloorNames.length > 0 && <p><span className="building-stack-key building-stack-key--empty" />{outOfScopeFloorNames.join(" · ")} · Ngoài phạm vi demo (không cộng vào số liệu vận hành)</p>}
        <span>Chọn Floor 1 để mở Dashboard giám sát & điều khiển 2D Tầng 1</span>
      </div>
    </section>
  );
}
