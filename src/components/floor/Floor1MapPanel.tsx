import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Layers, MapPinned, RotateCcw, Video, ZoomIn, ZoomOut } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { ACTIVE_FLOOR_ID, DEMO_FLOOR_2_ID } from "../../data/mock/buildingLocations";
import {
  TOTAL_BUILDING_CAMERA_QUOTA,
  allConfiguredCameras,
  getCamerasByFloor,
} from "../../data/mock/cameras.mock";
import { floor1SchematicGeometry } from "../../data/mock/floor1.mock";
import { floor2SchematicGeometry } from "../../data/mock/floor2.mock";
import { floor1EnvironmentThresholds } from "../../data/mock/floor1Environment.mock";
import { buildAreaEnvironmentReadings } from "../../features/environment/environmentSelectors";
import type { FloorCameraMarker, FloorRoomSnapshot } from "../../features/floor/types";
import { useTwinStore } from "../../features/twin/twinStore";
import type { OperationalStatus } from "../../types/models";
import Floor1SvgMap, { type FloorMapLayer } from "./Floor1SvgMap";
import RoomDetailDrawer from "./RoomDetailDrawer";

const statusLabels: Record<OperationalStatus, string> = {
  normal: "Bình thường",
  warning: "Cần chú ý",
  critical: "Critical",
  offline: "Offline",
};

const statusSymbols: Record<OperationalStatus, string> = {
  normal: "✓",
  warning: "!",
  critical: "!",
  offline: "×",
};

const ZOOM_STEPS = [85, 100, 120, 140] as const;

const LAYER_OPTIONS: readonly { id: FloorMapLayer; label: string }[] = [
  { id: "status", label: "Trạng thái" },
  { id: "environment", label: "Môi trường" },
  { id: "devices", label: "Thiết bị" },
  { id: "cameras", label: "Camera" },
  { id: "energy", label: "Năng lượng" },
];

function resolveEffectiveRoomStatus(
  deviceStatus: OperationalStatus,
  envStatus: OperationalStatus = "normal",
): OperationalStatus {
  if (deviceStatus === "critical" || envStatus === "critical") return "critical";
  if (deviceStatus === "offline") return "offline";
  if (deviceStatus === "warning" || envStatus === "warning") return "warning";
  return "normal";
}

export type Floor1MapPanelProps = {
  floorId?: string;
  floorName?: string;
  roomsOverride?: readonly FloorRoomSnapshot[];
  isStaticSample?: boolean;
  sampleDateLabel?: string;
  hasHistoricalData?: boolean;
};

