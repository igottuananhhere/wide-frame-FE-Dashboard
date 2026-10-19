import type { KeyboardEvent } from "react";
import { DEMO_FLOOR_2_ID } from "../../data/mock/buildingLocations";
import type { AreaEnvironmentReading } from "../../features/environment/types";
import type {
  FloorCameraMarker,
  FloorRoomSnapshot,
  SchematicRoomGeometry,
} from "../../features/floor/types";
import type { OperationalStatus } from "../../types/models";

export type FloorMapLayer = "status" | "environment" | "devices" | "energy" | "cameras";

const statusPresentation: Record<OperationalStatus, { label: string; symbol: string }> = {
  normal: { label: "BÌNH THƯỜNG", symbol: "✓" },
  warning: { label: "CẦN CHÚ Ý", symbol: "!" },
  critical: { label: "CRITICAL", symbol: "!" },
  offline: { label: "OFFLINE", symbol: "×" },
};

type Floor1SvgMapProps = {
  rooms: readonly FloorRoomSnapshot[];
  geometry: readonly SchematicRoomGeometry[];
  cameras?: readonly FloorCameraMarker[];
  environmentByRoom?: ReadonlyMap<string, AreaEnvironmentReading>;
  selectedRoomId: string | null;
  selectedCameraId?: string | null;
  onSelectRoom: (room: FloorRoomSnapshot, trigger: SVGGElement) => void;
  onSelectCamera?: (camera: FloorCameraMarker, room: FloorRoomSnapshot, trigger: SVGGElement) => void;
  onHoverRoom: (room: FloorRoomSnapshot | null) => void;
  floorId?: string;
  floorName?: string;
  activeLayer?: FloorMapLayer;
  zoomPercent?: number;
  hasHistoricalData?: boolean;
};

function resolveEffectiveStatus(
  deviceStatus: OperationalStatus,
  envStatus: OperationalStatus = "normal",
): OperationalStatus {
  if (deviceStatus === "critical" || envStatus === "critical") return "critical";
  if (deviceStatus === "offline") return "offline";
  if (deviceStatus === "warning" || envStatus === "warning") return "warning";
  return "normal";
}

function handleRoomKeyDown(
  event: KeyboardEvent<SVGGElement>,
  room: FloorRoomSnapshot,
  onSelectRoom: (room: FloorRoomSnapshot, trigger: SVGGElement) => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelectRoom(room, event.currentTarget);
  }
}

function buildCameraFovPath(
  x: number,
  y: number,
  angleDeg: number,
  fovDeg: number,
  rangePx: number,
): { sectorPath: string; axisEnd: { x: number; y: number } } {
  const halfFov = fovDeg / 2;
  const startRad = ((angleDeg - halfFov) * Math.PI) / 180;
  const endRad = ((angleDeg + halfFov) * Math.PI) / 180;
  const midRad = (angleDeg * Math.PI) / 180;

  const x1 = Number((x + rangePx * Math.cos(startRad)).toFixed(1));
  const y1 = Number((y + rangePx * Math.sin(startRad)).toFixed(1));
  const x2 = Number((x + rangePx * Math.cos(endRad)).toFixed(1));
  const y2 = Number((y + rangePx * Math.sin(endRad)).toFixed(1));
  const axisX = Number((x + rangePx * 0.86 * Math.cos(midRad)).toFixed(1));
  const axisY = Number((y + rangePx * 0.86 * Math.sin(midRad)).toFixed(1));

  return {
    sectorPath: `M ${x} ${y} L ${x1} ${y1} A ${rangePx} ${rangePx} 0 0 1 ${x2} ${y2} Z`,
    axisEnd: { x: axisX, y: axisY },
  };
}

