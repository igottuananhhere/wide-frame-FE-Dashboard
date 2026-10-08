import type { KeyboardEvent } from "react";
import type { FloorRoomSnapshot, SchematicRoomGeometry } from "../../features/floor/types";
import type { OperationalStatus } from "../../types/models";

const statusPresentation: Record<OperationalStatus, { label: string; symbol: string }> = {
  normal: { label: "BÌNH THƯỜNG", symbol: "✓" },
  warning: { label: "CẦN CHÚ Ý", symbol: "!" },
  critical: { label: "CRITICAL", symbol: "!" },
  offline: { label: "OFFLINE", symbol: "×" },
};

type Floor1SvgMapProps = {
  rooms: readonly FloorRoomSnapshot[];
  geometry: readonly SchematicRoomGeometry[];
  selectedRoomId: string | null;
  onSelectRoom: (room: FloorRoomSnapshot) => void;
  onHoverRoom: (room: FloorRoomSnapshot | null) => void;
};

function handleRoomKeyDown(
  event: KeyboardEvent<SVGGElement>,
  room: FloorRoomSnapshot,
  onSelectRoom: (room: FloorRoomSnapshot) => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelectRoom(room);
  }
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
  selectedRoomId,
  onSelectRoom,
  onHoverRoom,
}: Floor1SvgMapProps) {
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const geometryByRoom = geometry.flatMap((item) => {
    const room = roomsById.get(item.roomId);
    return room ? [{ room, item }] : [];
  });

  return (
    <div className="floor-map-viewport">
      <svg
        className="floor-map-svg"
        viewBox="0 0 1200 660"
        role="group"
        aria-label="Schematic map of ICS Headquarters Floor 1"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="floor-map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="rgb(104 170 192 / 8%)" strokeWidth="1" />
          </pattern>
          <linearGradient id="floor-map-floor" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#0c2030" />
            <stop offset="1" stopColor="#091722" />
          </linearGradient>
        </defs>

        <rect width="1200" height="660" fill="url(#floor-map-floor)" />
        <rect width="1200" height="660" fill="url(#floor-map-grid)" />
        <path className="floor-plan-perimeter" d="M38 35H1162V625H38Z" />
        <path className="floor-plan-wall" d="M58 242H1142M270 55V230M840 55V230M270 438H698M840 438H1142" />
        <path className="floor-plan-circulation" d="M110 322H1086M770 260V410" />
        <path className="floor-plan-door" d="M176 230v12m336-12v12m371-12v12M160 395v43m327-43v43m300-43v43m262-43v43" />

        <g className="floor-fixtures-layer" aria-hidden="true">
          {geometryByRoom.flatMap(({ item }) => (item.fixtures ?? []).map((fixture, index) => (
            <Fixture key={item.roomId + "-fixture-" + index} fixture={fixture} />
          )))}
        </g>

        <g className="floor-map-orientation" aria-hidden="true">
          <path d="M1100 52v24m0-24-6 8m6-8 6 8" />
          <text x="1100" y="44" textAnchor="middle">N</text>
          <text x="67" y="645">MAIN ENTRY</text>
          <text x="1138" y="645" textAnchor="end">ICS HEADQUARTERS · FLOOR 1</text>
        </g>

        {geometryByRoom.map(({ room, item }) => {
          const status = statusPresentation[room.status];
          const selected = selectedRoomId === room.id;
          const points = item.boundary.map(({ x, y }) => x + "," + y).join(" ");
          const ariaLabel = room.name + ", " + status.label + ". " + room.temperature.toFixed(1) + " degrees Celsius, " + room.deviceCount + " devices.";

          return (
            <g
              key={room.id}
              className={"floor-room-region floor-room-region--" + room.status + (selected ? " is-selected" : "")}
              role="button"
              tabIndex={0}
              aria-label={ariaLabel}
              aria-pressed={selected}
              onClick={() => onSelectRoom(room)}
              onKeyDown={(event) => handleRoomKeyDown(event, room, onSelectRoom)}
              onMouseEnter={() => onHoverRoom(room)}
              onMouseLeave={() => onHoverRoom(null)}
              onFocus={() => onHoverRoom(room)}
              onBlur={() => onHoverRoom(null)}
            >
              <title>{room.name + " · " + status.label + " · " + room.temperature.toFixed(1) + "°C"}</title>
              <polygon className="floor-room-boundary" points={points} />
              {selected && <polygon className="floor-room-selection" points={points} />}
              <text className="floor-room-name" x={item.label.x} y={item.label.y} textAnchor="middle">
                {room.name}
              </text>
              <text className="floor-room-state" x={item.label.x} y={item.label.y + 26} textAnchor="middle">
                {status.symbol} {status.label}
              </text>
              <text className="floor-room-metrics" x={item.label.x} y={item.label.y + 48} textAnchor="middle">
                {room.temperature.toFixed(1)}°C · {room.onlineDeviceCount}/{room.deviceCount} ONLINE
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