export default function Floor1MapPanel({
  floorId = ACTIVE_FLOOR_ID,
  floorName = "Floor 1",
  roomsOverride,
  isStaticSample = false,
  sampleDateLabel = "08/10/2026",
  hasHistoricalData = true,
}: Floor1MapPanelProps = {}) {
  const [hoveredRoom, setHoveredRoom] = useState<FloorRoomSnapshot | null>(null);
  const [activeLayer, setActiveLayer] = useState<FloorMapLayer>("status");
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRoomTrigger = useRef<HTMLElement | SVGElement | null>(null);
  const drawerCloseButton = useRef<HTMLButtonElement>(null);
  const allRooms = useTwinStore((state) => state.rooms);
  const allDevices = useTwinStore((state) => state.devices);
  const allAirQuality = useTwinStore((state) => state.airQualityByRoom);

  const isFloor2 = floorId === DEMO_FLOOR_2_ID;
  const schematicGeometry = isFloor2 ? floor2SchematicGeometry : floor1SchematicGeometry;
  const floorCameras = useMemo(() => getCamerasByFloor(floorId), [floorId]);

  const rooms = useMemo(
    () => roomsOverride ?? allRooms.filter((room) => room.floorId === floorId),
    [allRooms, floorId, roomsOverride],
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

  const urlRoomId = searchParams.get("roomId");
  const lastSyncedUrlRoomKeyRef = useRef<string>("");
  const wasSelectedRoomRef = useRef<boolean>(false);
  const isInvalidUrlRoom = Boolean(urlRoomId && !roomIds.has(urlRoomId));

  useEffect(() => {
    const syncKey = `${floorId}:${urlRoomId ?? ""}`;
    if (lastSyncedUrlRoomKeyRef.current === syncKey) return;
    const prevParts = lastSyncedUrlRoomKeyRef.current.split(":");
    const prevUrlRoomId = prevParts.length > 1 ? prevParts.slice(1).join(":") : "";
    lastSyncedUrlRoomKeyRef.current = syncKey;

    if (urlRoomId) {
      if (roomIds.has(urlRoomId)) {
        selectRoom(urlRoomId);
      } else {
        selectRoom(null);
      }
      return;
    }

    if (prevUrlRoomId) {
      selectRoom(null);
    }
  }, [floorId, urlRoomId, roomIds, selectRoom]);

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
    if (selectedRoom) {
      wasSelectedRoomRef.current = true;
      drawerCloseButton.current?.focus();
    } else if (wasSelectedRoomRef.current) {
      wasSelectedRoomRef.current = false;
      if (selectedRoomTrigger.current?.isConnected) {
        selectedRoomTrigger.current.focus();
      }
    }
  }, [selectedRoom]);

  const selectRoomFromTrigger = (room: FloorRoomSnapshot, trigger: HTMLElement | SVGElement) => {
    selectedRoomTrigger.current = trigger;
    trigger.focus();
    setSelectedCameraId(null);
    lastSyncedUrlRoomKeyRef.current = `${floorId}:${room.id}`;
    selectRoom(room.id);
    if (urlRoomId !== room.id) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("roomId", room.id);
        return next;
      });
    }
  };

  const selectCameraFromTrigger = (
    camera: FloorCameraMarker,
    room: FloorRoomSnapshot,
    trigger: HTMLElement | SVGElement,
  ) => {
    selectedRoomTrigger.current = trigger;
    trigger.focus();
    setSelectedCameraId(camera.id);
    lastSyncedUrlRoomKeyRef.current = `${floorId}:${room.id}`;
    selectRoom(room.id);
    if (urlRoomId !== room.id) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("roomId", room.id);
        return next;
      });
    }
  };

  const closeRoomDrawer = () => {
    if (selectedRoomTrigger.current?.isConnected) selectedRoomTrigger.current.focus();
    setSelectedCameraId(null);
    lastSyncedUrlRoomKeyRef.current = `${floorId}:`;
    selectRoom(null);
    if (searchParams.has("roomId")) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("roomId");
        return next;
      });
    }
  };

  const clearInvalidRoomParam = () => {
    lastSyncedUrlRoomKeyRef.current = `${floorId}:`;
    selectRoom(null);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("roomId");
        return next;
      },
      { replace: true },
    );
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_STEPS.indexOf(zoomPercent as (typeof ZOOM_STEPS)[number]);
    if (currentIndex > 0) {
      setZoomPercent(ZOOM_STEPS[currentIndex - 1]!);
    }
  };

  const handleZoomIn = () => {
    const currentIndex = ZOOM_STEPS.indexOf(zoomPercent as (typeof ZOOM_STEPS)[number]);
    if (currentIndex >= 0 && currentIndex < ZOOM_STEPS.length - 1) {
      setZoomPercent(ZOOM_STEPS[currentIndex + 1]!);
    }
  };

  const handleZoomReset = () => {
    setZoomPercent(100);
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

  const eyebrowLabel = isFloor2
    ? "ICS HEADQUARTERS / FLOOR 2 · SƠ ĐỒ MINH HỌA"
    : `ICS HEADQUARTERS / ${floorName.toUpperCase()}`;

  return (
    <>
      <section className="overview-panel floor-status-panel floor1-map-panel" aria-labelledby="floor-map-title">
        <header className="overview-panel-heading">
          <div>
            <p className="section-eyebrow">{eyebrowLabel}</p>
            <div className="floor-map-title-row">
              <h2 id="floor-map-title">{`Sơ đồ vận hành ${floorName}`}</h2>
              <span className="floor-map-schematic-badge">Sơ đồ minh họa · Bố cục 2D mô phỏng</span>
              <span className="floor-map-camera-pill">
                <Video aria-hidden="true" size={12} />
                {`${floorCameras.length} camera trên tầng · ${allConfiguredCameras.length}/${TOTAL_BUILDING_CAMERA_QUOTA} toàn tòa`}
              </span>
            </div>
          </div>
          <span className="panel-heading-icon" aria-hidden="true"><MapPinned size={17} /></span>
        </header>

        {isInvalidUrlRoom && urlRoomId && (
          <div className="floor-map-invalid-room-banner" role="status">
            <span>
              {`Khu vực '${urlRoomId}' không tồn tại hoặc không thuộc ${floorName}. Vui lòng chọn khu vực hợp lệ trên sơ đồ.`}
            </span>
            <button
              type="button"
              className="floor-map-invalid-room-clear-btn"
              onClick={clearInvalidRoomParam}
            >
              Xóa tham số phòng
            </button>
          </div>
        )}

        <div className="floor-map-toolbar" role="toolbar" aria-label={`Công cụ sơ đồ ${floorName}`}>
          <div className="floor-map-layer-switcher" role="group" aria-label="Lớp hiển thị">
            <span className="floor-map-toolbar-label">
              <Layers aria-hidden="true" size={13} /> Lớp hiển thị:
            </span>
            {LAYER_OPTIONS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={`floor-map-layer-btn${activeLayer === layer.id ? " is-active" : ""}`}
                aria-pressed={activeLayer === layer.id}
                onClick={() => setActiveLayer(layer.id)}
              >
                {layer.id === "cameras" ? `Camera (${floorCameras.length})` : layer.label}
              </button>
            ))}
          </div>

          <div className="floor-map-zoom-controls" role="group" aria-label="Điều khiển phóng to thu nhỏ">
            <button
              type="button"
              className="floor-map-zoom-btn"
              aria-label="Thu nhỏ (Zoom out)"
              disabled={zoomPercent <= ZOOM_STEPS[0]}
              onClick={handleZoomOut}
            >
              <ZoomOut aria-hidden="true" size={14} />
              <span>Thu nhỏ</span>
            </button>
            <button
              type="button"
              className="floor-map-zoom-btn floor-map-zoom-reset-btn"
              aria-label="Đặt lại khung nhìn (Fit/Reset)"
              onClick={handleZoomReset}
            >
              <RotateCcw aria-hidden="true" size={13} />
              <span>{`${zoomPercent}% · Đặt lại`}</span>
            </button>
            <button
              type="button"
              className="floor-map-zoom-btn"
              aria-label="Phóng to (Zoom in)"
              disabled={zoomPercent >= ZOOM_STEPS[ZOOM_STEPS.length - 1]!}
              onClick={handleZoomIn}
            >
              <ZoomIn aria-hidden="true" size={14} />
              <span>Phóng to</span>
            </button>
          </div>
        </div>

        <div className="floor-map-stage">
          <Floor1SvgMap
            rooms={rooms}
            geometry={schematicGeometry}
            cameras={floorCameras}
            environmentByRoom={environmentByRoom}
            selectedRoomId={selectedRoomId}
            selectedCameraId={selectedCameraId}
            onSelectRoom={selectRoomFromTrigger}
            onSelectCamera={selectCameraFromTrigger}
            onHoverRoom={setHoveredRoom}
            floorId={floorId}
            floorName={floorName}
            activeLayer={activeLayer}
            zoomPercent={zoomPercent}
            hasHistoricalData={hasHistoricalData}
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
              <span>
                {hasHistoricalData
                  ? `${hoveredRoom.energyConsumption.toFixed(1)} kWh ${isStaticSample || isFloor2 ? `(${sampleDateLabel})` : "hôm nay"}`
                  : `Điện năng: Chưa có dữ liệu (${sampleDateLabel})`} · {hoveredRoom.onlineDeviceCount}/{hoveredRoom.deviceCount} online
              </span>
            </div>
          )}
        </div>

        <footer className="floor-map-footer">
          <div className="floor-map-legend" aria-label="Room status legend">
            <span className="floor-map-legend-item floor-map-legend-item--normal"><i>✓</i> Bình thường</span>
            <span className="floor-map-legend-item floor-map-legend-item--warning"><i>!</i> Cần chú ý (Thiết bị / Môi trường)</span>
            <span className="floor-map-legend-item floor-map-legend-item--critical"><i>!</i> Critical</span>
            <span className="floor-map-legend-item floor-map-legend-item--offline"><i>×</i> Offline</span>
            <span className="floor-map-legend-item floor-map-legend-item--camera"><i>◉</i> Camera & góc quét (FOV)</span>
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

          <div className="floor-map-room-directory" aria-label={`Danh sách khu vực trên ${floorName}`}>
            <strong>{`Danh sách khu vực trên tầng (${rooms.length} khu vực · ${floorCameras.length} camera)`}</strong>
            <div className="floor-map-room-directory-grid" role="list">
              {rooms.map((room) => {
                const envReading = environmentByRoom.get(room.id);
                const envStatus = envReading?.status ?? "normal";
                const effectiveStatus = resolveEffectiveRoomStatus(room.status, envStatus);
                const isSelected = selectedRoomId === room.id;
                const roomCameraCount = floorCameras.filter((cam) => cam.roomId === room.id).length;
                return (
                  <div
                    key={room.id}
                    role="listitem"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Chọn khu vực ${room.name} (${statusLabels[effectiveStatus]})`}
                    className={`floor-map-directory-item floor-map-directory-item--${effectiveStatus}${isSelected ? " is-selected" : ""}`}
                    onClick={(event) => selectRoomFromTrigger(room, event.currentTarget)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectRoomFromTrigger(room, event.currentTarget);
                      }
                    }}
                  >
                    <div className="floor-map-directory-head">
                      <strong>{room.name}</strong>
                      <span className={`floor-map-directory-badge floor-map-directory-badge--${effectiveStatus}`}>
                        <i>{statusSymbols[effectiveStatus]}</i> {statusLabels[effectiveStatus]}
                      </span>
                    </div>
                    <div className="floor-map-directory-metrics">
                      <span>{`${room.temperature.toFixed(1)}°C · ${room.humidity}%`}</span>
                      <span>{envReading ? `CO₂ ${envReading.co2Ppm.toLocaleString("en-US")} ppm` : "CO₂ —"}</span>
                      <span>{hasHistoricalData ? `${room.energyConsumption.toFixed(1)} kWh` : "Chưa có dữ liệu"}</span>
                      <span>
                        {`${room.onlineDeviceCount}/${room.deviceCount} online${roomCameraCount > 0 ? ` · ${roomCameraCount} CAM` : ""}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <span className="floor-map-hint">
            {`Hệ thống CCTV: ${floorCameras.length} camera trên ${floorName} (${floorCameras.map((c) => c.code).join(", ")}) · Toàn tòa nhà: ${allConfiguredCameras.length}/${TOTAL_BUILDING_CAMERA_QUOTA} camera đã kết nối (Tầng 3–5: 2 camera/tầng chưa cấu hình)`}
          </span>
        </footer>
      </section>

      {selectedRoom && (
        <RoomDetailDrawer
          room={selectedRoom}
          environmentReading={environmentByRoom.get(selectedRoom.id)}
          closeButtonRef={drawerCloseButton}
          onClose={closeRoomDrawer}
          hasHistoricalData={hasHistoricalData}
          isStaticSample={isStaticSample}
          sampleDateLabel={sampleDateLabel}
          selectedCameraId={selectedCameraId}
        />
      )}
    </>
  );
}