function Fixture({ fixture }: { fixture: NonNullable<SchematicRoomGeometry["fixtures"]>[number] }) {
  const { x, y, width, height, kind } = fixture;

  return (
    <g className={"floor-fixture floor-fixture--" + kind}>
      <rect x={x} y={y} width={width} height={height} rx={kind === "workstation" ? 3 : 2} />
      {kind === "workstation" && <path d={"M" + (x + width / 2) + " " + (y + 3) + "v" + (height - 6)} />}
      {kind === "meeting-table" && (
        <>
          <path d={"M" + (x + width * 0.25) + " " + (y + 4) + "v" + (height - 8) + "M" + (x + width * 0.75) + " " + (y + 4) + "v" + (height - 8)} />
          <circle cx={x + width * 0.14} cy={y - 4} r="3" />
          <circle cx={x + width * 0.86} cy={y - 4} r="3" />
        </>
      )}
      {kind === "server-rack" && (
        <>
          <path d={"M" + (x + 5) + " " + (y + height / 3) + "h" + (width - 10) + "M" + (x + 5) + " " + (y + (height * 2) / 3) + "h" + (width - 10)} />
          <circle cx={x + width - 7} cy={y + 7} r="1.7" />
        </>
      )}
      {kind === "counter" && (
        <>
          <path d={"M" + (x + 6) + " " + (y + height * 0.35) + "h" + (width - 12)} />
          <circle cx={x + width - 13} cy={y + height * 0.68} r="2" />
        </>
      )}
    </g>
  );
}

