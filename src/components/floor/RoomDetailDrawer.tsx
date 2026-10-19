import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Clock3,
  Cpu,
  Droplets,
  Info,
  Lightbulb,
  Minus,
  Plus,
  Power,
  Snowflake,
  Thermometer,
  Video,
  Wifi,
  WifiOff,
  Wind,
  X,
  Zap,
} from "lucide-react";
import type { RefObject } from "react";
import { ACTIVE_FLOOR_ID, DEMO_FLOOR_2_ID } from "../../data/mock/buildingLocations";
import { getCamerasByRoom } from "../../data/mock/cameras.mock";
import { formatTelemetryTime } from "../../features/building/dataFreshness";
import type { AreaEnvironmentReading } from "../../features/environment/types";
import type { FloorCameraMarker, FloorRoomSnapshot } from "../../features/floor/types";
import { useTwinStore } from "../../features/twin/twinStore";
import type { OperationalStatus } from "../../types/models";
import ScopedDashboardLink from "../common/ScopedDashboardLink";
import StatusBadge from "../dashboard/StatusBadge";

type AcMode = "Cool" | "Dry" | "Fan";

interface RoomLightConfig {
  id: string;
  code: string;
  name: string;
  defaultOn: boolean;
  twinDeviceId?: string;
  defaultStatus?: OperationalStatus;
}

interface RoomAcConfig {
  id: string;
  code: string;
  name: string;
  defaultOn: boolean;
  defaultTemp: number;
  minTemp?: number;
  maxTemp?: number;
  defaultMode: AcMode;
  supportedModes?: readonly AcMode[];
  twinDeviceId?: string;
  defaultStatus?: OperationalStatus;
}

interface RoomQuickControlCatalog {
  lights: readonly RoomLightConfig[];
  airConditioners: readonly RoomAcConfig[];
}

interface AcControlState {
  isOn: boolean;
  targetTemp: number;
  mode: AcMode;
}

