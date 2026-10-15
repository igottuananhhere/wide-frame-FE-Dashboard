import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import { ACTIVE_FLOOR_ID } from "../../data/mock/buildingLocations";
import { floor1SchematicGeometry } from "../../data/mock/floor1.mock";
import { floor1EnvironmentThresholds } from "../../data/mock/floor1Environment.mock";
import { buildAreaEnvironmentReadings } from "../../features/environment/environmentSelectors";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import { useTwinStore } from "../../features/twin/twinStore";
import type { OperationalStatus } from "../../types/models";
import Floor1SvgMap from "./Floor1SvgMap";
import RoomDetailDrawer from "./RoomDetailDrawer";

const statusLabels: Record<OperationalStatus, string> = {
  normal: "Bình thường",
  warning: "Cần chú ý",
  critical: "Critical",
  offline: "Offline",
};

function resolveEffectiveRoomStatus(
  deviceStatus: OperationalStatus,
  envStatus: OperationalStatus = "normal",
): OperationalStatus {
  if (deviceStatus === "critical" || envStatus === "critical") return "critical";
  if (deviceStatus === "offline") return "offline";
  if (deviceStatus === "warning" || envStatus === "warning") return "warning";
  return "normal";
}

export default function Floor1MapPanel() {
  const [hoveredRoom, setHoveredRoom] = useState<FloorRoomSnapshot | null>(null);
  const selectedRoomTrigger = useRef<HTMLElement | SVGElement | null>(null);
  const drawerCloseButton = useRef<HTMLButtonElement>(null);
  const allRooms = useTwinStore((state) => state.rooms);
  const allDevices = useTwinStore((state) => state.devices);
  const allAirQuality = useTwinStore((state) => state.airQualityByRoom);
  const rooms = useMemo(
    () => allRooms.filter((room) => room.floorId === ACTIVE_FLOOR_ID),
    [allRooms],
  );
  const roomIds = useMemo(() => new Set(rooms.map((room) => room.id)), [rooms]);
  const devices = useMemo(
    () => allDevices.filter((device) => roomIds.has(device.roomId)),
    [allDevices, roomIds],
  );
  const airQualityByRoom = useMemo(
    () => allAirQuality.filter((reading) => roomIds.has(reading.roomId)),
    [allAirQuality, roomIds],
  );
  const environmentReadings = useMemo(
    () => buildAreaEnvironmentReadings(rooms, airQualityByRoom, floor1EnvironmentThresholds),
    [rooms, airQualityByRoom],
  );
  const environmentByRoom = useMemo(
    () => new Map(environmentReadings.map((reading) => [reading.roomId, reading])),
    [environmentReadings],
  );

  const selectedRoomId = useTwinStore((state) => state.selectedRoomId);
  const selectRoom = useTwinStore((state) => state.selectRoom);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;

  const operationalExceptions = useMemo(
    () => rooms.filter((room) => {
      const envStatus = environmentByRoom.get(room.id)?.status ?? "normal";
      return room.status !== "normal" || envStatus !== "normal";
    }),
    [rooms, environmentByRoom],
  );

  const deviceExceptionRoomCount = useMemo(
    () => rooms.filter((room) => room.status !== "normal").length,
    [rooms],
  );
  const envExceptionRoomCount = useMemo(
    () => rooms.filter((room) => (environmentByRoom.get(room.id)?.status ?? "normal") !== "normal").length,
    [rooms, environmentByRoom],
  );

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
    const causes: string[] = [];
    const envReading = environmentByRoom.get(room.id);

    for (const device of devices.filter((item) => item.roomId === room.id)) {
      if (device.status === "offline") {
        causes.push(`Thiết bị: ${device.name} mất kết nối`);
      } else if (device.status === "critical") {
        causes.push(`Thiết bị: ${device.name} vượt ngưỡng nguy cấp`);
      } else if (device.status === "warning") {
        causes.push(`Thiết bị: ${device.name} cảnh báo`);
      } else if (device.maintenanceHoursRemaining !== undefined && device.maintenanceHoursRemaining <= 12) {
        causes.push(
          device.maintenanceHoursRemaining === 0
            ? `Bảo trì: ${device.name} đến hạn bảo trì`
            : `Bảo trì: ${device.name} sắp đến hạn (còn ${device.maintenanceHoursRemaining}h)`,
        );
      }
    }

    if (room.temperature >= floor1EnvironmentThresholds.temperatureCriticalC!) {
      causes.unshift(`Môi trường: Nhiệt độ ${room.temperature.toFixed(1)}°C · Critical`);
    } else if (room.temperature >= floor1EnvironmentThresholds.temperatureMaxC) {
      causes.unshift(`Môi trường: Nhiệt độ ${room.temperature.toFixed(1)}°C · Cảnh báo`);
    }

    if (envReading && (envReading.co2Status === "warning" || envReading.co2Status === "critical")) {
      causes.push(
        `Môi trường: CO₂ ${envReading.co2Ppm.toLocaleString("en-US")} ppm vượt ngưỡng (≤ ${floor1EnvironmentThresholds.co2MaxPpm.toLocaleString("en-US")} ppm) · Thiết bị ${room.onlineDeviceCount}/${room.deviceCount} online`,
      );
    }

    if (envReading && (envReading.pm25Status === "warning" || envReading.pm25Status === "critical")) {
      causes.push(
        `Môi trường: PM2.5 ${envReading.pm25Micrograms} µg/m³ vượt ngưỡng (≤ ${floor1EnvironmentThresholds.pm25MaxMicrograms} µg/m³)`,
      );
    }

    const offlineNamedCount = causes.filter((cause) => cause.includes("mất kết nối")).length;
    if (room.offlineDeviceCount > offlineNamedCount) {
      causes.push(`${room.offlineDeviceCount} thiết bị offline theo tổng khu vực`);
    }

    return causes.join(" · ") || "Trạng thái vận hành cần kiểm tra";
  };

  const roomStatusSummaryLabel = (room: FloorRoomSnapshot) => {
    const envStatus = environmentByRoom.get(room.id)?.status ?? "normal";
    if (room.status === "normal" && envStatus !== "normal") {
      return `Môi trường: ${statusLabels[envStatus]} · Thiết bị: Bình thường`;
    }
    if (room.status !== "normal" && envStatus !== "normal") {
      return `Thiết bị: ${statusLabels[room.status]} · Môi trường: ${statusLabels[envStatus]}`;
    }
    return `Thiết bị: ${statusLabels[room.status]}`;
  };

  const hoveredEnv = hoveredRoom ? environmentByRoom.get(hoveredRoom.id) : undefined;
  const hoveredEffectiveStatus = hoveredRoom
    ? resolveEffectiveRoomStatus(hoveredRoom.status, hoveredEnv?.status ?? "normal")
    : "normal";

  return (
    <>
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
            environmentByRoom={environmentByRoom}
            selectedRoomId={selectedRoomId}
            onSelectRoom={selectRoomFromTrigger}
            onHoverRoom={setHoveredRoom}
          />

          {hoveredRoom && (
            <div className="floor-map-tooltip" role="tooltip">
              <div>
                <strong>{hoveredRoom.name}</strong>
                <span className={"floor-map-tooltip-status floor-map-tooltip-status--" + hoveredEffectiveStatus}>
                  {roomStatusSummaryLabel(hoveredRoom)}
                </span>
              </div>
              <span>
                {hoveredRoom.temperature.toFixed(1)}°C <i /> {hoveredRoom.humidity}% RH
                {hoveredEnv ? <> <i /> CO₂ {hoveredEnv.co2Ppm.toLocaleString("en-US")} ppm</> : null}
              </span>
              <span>{hoveredRoom.energyConsumption.toFixed(1)} kWh hôm nay · {hoveredRoom.onlineDeviceCount}/{hoveredRoom.deviceCount} online</span>
            </div>
          )}
        </div>

        <footer className="floor-map-footer">
          <div className="floor-map-legend" aria-label="Room status legend">
            <span className="floor-map-legend-item floor-map-legend-item--normal"><i>✓</i> Bình thường</span>
            <span className="floor-map-legend-item floor-map-legend-item--warning"><i>!</i> Cần chú ý (Thiết bị / Môi trường)</span>
            <span className="floor-map-legend-item floor-map-legend-item--critical"><i>!</i> Critical</span>
            <span className="floor-map-legend-item floor-map-legend-item--offline"><i>×</i> Offline</span>
          </div>
          <div className="floor-map-exception-summary" aria-label="Tóm tắt ngoại lệ vận hành">
            <strong>
              {operationalExceptions.length} khu vực có ngoại lệ vận hành ({deviceExceptionRoomCount} khu vực thiết bị/bảo trì · {envExceptionRoomCount} khu vực môi trường)
            </strong>
            {operationalExceptions.length > 0 ? (
              <div className="floor-map-exception-list" role="list">
                {operationalExceptions.map((room) => {
                  const envStatus = environmentByRoom.get(room.id)?.status ?? "normal";
                  const effectiveStatus = resolveEffectiveRoomStatus(room.status, envStatus);
                  const statusSummary = roomStatusSummaryLabel(room);
                  return (
                    <div
                      aria-label={`${room.name}: ${statusSummary}. ${roomCause(room)}. Chọn để xem chi tiết.`}
                      className={`floor-map-exception floor-map-exception--${effectiveStatus}`}
                      key={room.id}
                      onClick={(event) => selectRoomFromTrigger(room, event.currentTarget)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectRoomFromTrigger(room, event.currentTarget);
                        }
                      }}
                      role="listitem"
                      tabIndex={0}
                    >
                      <span><b>{room.name}</b><i>{statusSummary}</i></span>
                      <small>{roomCause(room)}</small>
                    </div>
                  );
                })}
              </div>
            ) : <span className="floor-map-hint">Tất cả khu vực đang bình thường</span>}
          </div>
          <span className="floor-map-hint">Chọn khu vực trên sơ đồ hoặc danh sách để xem telemetry thiết bị và môi trường</span>
        </footer>
      </section>

      {selectedRoom && (
        <RoomDetailDrawer
          room={selectedRoom}
          environmentReading={environmentByRoom.get(selectedRoom.id)}
          closeButtonRef={drawerCloseButton}
          onClose={closeRoomDrawer}
        />
      )}
    </>
  );
}