export default function Floor1SvgMap({
  rooms,
  geometry,
  cameras = [],
  environmentByRoom,
  selectedRoomId,
  selectedCameraId = null,
  onSelectRoom,
  onSelectCamera,
  onHoverRoom,
  floorId,
  floorName = "Floor 1",
  activeLayer = "status",
  zoomPercent = 100,
  hasHistoricalData = true,
}: Floor1SvgMapProps) {
  const isFloor2 = floorId === DEMO_FLOOR_2_ID;
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const geometryByRoom = geometry.flatMap((item) => {
    const room = roomsById.get(item.roomId);
    return room ? [{ room, item }] : [];
  });
  const emphasizeCameras = activeLayer === "cameras" || activeLayer === "devices";

  return (
    <div className="floor-map-viewport" data-zoom={`${zoomPercent}%`}>
      <svg
        className="floor-map-svg"
        viewBox="0 0 1200 660"
        role="group"
        aria-label={`Schematic map of ICS Headquarters ${floorName}`}
        preserveAspectRatio="xMidYMid meet"
        style={
          zoomPercent !== 100
            ? { width: `${zoomPercent}%`, minWidth: `${Math.round(620 * (zoomPercent / 100))}px` }
            : undefined
        }
      >
        <defs>
          <pattern id="floor-map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="rgb(104 170 192 / 8%)" strokeWidth="1" />
          </pattern>
          <linearGradient id="floor-map-floor" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#0c2030" />
            <stop offset="1" stopColor="#091722" />
          </linearGradient>
          <radialGradient id="floor-camera-fov-gradient" cx="0.2" cy="0.5" r="0.9">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.34" />
            <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.03" />
          </radialGradient>
        </defs>

        <rect width="1200" height="660" fill="url(#floor-map-floor)" />
        <rect width="1200" height="660" fill="url(#floor-map-grid)" />
        <path className="floor-plan-perimeter" d="M38 35H1162V625H38Z" />
        {isFloor2 ? (
          <>
            <path className="floor-plan-wall" d="M58 244H1142M58 396H1142M330 55V235M430 405V605M760 405V605" />
            <path className="floor-plan-circulation" d="M90 320H1110" />
            <path className="floor-plan-door" d="M194 235v17m552-17v17M244 388v17m361-17v17m356-17v17" />
          </>
        ) : (
          <>
            <path className="floor-plan-wall" d="M58 242H1142M270 55V230M840 55V230M270 438H698M840 438H1142" />
            <path className="floor-plan-circulation" d="M110 322H1086M770 260V410" />
            <path className="floor-plan-door" d="M176 230v12m336-12v12m371-12v12M160 395v43m327-43v43m300-43v43m262-43v43" />
          </>
        )}

        <g className="floor-fixtures-layer" aria-hidden="true">
          {geometryByRoom.flatMap(({ item }) => (item.fixtures ?? []).map((fixture, index) => (
            <Fixture key={item.roomId + "-fixture-" + index} fixture={fixture} />
          )))}
        </g>

        <g className="floor-map-orientation" aria-hidden="true">
          <path d="M1100 52v24m0-24-6 8m6-8 6 8" />
          <text x="1100" y="44" textAnchor="middle">N</text>
          <text x="67" y="645">{isFloor2 ? "EAST LOBBY / STAIRS" : "MAIN ENTRY"}</text>
          <text x="1138" y="645" textAnchor="end">{`ICS HEADQUARTERS · ${floorName.toUpperCase()}`}</text>
        </g>

        {geometryByRoom.map(({ room, item }) => {
          const envReading = environmentByRoom?.get(room.id);
          const envStatus = envReading?.status ?? "normal";
          const effectiveStatus = resolveEffectiveStatus(room.status, envStatus);
          const devicePresentation = statusPresentation[room.status];
          const effectivePresentation = statusPresentation[effectiveStatus];
          const envPresentation = statusPresentation[envStatus];
          const hasEnvWarningOnly = room.status === "normal" && envStatus !== "normal";
          const hasBothWarnings = room.status !== "normal" && envStatus !== "normal";
          const roomCameras = cameras.filter((cam) => cam.roomId === room.id);

          const defaultStateLine = hasEnvWarningOnly
            ? `${envPresentation.symbol} MÔI TRƯỜNG: ${envPresentation.label}`
            : hasBothWarnings
              ? `${effectivePresentation.symbol} TB: ${devicePresentation.label} · MT: ${envPresentation.label}`
              : `${effectivePresentation.symbol} ${effectivePresentation.label}`;

          const defaultMetricsLine = hasEnvWarningOnly && envReading
            ? `CO₂ ${envReading.co2Ppm.toLocaleString("en-US")} ppm · TB: BÌNH THƯỜNG (${room.onlineDeviceCount}/${room.deviceCount})`
            : `${room.temperature.toFixed(1)}°C · ${room.onlineDeviceCount}/${room.deviceCount} ONLINE`;

          let stateLine = defaultStateLine;
          let metricsLine = defaultMetricsLine;

          if (activeLayer === "environment") {
            stateLine = `${envPresentation.symbol} MÔI TRƯỜNG: ${envPresentation.label}`;
            metricsLine = `${room.temperature.toFixed(1)}°C · ${room.humidity}% · CO₂ ${envReading?.co2Ppm ?? "—"} ppm`;
          } else if (activeLayer === "devices") {
            stateLine = `${devicePresentation.symbol} THIẾT BỊ: ${devicePresentation.label}`;
            metricsLine = `${room.onlineDeviceCount}/${room.deviceCount} online · ${room.offlineDeviceCount} offline${roomCameras.length > 0 ? ` · ${roomCameras.length} CAM` : ""}`;
          } else if (activeLayer === "energy") {
            stateLine = `${effectivePresentation.symbol} ${effectivePresentation.label}`;
            metricsLine = hasHistoricalData
              ? `Điện năng: ${room.energyConsumption.toFixed(1)} kWh`
              : "Điện năng: Chưa có dữ liệu";
          } else if (activeLayer === "cameras") {
            stateLine = roomCameras.length > 0
              ? `✓ CAMERA: ${roomCameras.length} ĐANG KẾT NỐI`
              : "— KHÔNG LẮP CAMERA RIÊNG";
            metricsLine = roomCameras.length > 0
              ? roomCameras.map((cam) => cam.code).join(" · ")
              : "Giám sát qua camera hành lang/sảnh";
          }

          const selected = selectedRoomId === room.id;
          const points = item.boundary.map(({ x, y }) => x + "," + y).join(" ");
          const ariaLabel = hasEnvWarningOnly
            ? `${room.name}, ${envPresentation.label} (Môi trường: ${envPresentation.label} · CO₂ ${envReading?.co2Ppm ?? 0} ppm; Thiết bị: ${room.name}, ${devicePresentation.label}). ${room.temperature.toFixed(1)} degrees Celsius, ${room.deviceCount} devices.`
            : `${room.name}, ${effectivePresentation.label}. ${room.temperature.toFixed(1)} degrees Celsius, ${room.deviceCount} devices.`;

          const xs = item.boundary.map((point) => point.x);
          const roomBoundsWidth = Math.max(...xs) - Math.min(...xs);
          const desiredPlateWidth = hasEnvWarningOnly || hasBothWarnings || activeLayer !== "status" ? 216 : 184;
          const plateWidth = Math.min(desiredPlateWidth, Math.max(140, roomBoundsWidth - 16));

          return (
            <g
              key={room.id}
              className={
                "floor-room-region floor-room-region--" +
                effectiveStatus +
                (hasEnvWarningOnly ? " floor-room-region--env-warning" : "") +
                (selected ? " is-selected" : "")
              }
              role="button"
              tabIndex={0}
              aria-label={ariaLabel}
              aria-pressed={selected}
              onClick={(event) => onSelectRoom(room, event.currentTarget)}
              onKeyDown={(event) => handleRoomKeyDown(event, room, onSelectRoom)}
              onMouseEnter={() => onHoverRoom(room)}
              onMouseLeave={() => onHoverRoom(null)}
              onFocus={() => onHoverRoom(room)}
              onBlur={() => onHoverRoom(null)}
            >
              <title>{`${room.name} · ${stateLine} · ${room.temperature.toFixed(1)}°C`}</title>
              <polygon className="floor-room-boundary" points={points} />
              {selected && <polygon className="floor-room-selection" points={points} />}
              <rect
                className="floor-room-label-plate"
                x={item.label.x - plateWidth / 2}
                y={item.label.y - 22}
                width={plateWidth}
                height={78}
                rx={8}
              />
              <text className="floor-room-name" x={item.label.x} y={item.label.y} textAnchor="middle">
                {room.name}
              </text>
              <text className="floor-room-state" x={item.label.x} y={item.label.y + 24} textAnchor="middle">
                {stateLine}
              </text>
              <text className="floor-room-metrics" x={item.label.x} y={item.label.y + 44} textAnchor="middle">
                {metricsLine}
              </text>
            </g>
          );
        })}

        {cameras.length > 0 && (
          <g
            className={`floor-cameras-layer${emphasizeCameras ? " is-emphasized" : ""}`}
            aria-label={`Hệ thống camera giám sát trên ${floorName}`}
          >
            {cameras.map((camera) => {
              const room = roomsById.get(camera.roomId);
              if (!room) return null;
              const { sectorPath, axisEnd } = buildCameraFovPath(
                camera.position.x,
                camera.position.y,
                camera.angleDeg,
                camera.fovDeg,
                camera.rangePx,
              );
              const isSelectedCamera = selectedCameraId === camera.id || (selectedRoomId === camera.roomId && !selectedCameraId);
              const labelOffsetY = camera.position.y < 120 ? 22 : -16;
              const badgeX = Math.max(46, Math.min(1088, camera.position.x - 33));

              return (
                <g
                  key={camera.id}
                  className={`floor-camera-marker floor-camera-marker--${camera.status}${isSelectedCamera ? " is-selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Camera ${camera.code} · ${camera.resolution}`}
                  aria-pressed={selectedCameraId === camera.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (onSelectCamera) {
                      onSelectCamera(camera, room, event.currentTarget);
                    } else {
                      onSelectRoom(room, event.currentTarget);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      if (onSelectCamera) {
                        onSelectCamera(camera, room, event.currentTarget);
                      } else {
                        onSelectRoom(room, event.currentTarget);
                      }
                    }
                  }}
                >
                  <title>{`${camera.code} · ${camera.name}`}</title>
                  <path className="floor-camera-fov" d={sectorPath} fill="url(#floor-camera-fov-gradient)" />
                  <line
                    className="floor-camera-axis"
                    x1={camera.position.x}
                    y1={camera.position.y}
                    x2={axisEnd.x}
                    y2={axisEnd.y}
                  />
                  <circle className="floor-camera-node-halo" cx={camera.position.x} cy={camera.position.y} r="12" />
                  <circle className="floor-camera-node" cx={camera.position.x} cy={camera.position.y} r="8" />
                  <circle className="floor-camera-lens" cx={camera.position.x} cy={camera.position.y} r="3" />
                  <rect
                    className="floor-camera-badge"
                    x={badgeX}
                    y={camera.position.y + labelOffsetY - 11}
                    width="66"
                    height="16"
                    rx="4"
                  />
                  <text
                    className="floor-camera-code"
                    x={badgeX + 33}
                    y={camera.position.y + labelOffsetY}
                    textAnchor="middle"
                  >
                    {camera.code}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
}