const ROOM_QUICK_CONTROLS: Record<string, RoomQuickControlCatalog> = {
  "room-lobby-01": {
    lights: [
      { id: "light-lobby-01", code: "LT-LB-01", name: "Đèn sảnh chính", defaultOn: true },
    ],
    airConditioners: [
      {
        id: "ac-lobby-01",
        code: "AC-01",
        name: "Điều hòa sảnh",
        defaultOn: true,
        defaultTemp: 24,
        defaultMode: "Cool",
        supportedModes: ["Cool", "Dry", "Fan"],
      },
    ],
  },
  "room-workspace-01": {
    lights: [
      { id: "light-ws-01", code: "LT-WS-01", name: "Đèn khu làm việc Dãy A", defaultOn: true },
      { id: "light-ws-02", code: "LT-WS-02", name: "Đèn khu làm việc Dãy B", defaultOn: true },
      {
        id: "light-ws-08",
        code: "WS-08",
        name: "Đèn cụm bàn WS-08",
        defaultOn: false,
        twinDeviceId: "device-workspace-08",
      },
    ],
    airConditioners: [
      {
        id: "ac-ws-03",
        code: "AC-03",
        name: "Điều hòa trung tâm AC-03",
        defaultOn: true,
        defaultTemp: 24,
        defaultMode: "Cool",
        supportedModes: ["Cool", "Dry", "Fan"],
        twinDeviceId: "device-ac-03",
      },
      {
        id: "ac-ws-04",
        code: "AC-04",
        name: "Điều hòa phụ trợ AC-04",
        defaultOn: true,
        defaultTemp: 25,
        defaultMode: "Cool",
        supportedModes: ["Cool", "Dry", "Fan"],
      },
    ],
  },
  "room-server-01": {
    lights: [
      { id: "light-srv-01", code: "LT-SRV-01", name: "Đèn phòng Server", defaultOn: true },
    ],
    airConditioners: [
      {
        id: "ac-srv-01",
        code: "CRAC-01",
        name: "Điều hòa chính xác CRAC-01",
        defaultOn: true,
        defaultTemp: 20,
        minTemp: 16,
        maxTemp: 26,
        defaultMode: "Cool",
        supportedModes: ["Cool", "Dry", "Fan"],
      },
      {
        id: "ac-srv-02",
        code: "CRAC-02",
        name: "Điều hòa dự phòng CRAC-02",
        defaultOn: true,
        defaultTemp: 21,
        minTemp: 16,
        maxTemp: 26,
        defaultMode: "Cool",
        supportedModes: ["Cool", "Dry"],
      },
    ],
  },
  "room-corridor-01": {
    lights: [
      { id: "light-cor-01", code: "LT-COR-01", name: "Đèn hành lang chính", defaultOn: true },
    ],
    airConditioners: [],
  },
  "room-meeting-01": {
    lights: [
      { id: "light-mt1-01", code: "LT-MT1-01", name: "Đèn phòng họp 01", defaultOn: true },
    ],
    airConditioners: [
      {
        id: "ac-mt1-01",
        code: "AC-MT1",
        name: "Điều hòa Meeting Room 01",
        defaultOn: true,
        defaultTemp: 24,
        defaultMode: "Cool",
        supportedModes: ["Cool", "Dry", "Fan"],
      },
    ],
  },
  "room-meeting-02": {
    lights: [
      { id: "light-mt2-01", code: "LT-MT2-01", name: "Đèn chính phòng họp 02", defaultOn: true },
      { id: "light-mt2-02", code: "LT-MT2-02", name: "Đèn trình chiếu", defaultOn: false },
    ],
    airConditioners: [
      {
        id: "ac-mt2-01",
        code: "AC-MT2",
        name: "Điều hòa Meeting Room 02",
        defaultOn: true,
        defaultTemp: 23,
        defaultMode: "Cool",
        supportedModes: ["Cool", "Dry", "Fan"],
        twinDeviceId: "device-temp-04",
      },
    ],
  },
  "room-pantry-01": {
    lights: [
      { id: "light-pnt-01", code: "LT-PNT-01", name: "Đèn khu vực Pantry", defaultOn: true },
    ],
    airConditioners: [],
  },
  "room-utility-01": {
    lights: [
      {
        id: "light-ut-01",
        code: "UT-01",
        name: "Đèn kỹ thuật Utility Room",
        defaultOn: false,
        twinDeviceId: "device-utility-01",
        defaultStatus: "offline",
      },
    ],
    airConditioners: [],
  },
  "room-corridor-02": {
    lights: [
      { id: "light-cor-02", code: "LT-COR-02", name: "Đèn hành lang Tầng 2", defaultOn: true },
    ],
    airConditioners: [],
  },
};

function CctvWireframeViewport({ camera }: { camera: FloorCameraMarker }) {
  const { sceneKind } = camera;
  return (
    <svg
      className="room-cctv-svg"
      viewBox="0 0 320 148"
      role="img"
      aria-label={`Khung hình mô phỏng ${camera.code} - ${camera.name}`}
    >
      <defs>
        <linearGradient id={`cctv-bg-${camera.id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#071521" />
          <stop offset="100%" stopColor="#0c2233" />
        </linearGradient>
        <pattern id={`cctv-grid-${camera.id}`} width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="rgb(56 189 248 / 9%)" strokeWidth="0.7" />
        </pattern>
      </defs>
      <rect width="320" height="148" fill={`url(#cctv-bg-${camera.id})`} />
      <rect width="320" height="148" fill={`url(#cctv-grid-${camera.id})`} />

      {sceneKind === "corridor-west" || sceneKind === "corridor-east" ? (
        <g stroke="#38bdf8" strokeOpacity="0.45" fill="none" strokeWidth="1.2">
          <polygon points="96,42 224,42 224,104 96,104" strokeOpacity="0.35" />
          <line x1="0" y1="8" x2="96" y2="42" />
          <line x1="320" y1="8" x2="224" y2="42" />
          <line x1="0" y1="142" x2="96" y2="104" />
          <line x1="320" y1="142" x2="224" y2="104" />
          <line x1="52" y1="26" x2="52" y2="124" strokeOpacity="0.28" />
          <line x1="268" y1="26" x2="268" y2="124" strokeOpacity="0.28" />
          <rect x="134" y="18" width="52" height="6" rx="2" fill="#38bdf8" fillOpacity="0.25" />
          <path d="M118 142 L145 104 M202 142 L175 104" strokeDasharray="3 3" strokeOpacity="0.3" />
        </g>
      ) : sceneKind === "server-room" ? (
        <g stroke="#38bdf8" strokeOpacity="0.48" fill="none" strokeWidth="1.2">
          <rect x="34" y="28" width="64" height="96" rx="3" fill="#0f293d" fillOpacity="0.55" />
          <rect x="128" y="28" width="64" height="96" rx="3" fill="#0f293d" fillOpacity="0.55" />
          <rect x="222" y="28" width="64" height="96" rx="3" fill="#0f293d" fillOpacity="0.55" />
          <path d="M44 48h44M44 68h44M44 88h44M138 48h44M138 68h44M138 88h44M232 48h44M232 68h44M232 88h44" strokeOpacity="0.35" />
          <circle cx="88" cy="38" r="2.2" fill="#22c55e" stroke="none" />
          <circle cx="182" cy="38" r="2.2" fill="#22c55e" stroke="none" />
          <circle cx="276" cy="38" r="2.2" fill="#22c55e" stroke="none" />
        </g>
      ) : (
        <g stroke="#38bdf8" strokeOpacity="0.45" fill="none" strokeWidth="1.2">
          <line x1="0" y1="112" x2="320" y2="112" strokeOpacity="0.3" />
          <rect x="36" y="72" width="112" height="40" rx="3" fill="#0f293d" fillOpacity="0.5" />
          <line x1="46" y1="84" x2="138" y2="84" strokeOpacity="0.35" />
          <rect x="192" y="34" width="90" height="78" rx="3" strokeOpacity="0.4" />
          <line x1="237" y1="34" x2="237" y2="112" strokeOpacity="0.3" />
        </g>
      )}

      <g stroke="#38bdf8" strokeOpacity="0.28" strokeWidth="1" fill="none">
        <path d="M12 24V12H24M296 12H308V24M12 124V136H24M296 136H308V124" />
        <circle cx="160" cy="74" r="14" strokeDasharray="2 3" />
        <path d="M153 74h14M160 67v14" />
      </g>
    </svg>
  );
}

function buildInitialLightStates(): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  for (const catalog of Object.values(ROOM_QUICK_CONTROLS)) {
    for (const light of catalog.lights) {
      initial[light.id] = light.defaultOn;
    }
  }
  return initial;
}

function buildInitialAcStates(): Record<string, AcControlState> {
  const initial: Record<string, AcControlState> = {};
  for (const catalog of Object.values(ROOM_QUICK_CONTROLS)) {
    for (const ac of catalog.airConditioners) {
      initial[ac.id] = {
        isOn: ac.defaultOn,
        targetTemp: ac.defaultTemp,
        mode: ac.defaultMode,
      };
    }
  }
  return initial;
}

const deviceStatusBadgeLabel: Record<OperationalStatus, string> = {
  normal: "Online",
  warning: "Cần chú ý",
  critical: "Critical",
  offline: "Offline",
};

const trackedDeviceStatusLabel: Record<OperationalStatus, string> = {
  normal: "Hoạt động tốt",
  warning: "Cần chú ý",
  critical: "Critical",
  offline: "Mất kết nối",
};

type RoomDetailDrawerProps = {
  room: FloorRoomSnapshot;
  environmentReading?: AreaEnvironmentReading;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  hasHistoricalData?: boolean;
  isStaticSample?: boolean;
  sampleDateLabel?: string;
  selectedCameraId?: string | null;
};

export default function RoomDetailDrawer({
  room,
  environmentReading,
  closeButtonRef,
  onClose,
  hasHistoricalData = true,
  isStaticSample = false,
  sampleDateLabel = "08/10/2026",
  selectedCameraId = null,
}: RoomDetailDrawerProps) {
  const onCloseRef = useRef(onClose);
  const twinDevices = useTwinStore((state) => state.devices);
  const twinSensors = useTwinStore((state) => state.sensors);
  const twinAlerts = useTwinStore((state) => state.alerts);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const lastUpdatedByFloor = useTwinStore((state) => state.lastUpdatedByFloor);
  const [lightStates, setLightStates] = useState<Record<string, boolean>>(buildInitialLightStates);
  const [acStates, setAcStates] = useState<Record<string, AcControlState>>(buildInitialAcStates);
  const roomCameras = getCamerasByRoom(room.id);
  const [manualCameraOverride, setManualCameraOverride] = useState<{
    roomId: string;
    propCameraId: string | null;
    cameraId: string;
  } | null>(null);

  const activeCameraId =
    manualCameraOverride &&
    manualCameraOverride.roomId === room.id &&
    manualCameraOverride.propCameraId === selectedCameraId &&
    roomCameras.some((cam) => cam.id === manualCameraOverride.cameraId)
      ? manualCameraOverride.cameraId
      : selectedCameraId && roomCameras.some((cam) => cam.id === selectedCameraId)
        ? selectedCameraId
        : (roomCameras[0]?.id ?? null);

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

  const isFloor2 = room.floorId === DEMO_FLOOR_2_ID;
  const floorLabel = isFloor2 ? "Floor 2" : "Floor 1";
  const lastUpdated = lastUpdatedByFloor[room.floorId] ?? lastUpdatedByFloor[ACTIVE_FLOOR_ID];
  const envStatus = environmentReading?.status ?? (room.temperature >= 26 ? "warning" : "normal");
  const roomControls = ROOM_QUICK_CONTROLS[room.id] ?? { lights: [], airConditioners: [] };
  const roomDevices = twinDevices.filter((device) => device.roomId === room.id);
  const aggregatedDeviceCount = Math.max(0, room.deviceCount - roomDevices.length);
  const roomIncidents = twinAlerts.filter(
    (alert) => alert.roomId === room.id && (alert.status === "active" || alert.status === "acknowledged"),
  );
  const showAllOnlineEnvWarningExplanation =
    room.onlineDeviceCount === room.deviceCount && (envStatus !== "normal" || room.temperature >= 26);
  const activeCamera = roomCameras.find((cam) => cam.id === activeCameraId) ?? roomCameras[0] ?? null;

  const resolveDeviceStatus = (twinDeviceId?: string, fallback: OperationalStatus = "normal"): OperationalStatus => {
    if (room.status === "offline") return "offline";
    if (twinDeviceId) {
      const matched = twinDevices.find((device) => device.id === twinDeviceId);
      if (matched) return matched.status;
    }
    return fallback;
  };

  const toggleLight = (lightId: string, isOffline: boolean) => {
    if (isOffline) return;
    setLightStates((current) => ({ ...current, [lightId]: !current[lightId] }));
  };

  const toggleAcPower = (acId: string, isOffline: boolean) => {
    if (isOffline) return;
    setAcStates((current) => {
      const prev = current[acId];
      if (!prev) return current;
      return { ...current, [acId]: { ...prev, isOn: !prev.isOn } };
    });
  };

  const adjustAcTemp = (ac: RoomAcConfig, delta: number, isOffline: boolean) => {
    if (isOffline) return;
    const minTemp = ac.minTemp ?? 16;
    const maxTemp = ac.maxTemp ?? 30;
    setAcStates((current) => {
      const prev = current[ac.id];
      if (!prev) return current;
      const nextTemp = Math.min(maxTemp, Math.max(minTemp, prev.targetTemp + delta));
      return { ...current, [ac.id]: { ...prev, targetTemp: nextTemp } };
    });
  };

  const selectAcMode = (acId: string, mode: AcMode, isOffline: boolean) => {
    if (isOffline) return;
    setAcStates((current) => {
      const prev = current[acId];
      if (!prev) return current;
      return { ...current, [acId]: { ...prev, mode } };
    });
  };

  return (
    <aside className="room-detail-drawer" role="complementary" aria-label={`${room.name} details`}>
      <div className="room-drawer-topline">
        <div>
          <p className="section-eyebrow">{`ICS HEADQUARTERS / ${floorLabel.toUpperCase()} · CHI TIẾT KHU VỰC`}</p>
          <h3 id="room-detail-title">{room.name}</h3>
        </div>
        <button ref={closeButtonRef} className="room-drawer-close" type="button" aria-label="Close room details" onClick={onClose}>
          <X aria-hidden="true" size={17} />
        </button>
      </div>

      <div className={`room-drawer-freshness-banner${isFloor2 ? " is-static" : ""}`} role="note">
        <Clock3 aria-hidden="true" size={13} />
        <span>
          {isFloor2
            ? "Nguồn: Dữ liệu mẫu tĩnh (Static Demo) · Ngày mẫu: 08/10/2026 17:00 · Dữ liệu cũ (không phải telemetry thời gian thực hôm nay)"
            : `Nguồn: Mô phỏng (${automaticTelemetryRunning ? "LIVE · Đang cập nhật" : "PAUSED · Đang tạm dừng"}) · Cập nhật: ${lastUpdated ? formatTelemetryTime(lastUpdated) : "17:04:08"} (18/10/2026)`}
        </span>
      </div>

      <div className="room-detail-status-group">
        <div className="room-detail-status">
          <span>Trạng thái thiết bị</span>
          <StatusBadge status={room.status} />
        </div>
        <div className="room-detail-status">
          <span>Trạng thái môi trường</span>
          <StatusBadge status={envStatus} />
        </div>
      </div>

      {showAllOnlineEnvWarningExplanation && (
        <div className="room-status-explanation" role="note">
          <Info aria-hidden="true" size={14} />
          <span>
            Giải thích: Toàn bộ {room.onlineDeviceCount}/{room.deviceCount} thiết bị trong phòng vẫn đang kết nối (Online), nhưng chỉ số môi trường thực tế đang vượt ngưỡng vận hành. Trạng thái thiết bị Online chỉ phản ánh kết nối truyền thông, không đồng nghĩa môi trường đạt chuẩn.
          </span>
        </div>
      )}

      <div className="room-metric-list" id="room-detail-metrics">
        <div className="room-metric-row">
          <span className="room-metric-icon room-metric-icon--temperature"><Thermometer aria-hidden="true" size={16} /></span>
          <span>Nhiệt độ (ngưỡng 18–26°C)</span>
          <strong>{room.temperature.toFixed(1)}°C</strong>
        </div>
        <div className="room-metric-row">
          <span className="room-metric-icon room-metric-icon--humidity"><Droplets aria-hidden="true" size={16} /></span>
          <span>Độ ẩm (ngưỡng 40–65%)</span>
          <strong>{room.humidity}%</strong>
        </div>
        <div className="room-metric-row">
          <span className="room-metric-icon room-metric-icon--co2"><Wind aria-hidden="true" size={16} /></span>
          <span>CO₂ (ngưỡng ≤ 1,000 ppm)</span>
          <strong>{environmentReading ? `${environmentReading.co2Ppm.toLocaleString("en-US")} ppm` : "Chưa có dữ liệu"}</strong>
        </div>
        <div className="room-metric-row">
          <span className="room-metric-icon room-metric-icon--humidity"><Wind aria-hidden="true" size={16} /></span>
          <span>PM2.5 (ngưỡng ≤ 25 µg/m³)</span>
          <strong>{environmentReading ? `${environmentReading.pm25Micrograms} µg/m³` : "Chưa có dữ liệu"}</strong>
        </div>
        <div className="room-metric-row">
          <span className="room-metric-icon room-metric-icon--energy"><Zap aria-hidden="true" size={16} /></span>
          <span>
            Điện năng ({isFloor2 || isStaticSample ? `Kỳ đo: ${sampleDateLabel} · ${isFloor2 ? "Mẫu tĩnh" : "Lịch sử"}` : "Kỳ đo: 00:00–17:00 hôm nay · Mô phỏng"})
          </span>
          <strong>{hasHistoricalData ? `${room.energyConsumption.toFixed(1)} kWh` : "Chưa có dữ liệu"}</strong>
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
      <p className="room-device-scope-note">
        Phân tách theo dõi: <strong>{roomDevices.length} thiết bị định danh riêng</strong>
        {roomCameras.length > 0 ? ` (gồm ${roomCameras.length} camera)` : ""} ·{" "}
        <strong>{aggregatedDeviceCount} thiết bị gộp theo khu vực</strong>
      </p>

      {roomCameras.length > 0 && activeCamera && (
        <section className="room-cameras-section" aria-label="Camera an ninh trong khu vực">
          <header className="room-control-section-header">
            <span className="room-control-section-title">
              <Video aria-hidden="true" size={14} />
              <span>Camera giám sát khu vực</span>
            </span>
            <span className="room-control-count">{roomCameras.length} camera · Online</span>
          </header>

          {roomCameras.length > 1 && (
            <div className="room-camera-tabs" role="tablist" aria-label="Chọn camera trong khu vực">
              {roomCameras.map((cam) => {
                const isSelected = cam.id === activeCamera.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`room-camera-tab${isSelected ? " is-active" : ""}`}
                    onClick={() =>
                      setManualCameraOverride({
                        roomId: room.id,
                        propCameraId: selectedCameraId,
                        cameraId: cam.id,
                      })
                    }
                  >
                    <strong>{cam.code}</strong>
                    <span>{cam.name.replace("Camera ", "")}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="room-cctv-card">
            <div className="room-cctv-viewport">
              <div className="room-cctv-overlay-top">
                <span className={`room-cctv-badge${isFloor2 ? " is-static" : ""}`}>
                  <i aria-hidden="true" />
                  {isFloor2 ? "SNAPSHOT · MẪU TĨNH" : "REC · LIVE"}
                </span>
                <span className="room-cctv-cam-title">{`${activeCamera.code} · ${activeCamera.name}`}</span>
                <span className="room-cctv-timestamp">
                  {isFloor2
                    ? "08/10/2026 17:00:00"
                    : `18/10/2026 ${lastUpdated ? formatTelemetryTime(lastUpdated) : "15:05:00"}`}
                </span>
              </div>
              <CctvWireframeViewport camera={activeCamera} />
              <div className="room-cctv-overlay-bottom">
                <span>{`FOV ${activeCamera.fovDeg}° · Hướng ${activeCamera.angleDeg}°`}</span>
                <span>{activeCamera.resolution}</span>
              </div>
            </div>
            <div className="room-cctv-meta">
              <div>
                <strong>{`${activeCamera.code} — ${activeCamera.name}`}</strong>
                <p>{activeCamera.locationDetail}</p>
              </div>
              <StatusBadge status={activeCamera.status} label="Đang ghi hình" />
            </div>
          </div>
        </section>
      )}

      <section className="room-tracked-devices-section" aria-label="Thiết bị theo dõi định danh trong phòng">
        <header className="room-control-section-header">
          <span className="room-control-section-title">
            <Cpu aria-hidden="true" size={14} />
            <span>Thiết bị theo dõi định danh trong phòng</span>
          </span>
          <span className="room-control-count">{roomDevices.length}/{room.deviceCount} định danh</span>
        </header>
        {roomDevices.length > 0 ? (
          <ul className="room-tracked-device-list">
            {roomDevices.map((device) => {
              const deviceSensors = twinSensors.filter((sensor) => sensor.deviceId === device.id);
              const isDeviceOffline = device.status === "offline";
              return (
                <li key={device.id} className="room-tracked-device-item">
                  <div className="room-tracked-device-head">
                    <div>
                      <strong>{device.name}</strong>
                      <span className="room-tracked-device-type">{device.type}</span>
                    </div>
                    <StatusBadge status={device.status} label={trackedDeviceStatusLabel[device.status]} />
                  </div>
                  {deviceSensors.length > 0 && (
                    <div className="room-tracked-sensor-readings">
                      {deviceSensors.map((sensor) => {
                        if (sensor.metric === "connection") {
                          return (
                            <span key={sensor.id} className="room-tracked-sensor-chip">
                              {isDeviceOffline || sensor.value === 0
                                ? "Kết nối: Mất tín hiệu"
                                : device.type === "Camera"
                                  ? "Luồng video: Đang ghi hình (1080p)"
                                  : "Kết nối: Đang hoạt động"}
                            </span>
                          );
                        }
                        const metricLabel =
                          sensor.metric === "temperature"
                            ? "Nhiệt độ"
                            : sensor.metric === "humidity"
                              ? "Độ ẩm"
                              : sensor.metric === "power"
                                ? "Công suất"
                                : sensor.metric === "co2"
                                  ? "CO₂"
                                  : sensor.metric;
                        return (
                          <span key={sensor.id} className="room-tracked-sensor-chip">
                            {metricLabel}: {sensor.value} {sensor.unit}
                            {isDeviceOffline ? " (Dữ liệu cũ)" : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="room-tracked-empty">
            Không có thiết bị định danh riêng; {room.deviceCount} thiết bị được theo dõi gộp theo khu vực.
          </p>
        )}
      </section>

      <section className="room-incidents-section" aria-label="Sự cố đang ảnh hưởng phòng">
        <header className="room-control-section-header">
          <span className="room-control-section-title">
            <AlertTriangle aria-hidden="true" size={14} />
            <span>Sự cố đang ảnh hưởng phòng</span>
          </span>
          <span className="room-control-count">{roomIncidents.length} sự cố</span>
        </header>
        {roomIncidents.length > 0 ? (
          <ul className="room-incident-list">
            {roomIncidents.map((incident) => (
              <li key={incident.id} className="room-incident-item">
                <div className="room-incident-head">
                  <strong>{incident.title}</strong>
                  <StatusBadge status={incident.severity === "info" ? "normal" : incident.severity} />
                </div>
                <div className="room-incident-meta">
                  <span className={`room-incident-handling room-incident-handling--${incident.status}`}>
                    {incident.status === "acknowledged" ? "Đang xử lý" : "Chưa tiếp nhận"}
                  </span>
                  {incident.reading && <span>{incident.reading}</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="room-tracked-empty">Không có sự cố chưa giải quyết tại phòng này.</p>
        )}
      </section>

      {(roomControls.lights.length > 0 || roomControls.airConditioners.length > 0) && (
        <div className="room-quick-controls" aria-label="Điều khiển nhanh thiết bị trong phòng">
          <p className="room-quick-controls-disclaimer" role="note">
            Mô phỏng giao diện tại chỗ (UI Demo) · Không gửi lệnh điều khiển phần cứng thật.
          </p>
          {roomControls.lights.length > 0 && (
            <section className="room-control-section" aria-label="Điều khiển đèn">
              <header className="room-control-section-header">
                <span className="room-control-section-title">
                  <Lightbulb aria-hidden="true" size={14} />
                  <span>Điều khiển đèn</span>
                </span>
                <span className="room-control-count">{roomControls.lights.length} đèn</span>
              </header>
              <div className="room-control-list">
                {roomControls.lights.map((light) => {
                  const status = resolveDeviceStatus(light.twinDeviceId, light.defaultStatus);
                  const isOffline = status === "offline";
                  const isOn = !isOffline && Boolean(lightStates[light.id]);
                  return (
                    <div
                      key={light.id}
                      className={`room-control-card${isOffline ? " is-offline" : isOn ? " is-active" : ""}`}
                    >
                      <div className="room-control-card-info">
                        <div className="room-control-name-row">
                          <strong>{light.name}</strong>
                          <span className="room-control-code">{light.code}</span>
                        </div>
                        <div className="room-control-meta-row">
                          <StatusBadge status={status} label={deviceStatusBadgeLabel[status]} />
                          <span className="room-control-state-text">
                            {isOffline ? "Mất kết nối · Vô hiệu hóa" : isOn ? "Đang bật (ON)" : "Đang tắt (OFF)"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        aria-label={`Công tắc ${light.name}`}
                        disabled={isOffline}
                        onClick={() => toggleLight(light.id, isOffline)}
                        className={`room-light-switch${isOn ? " is-on" : ""}`}
                      >
                        <span className="room-light-switch-thumb" aria-hidden="true" />
                        <span className="room-light-switch-label">{isOn ? "ON" : "OFF"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {roomControls.airConditioners.length > 0 && (
            <section className="room-control-section" aria-label="Điều khiển điều hòa">
              <header className="room-control-section-header">
                <span className="room-control-section-title">
                  <Snowflake aria-hidden="true" size={14} />
                  <span>Điều khiển điều hòa</span>
                </span>
                <span className="room-control-count">{roomControls.airConditioners.length} máy</span>
              </header>
              <div className="room-control-list">
                {roomControls.airConditioners.map((ac) => {
                  const status = resolveDeviceStatus(ac.twinDeviceId, ac.defaultStatus);
                  const isOffline = status === "offline";
                  const state = acStates[ac.id] ?? {
                    isOn: ac.defaultOn,
                    targetTemp: ac.defaultTemp,
                    mode: ac.defaultMode,
                  };
                  const isOn = !isOffline && state.isOn;
                  const minTemp = ac.minTemp ?? 16;
                  const maxTemp = ac.maxTemp ?? 30;

                  return (
                    <div
                      key={ac.id}
                      className={`room-control-card room-control-card--ac${isOffline ? " is-offline" : isOn ? " is-active" : ""}`}
                    >
                      <div className="room-ac-top-row">
                        <div className="room-control-card-info">
                          <div className="room-control-name-row">
                            <strong>{ac.name}</strong>
                            <span className="room-control-code">{ac.code}</span>
                          </div>
                          <div className="room-control-meta-row">
                            <StatusBadge status={status} label={deviceStatusBadgeLabel[status]} />
                            <span className="room-control-state-text">
                              {isOffline ? "Mất kết nối · Vô hiệu hóa" : isOn ? "Nguồn: ON" : "Nguồn: OFF"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-pressed={isOn}
                          aria-label={`Nguồn ${ac.name}`}
                          disabled={isOffline}
                          onClick={() => toggleAcPower(ac.id, isOffline)}
                          className={`room-ac-power-btn${isOn ? " is-on" : ""}`}
                        >
                          <Power aria-hidden="true" size={13} />
                          <span>{isOn ? "ON" : "OFF"}</span>
                        </button>
                      </div>

                      <div className="room-ac-temp-row">
                        <div className="room-ac-temp-copy">
                          <span>Nhiệt độ cài đặt</span>
                          <strong>{isOffline ? "--°C" : `${state.targetTemp}°C`}</strong>
                        </div>
                        <div className="room-ac-stepper" role="group" aria-label={`Điều chỉnh nhiệt độ ${ac.name}`}>
                          <button
                            type="button"
                            className="room-ac-step-btn"
                            aria-label={`Giảm nhiệt độ ${ac.name}`}
                            disabled={isOffline || state.targetTemp <= minTemp}
                            onClick={() => adjustAcTemp(ac, -1, isOffline)}
                          >
                            <Minus aria-hidden="true" size={14} />
                          </button>
                          <span className="room-ac-temp-value" aria-live="polite">
                            {isOffline ? "--" : `${state.targetTemp}°C`}
                          </span>
                          <button
                            type="button"
                            className="room-ac-step-btn"
                            aria-label={`Tăng nhiệt độ ${ac.name}`}
                            disabled={isOffline || state.targetTemp >= maxTemp}
                            onClick={() => adjustAcTemp(ac, 1, isOffline)}
                          >
                            <Plus aria-hidden="true" size={14} />
                          </button>
                        </div>
                      </div>

                      {ac.supportedModes && ac.supportedModes.length > 0 && (
                        <div className="room-ac-mode-row">
                          <span className="room-ac-mode-label">Chế độ</span>
                          <div className="room-ac-mode-group" role="group" aria-label={`Chế độ ${ac.name}`}>
                            {ac.supportedModes.map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                aria-pressed={!isOffline && state.mode === mode}
                                disabled={isOffline}
                                onClick={() => selectAcMode(ac.id, mode, isOffline)}
                                className={`room-ac-mode-btn${!isOffline && state.mode === mode ? " is-selected" : ""}`}
                              >
                                {mode}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

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



