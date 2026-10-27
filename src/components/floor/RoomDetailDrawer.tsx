import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Clock3,
  Cpu,
  Droplets,
  FastForward,
  History,
  Info,
  Lightbulb,
  Minus,
  Plus,
  Power,
  RefreshCw,
  ShieldAlert,
  Snowflake,
  Sparkles,
  Thermometer,
  Users,
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
import {
  calculateRoomPowerKw,
  ROOM_QUICK_CONTROLS,
  type AcMode,
  type ControllableAcConfig,
} from "../../data/mock/roomControls.mock";
import { useAuthStore } from "../../features/auth/authStore";
import { canControlDevice } from "../../features/auth/permissions";
import { formatTelemetryTime } from "../../features/building/dataFreshness";
import { formatIsoDateVi, getLocalTodayIso } from "../../features/dashboard/dateFilterUtils";
import type { AreaEnvironmentReading } from "../../features/environment/types";
import type { FloorCameraMarker, FloorRoomSnapshot } from "../../features/floor/types";
import { useTwinStore } from "../../features/twin/twinStore";
import type { OperationalStatus } from "../../types/models";
import ScopedDashboardLink from "../common/ScopedDashboardLink";
import StatusBadge from "../dashboard/StatusBadge";

const AC_MODES: readonly { id: AcMode; label: string }[] = [
  { id: "cool", label: "Cool" },
  { id: "eco", label: "Eco" },
  { id: "fan", label: "Fan" },
];

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

const deviceStatusBadgeLabel: Record<OperationalStatus, string> = {
  normal: "Online",
  warning: "Cần chú ý",
  critical: "Critical",
  offline: "Mất kết nối",
};

const trackedDeviceStatusLabel: Record<OperationalStatus, string> = {
  normal: "Đang kết nối",
  warning: "Cần chú ý",
  critical: "Critical",
  offline: "Thiết bị mất kết nối",
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
  const role = useAuthStore((state) => state.role);
  const canControl = canControlDevice(role);

  const twinDevices = useTwinStore((state) => state.devices);
  const twinSensors = useTwinStore((state) => state.sensors);
  const twinAlerts = useTwinStore((state) => state.alerts);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const lastUpdatedByFloor = useTwinStore((state) => state.lastUpdatedByFloor);
  const lightStates = useTwinStore((state) => state.lightStates);
  const acStates = useTwinStore((state) => state.acStates);
  const serverCoolingBoostActive = useTwinStore((state) => state.serverCoolingBoostActive);
  const roomOccupancyByRoom = useTwinStore((state) => state.roomOccupancyByRoom);
  const energySavingRulesByRoom = useTwinStore((state) => state.energySavingRulesByRoom);
  const lastCommandFeedback = useTwinStore((state) => state.lastCommandFeedback);
  const actionHistory = useTwinStore((state) => state.actionHistory);

  const toggleLightAction = useTwinStore((state) => state.toggleLight);
  const toggleAcPowerAction = useTwinStore((state) => state.toggleAcPower);
  const setAcTemperatureAction = useTwinStore((state) => state.setAcTemperature);
  const setAcModeAction = useTwinStore((state) => state.setAcMode);
  const acknowledgeAlertAction = useTwinStore((state) => state.acknowledgeAlert);
  const activateServerCoolingBoost = useTwinStore((state) => state.activateServerCoolingBoost);
  const advanceTelemetry = useTwinStore((state) => state.advanceTelemetry);
  const setRoomOccupancy = useTwinStore((state) => state.setRoomOccupancy);
  const fastForwardOccupancyWait = useTwinStore((state) => state.fastForwardOccupancyWait);
  const setEnergySavingRule = useTwinStore((state) => state.setEnergySavingRule);
  const applyEnergySavingNow = useTwinStore((state) => state.applyEnergySavingNow);
  const overrideEnergySavingRule = useTwinStore((state) => state.overrideEnergySavingRule);
  const restoreDeviceConnection = useTwinStore((state) => state.restoreDeviceConnection);
  const disconnectDevice = useTwinStore((state) => state.disconnectDevice);

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
  const currentDateVi = formatIsoDateVi(getLocalTodayIso(lastUpdated));
  const currentTimeVi = lastUpdated ? formatTelemetryTime(lastUpdated) : "17:00:00";

  const envStatus = environmentReading?.status ?? (room.temperature >= 26 ? "warning" : "normal");
  const roomControls = ROOM_QUICK_CONTROLS[room.id] ?? { lights: [], acs: [] };
  const roomDevices = twinDevices.filter((device) => device.roomId === room.id);
  const aggregatedDeviceCount = Math.max(0, room.deviceCount - roomDevices.length);
  const roomIncidents = twinAlerts.filter(
    (alert) => alert.roomId === room.id && (alert.status === "active" || alert.status === "acknowledged"),
  );
  const showAllOnlineEnvWarningExplanation =
    room.onlineDeviceCount === room.deviceCount && (envStatus !== "normal" || room.temperature >= 26);
  const activeCamera = roomCameras.find((cam) => cam.id === activeCameraId) ?? roomCameras[0] ?? null;

  const currentRoomKw = calculateRoomPowerKw(
    room.id,
    lightStates,
    acStates,
    twinDevices,
    serverCoolingBoostActive,
  );

  const occupancyState = roomOccupancyByRoom[room.id];
  const energyRule = energySavingRulesByRoom[room.id];
  const isServerRoom = room.id === "room-server-01";
  const hasServerOverheat = isServerRoom && (room.temperature >= 27 || roomIncidents.some((i) => i.correlationKey === "server-temperature-high"));

  const roomActionLogs = actionHistory.filter((entry) => entry.roomId === room.id).slice(0, 8);
  const roomFeedback = lastCommandFeedback?.roomId === room.id ? lastCommandFeedback : null;

  const resolveDeviceStatus = (twinDeviceId?: string, fallback: OperationalStatus = "normal"): OperationalStatus => {
    if (twinDeviceId) {
      const matched = twinDevices.find((device) => device.id === twinDeviceId);
      if (matched) return matched.status;
    }
    if (room.status === "offline") return "offline";
    return fallback;
  };

  const handleAdjustAcTemp = (ac: ControllableAcConfig, delta: number, isOffline: boolean) => {
    if (isOffline || !canControl) return;
    const current = acStates[ac.id] ?? {
      isOn: ac.defaultOn,
      targetTemp: ac.defaultTemp,
      mode: ac.defaultMode,
    };
    setAcTemperatureAction(ac.id, current.targetTemp + delta);
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

      <div className={`room-drawer-freshness-banner${isFloor2 || isStaticSample ? " is-static" : ""}`} role="note">
        <Clock3 aria-hidden="true" size={13} />
        <span>
          {isFloor2 || isStaticSample
            ? `Nguồn: Dữ liệu mẫu · Ngày mẫu: ${sampleDateLabel}`
            : `Nguồn: ${automaticTelemetryRunning ? "Mô phỏng đang chạy" : "Mô phỏng tạm dừng"} · Cập nhật: ${currentTimeVi} (${currentDateVi})`}
        </span>
      </div>

      {!canControl && (
        <div className="room-status-explanation" role="status" aria-label="Quyền hạn người xem">
          <ShieldAlert aria-hidden="true" size={14} />
          <span>
            <strong>Chế độ Xem (Viewer):</strong> Bạn chỉ có quyền theo dõi thông số. Các thao tác bật/tắt công tắc, chỉnh nhiệt độ, chế độ vận hành và xử lý sự cố đã được khóa.
          </span>
        </div>
      )}

      {/* 1. TRẠNG THÁI PHÒNG VÀ CẢNH BÁO */}
      <section className="room-incidents-section" aria-label="Sự cố đang ảnh hưởng phòng">
        <header className="room-control-section-header">
          <span className="room-control-section-title">
            <AlertTriangle aria-hidden="true" size={14} />
            <span>1. Trạng thái phòng và cảnh báo</span>
          </span>
          <span className="room-control-count">{roomIncidents.length} sự cố chưa giải quyết</span>
        </header>

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
              Giải thích: Toàn bộ {room.onlineDeviceCount}/{room.deviceCount} thiết bị trong phòng vẫn đang kết nối (Online), nhưng chỉ số môi trường thực tế đang vượt ngưỡng vận hành.
            </span>
          </div>
        )}

        {roomIncidents.length > 0 ? (
          <ul className="room-incident-list">
            {roomIncidents.map((incident) => (
              <li key={incident.id} className="room-incident-item">
                <div className="room-incident-head">
                  <strong>{incident.title}</strong>
                  <StatusBadge status={incident.severity === "info" ? "normal" : incident.severity} />
                </div>
                <p style={{ margin: "0.25rem 0", fontSize: "0.8rem", opacity: 0.9 }}>{incident.message}</p>
                <div className="room-incident-meta" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className={`room-incident-handling room-incident-handling--${incident.status}`}>
                      {incident.status === "acknowledged" ? "Đã tiếp nhận · Đang xử lý" : "Chưa tiếp nhận"}
                    </span>
                    {incident.reading && <span>{incident.reading}</span>}
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {incident.status === "active" && (
                      <button
                        type="button"
                        className="room-ac-mode-btn is-selected"
                        disabled={!canControl}
                        onClick={() => acknowledgeAlertAction(incident.id)}
                      >
                        Tiếp nhận sự cố
                      </button>
                    )}
                    {incident.deviceId && twinDevices.some((d) => d.id === incident.deviceId && d.status === "offline") && (
                      <button
                        type="button"
                        className="room-ac-mode-btn is-selected"
                        disabled={!canControl}
                        onClick={() => restoreDeviceConnection(incident.deviceId!)}
                      >
                        Khôi phục kết nối mô phỏng
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="room-tracked-empty">Không có sự cố chưa giải quyết tại phòng này.</p>
        )}
      </section>

      {/* 2. CHỈ SỐ MÔI TRƯỜNG CHÍNH */}
      <section aria-label="Chỉ số môi trường chính">
        <header className="room-control-section-header">
          <span className="room-control-section-title">
            <Thermometer aria-hidden="true" size={14} />
            <span>2. Chỉ số môi trường & công suất chính</span>
          </span>
          <span className="room-control-count">{`${currentRoomKw.toFixed(2)} kW tức thời`}</span>
        </header>
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
            <span>Công suất tức thời (thay đổi ngay khi bật/tắt thiết bị)</span>
            <strong>{`${currentRoomKw.toFixed(2)} kW`}</strong>
          </div>
          <div className="room-metric-row">
            <span className="room-metric-icon room-metric-icon--energy"><Zap aria-hidden="true" size={16} /></span>
            <span>
              Điện năng tích lũy ({isFloor2 || isStaticSample ? `Kỳ đo: ${sampleDateLabel} · Dữ liệu mẫu` : "Lũy kế trong ngày · Mô phỏng"})
            </span>
            <strong>{hasHistoricalData ? `${room.energyConsumption.toFixed(1)} kWh` : "Chưa có dữ liệu"}</strong>
          </div>
        </div>
      </section>

      {/* 3. ĐIỀU KHIỂN THIẾT BỊ */}
      <div className="room-quick-controls" aria-label="Điều khiển nhanh thiết bị trong phòng">
        <header className="room-control-section-header">
          <span className="room-control-section-title">
            <Sparkles aria-hidden="true" size={14} />
            <span>3. Điều khiển thiết bị & xử lý tình huống</span>
          </span>
          <span className="room-control-count">{canControl ? "Quyền Admin" : "Chỉ xem (Viewer)"}</span>
        </header>
        <p className="room-quick-controls-disclaimer" role="note">
          Trạng thái điều khiển được đồng bộ dùng chung giữa Sơ đồ 2D, Chi tiết phòng và Danh sách thiết bị trong cùng phiên làm việc.
        </p>

        {/* SCENARIO A: SERVER ROOM COOLING BOOST */}
        {isServerRoom && (
          <section className="room-control-section" aria-label="Xử lý quá nhiệt phòng Server">
            <header className="room-control-section-header">
              <span className="room-control-section-title">
                <Snowflake aria-hidden="true" size={14} />
                <span>Xử lý Kịch bản A · Làm mát khẩn cấp phòng Server</span>
              </span>
              <span className="room-control-count">
                {serverCoolingBoostActive ? "Đang tăng cường làm mát" : hasServerOverheat ? "Cần xử lý quá nhiệt" : "Ổn định"}
              </span>
            </header>
            <div className="room-control-card" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "0.55rem" }}>
              <p style={{ margin: 0, fontSize: "0.82rem" }}>
                {serverCoolingBoostActive
                  ? `Đã kích hoạt tăng làm mát mô phỏng (CRAC-01 & CRAC-02 → 18°C · Cool). Nhiệt độ hiện tại ${room.temperature.toFixed(1)}°C sẽ giảm dần qua từng bước mô phỏng và tự động đóng sự cố khi < 27.0°C.`
                  : `Khi nhiệt độ phòng Server tăng cao (${room.temperature.toFixed(1)}°C), kích hoạt chế độ tăng làm mát để đồng bộ CRAC-01 & CRAC-02 về 18°C (Cool) và hạ nhiệt theo từng bước.`}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="room-ac-power-btn is-on"
                  disabled={!canControl}
                  onClick={activateServerCoolingBoost}
                >
                  <Snowflake aria-hidden="true" size={13} />
                  <span>Kích hoạt tăng làm mát mô phỏng</span>
                </button>
                {(serverCoolingBoostActive || room.temperature > 25.4) && (
                  <button
                    type="button"
                    className="room-ac-mode-btn is-selected"
                    disabled={!canControl}
                    onClick={advanceTelemetry}
                  >
                    <FastForward aria-hidden="true" size={13} />
                    <span>Tiến 1 bước hạ nhiệt mô phỏng</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* SCENARIO B: MEETING ROOM OCCUPANCY & ENERGY SAVING RULE */}
        {occupancyState && energyRule && (
          <section className="room-control-section" aria-label="Hiện diện và quy tắc tiết kiệm điện phòng họp">
            <header className="room-control-section-header">
              <span className="room-control-section-title">
                <Users aria-hidden="true" size={14} />
                <span>Hiện diện & Quy tắc tiết kiệm điện (Kịch bản B)</span>
              </span>
              <span className="room-control-count">
                {occupancyState.isOccupied
                  ? `Có người (${occupancyState.occupantCount} người)`
                  : `Không có người (Trống ${occupancyState.unoccupiedMinutes} phút)`}
              </span>
            </header>
            <div className="room-control-card" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <strong>Trạng thái sử dụng phòng</strong>
                  <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>
                    {occupancyState.isOccupied
                      ? "Phòng đang có người họp · Không áp dụng tự động tắt thiết bị"
                      : `Phòng trống ${occupancyState.unoccupiedMinutes}/${occupancyState.thresholdMinutes} phút · Công suất hiện tại ${currentRoomKw.toFixed(2)} kW`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`room-ac-mode-btn${occupancyState.isOccupied ? " is-selected" : ""}`}
                    disabled={!canControl}
                    onClick={() => setRoomOccupancy(room.id, true)}
                  >
                    Có người
                  </button>
                  <button
                    type="button"
                    className={`room-ac-mode-btn${!occupancyState.isOccupied ? " is-selected" : ""}`}
                    disabled={!canControl}
                    onClick={() => setRoomOccupancy(room.id, false)}
                  >
                    Không có người
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="room-ac-mode-btn"
                  disabled={!canControl}
                  onClick={() => fastForwardOccupancyWait(room.id, 15)}
                >
                  <FastForward aria-hidden="true" size={12} /> Tăng tốc thời gian chờ (+15 phút mô phỏng)
                </button>
                <button
                  type="button"
                  className={`room-ac-mode-btn${energyRule.autoExecute ? " is-selected" : ""}`}
                  disabled={!canControl}
                  onClick={() => setEnergySavingRule(room.id, { autoExecute: !energyRule.autoExecute })}
                >
                  {energyRule.autoExecute ? "Chế độ: Tự động tắt sau 15 phút trống" : "Chế độ: Đề xuất người vận hành xác nhận"}
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                <button
                  type="button"
                  className="room-ac-power-btn is-on"
                  disabled={!canControl}
                  onClick={() => applyEnergySavingNow(room.id)}
                >
                  <Zap aria-hidden="true" size={13} />
                  <span>Thực hiện tiết kiệm ngay (Tắt đèn & điều hòa)</span>
                </button>
                <button
                  type="button"
                  className="room-ac-mode-btn"
                  disabled={!canControl}
                  onClick={() => overrideEnergySavingRule(room.id, 30)}
                >
                  Ghi đè giữ bật 30 phút
                </button>
              </div>
              {energyRule.overrideActive && (
                <small style={{ opacity: 0.85 }}>
                  Đang áp dụng ghi đè giữ bật thiết bị ({energyRule.overrideRemainingMinutes} phút).
                </small>
              )}
            </div>
          </section>
        )}

        {/* LIGHT CONTROLS */}
        {roomControls.lights.length > 0 && (
          <section className="room-control-section" aria-label="Điều khiển đèn">
            <header className="room-control-section-header">
              <span className="room-control-section-title">
                <Lightbulb aria-hidden="true" size={14} />
                <span>Điều khiển đèn chiếu sáng</span>
              </span>
              <span className="room-control-count">{roomControls.lights.length} đèn</span>
            </header>
            <div className="room-control-list">
              {roomControls.lights.map((light) => {
                const status = resolveDeviceStatus(light.twinDeviceId, light.defaultStatus);
                const isOffline = status === "offline";
                const isOn = !isOffline && Boolean(lightStates[light.id] ?? light.defaultOn);
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
                          {isOffline
                            ? "Thiết bị mất kết nối · Đã khóa điều khiển"
                            : isOn
                              ? `Đang bật (ON · ${light.powerKw.toFixed(2)} kW)`
                              : "Đang tắt (Chủ động · 0.00 kW)"}
                        </span>
                      </div>
                      {isOffline && (
                        <small style={{ display: "block", marginTop: "0.25rem", opacity: 0.85 }}>
                          Mất kết nối truyền thông không đồng nghĩa thiết bị đã tắt nguồn vật lý.
                        </small>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {isOffline && light.twinDeviceId && (
                        <button
                          type="button"
                          className="room-ac-mode-btn is-selected"
                          disabled={!canControl}
                          onClick={() => restoreDeviceConnection(light.twinDeviceId!)}
                        >
                          Khôi phục kết nối
                        </button>
                      )}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn}
                        aria-label={`Công tắc ${light.name}`}
                        disabled={isOffline || !canControl}
                        onClick={() => toggleLightAction(light.id)}
                        className={`room-light-switch${isOn ? " is-on" : ""}`}
                      >
                        <span className="room-light-switch-thumb" aria-hidden="true" />
                        <span className="room-light-switch-label">{isOn ? "ON" : "OFF"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* AIR CONDITIONER CONTROLS */}
        {roomControls.acs.length > 0 && (
          <section className="room-control-section" aria-label="Điều khiển điều hòa">
            <header className="room-control-section-header">
              <span className="room-control-section-title">
                <Snowflake aria-hidden="true" size={14} />
                <span>Điều khiển điều hòa</span>
              </span>
              <span className="room-control-count">{roomControls.acs.length} máy</span>
            </header>
            <div className="room-control-list">
              {roomControls.acs.map((ac) => {
                const status = resolveDeviceStatus(ac.twinDeviceId, ac.defaultStatus);
                const isOffline = status === "offline";
                const state = acStates[ac.id] ?? {
                  isOn: ac.defaultOn,
                  targetTemp: ac.defaultTemp,
                  mode: ac.defaultMode,
                };
                const isOn = !isOffline && state.isOn;
                const minTemp = 18;
                const maxTemp = 28;
                const activeModeKw = isOn ? (ac.powerKwByMode[state.mode] ?? ac.powerKwByMode.cool) : 0;

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
                            {isOffline
                              ? "Thiết bị mất kết nối · Đã khóa điều khiển"
                              : isOn
                                ? `Nguồn: ON (${activeModeKw.toFixed(2)} kW)`
                                : "Nguồn: OFF (Tắt chủ động · 0.00 kW)"}
                          </span>
                        </div>
                        {isOffline && (
                          <small style={{ display: "block", marginTop: "0.25rem", opacity: 0.85 }}>
                            Thiết bị mất kết nối tín hiệu điều khiển. Không đồng nghĩa thiết bị đã tắt nguồn vật lý.
                          </small>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        {isOffline && ac.twinDeviceId && (
                          <button
                            type="button"
                            className="room-ac-mode-btn is-selected"
                            disabled={!canControl}
                            onClick={() => restoreDeviceConnection(ac.twinDeviceId!)}
                          >
                            Khôi phục kết nối mô phỏng
                          </button>
                        )}
                        <button
                          type="button"
                          aria-pressed={isOn}
                          aria-label={`Nguồn ${ac.name}`}
                          disabled={isOffline || !canControl}
                          onClick={() => toggleAcPowerAction(ac.id)}
                          className={`room-ac-power-btn${isOn ? " is-on" : ""}`}
                        >
                          <Power aria-hidden="true" size={13} />
                          <span>{isOn ? "ON" : "OFF"}</span>
                        </button>
                      </div>
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
                          disabled={isOffline || !canControl || state.targetTemp <= minTemp}
                          onClick={() => handleAdjustAcTemp(ac, -1, isOffline)}
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
                          disabled={isOffline || !canControl || state.targetTemp >= maxTemp}
                          onClick={() => handleAdjustAcTemp(ac, 1, isOffline)}
                        >
                          <Plus aria-hidden="true" size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="room-ac-mode-row">
                      <span className="room-ac-mode-label">Chế độ</span>
                      <div className="room-ac-mode-group" role="group" aria-label={`Chế độ ${ac.name}`}>
                        {AC_MODES.map((modeOption) => (
                          <button
                            key={modeOption.id}
                            type="button"
                            aria-pressed={!isOffline && state.mode === modeOption.id}
                            disabled={isOffline || !canControl}
                            onClick={() => setAcModeAction(ac.id, modeOption.id)}
                            className={`room-ac-mode-btn${!isOffline && state.mode === modeOption.id ? " is-selected" : ""}`}
                          >
                            {modeOption.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* 4. KẾT QUẢ THAO TÁC VÀ LỊCH SỬ GẦN NHẤT */}
      <section className="room-tracked-devices-section" aria-label="Kết quả thao tác và lịch sử gần nhất">
        <header className="room-control-section-header">
          <span className="room-control-section-title">
            <History aria-hidden="true" size={14} />
            <span>4. Kết quả thao tác và lịch sử gần nhất</span>
          </span>
          <span className="room-control-count">{roomActionLogs.length} bản ghi</span>
        </header>

        {roomFeedback && (
          <div
            className="room-status-explanation"
            role="status"
            aria-live="polite"
            style={{ marginBottom: "0.6rem" }}
          >
            <CheckCircle2 aria-hidden="true" size={15} />
            <div>
              <strong>
                {roomFeedback.status === "executed"
                  ? "Đã thực hiện"
                  : roomFeedback.status === "executing"
                    ? "Đang thực hiện"
                    : "Không thể thực hiện"}
                {` · ${formatTelemetryTime(roomFeedback.timestamp)}`}
              </strong>
              <div style={{ fontSize: "0.82rem", marginTop: "0.15rem" }}>{roomFeedback.message}</div>
            </div>
          </div>
        )}

        {roomActionLogs.length > 0 ? (
          <ul className="room-tracked-device-list" aria-label="Nhật ký thao tác trong phòng">
            {roomActionLogs.map((log) => (
              <li key={log.id} className="room-tracked-device-item">
                <div className="room-tracked-device-head">
                  <div>
                    <strong>{log.actionLabel}</strong>
                    <span className="room-tracked-device-type">{log.targetLabel}</span>
                  </div>
                  <span className="room-control-code">{formatTelemetryTime(log.timestamp)}</span>
                </div>
                <div className="room-tracked-sensor-readings" style={{ marginTop: "0.25rem" }}>
                  <span className="room-tracked-sensor-chip">{`Nguồn: ${log.actorLabel}`}</span>
                  <span className="room-tracked-sensor-chip">{`Kết quả: ${log.resultLabel}`}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="room-tracked-empty">
            Chưa có thao tác điều khiển hoặc kịch bản tự động nào được ghi nhận tại phòng này trong phiên hiện tại.
          </p>
        )}
      </section>

      {/* 5. CAMERA, CẢM BIẾN VÀ THÔNG TIN MỞ RỘNG */}
      <section className="room-tracked-devices-section" aria-label="Camera, cảm biến và thông tin mở rộng">
        <header className="room-control-section-header">
          <span className="room-control-section-title">
            <Cpu aria-hidden="true" size={14} />
            <span>5. Camera, cảm biến và thông tin mở rộng</span>
          </span>
          <span className="room-control-count">{roomDevices.length}/{room.deviceCount} định danh</span>
        </header>

        <section className="room-device-summary" aria-label="Device counts" style={{ marginBottom: "0.5rem" }}>
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
          <section className="room-cameras-section" aria-label="Camera an ninh trong khu vực" style={{ marginTop: "0.65rem" }}>
            <header className="room-control-section-header">
              <span className="room-control-section-title">
                <Video aria-hidden="true" size={14} />
                <span>Camera giám sát khu vực (Khung hình mô phỏng)</span>
              </span>
              <span className="room-control-count">{roomCameras.length} camera · Khung hình mô phỏng</span>
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
                  <span className="room-cctv-badge is-static">
                    <i aria-hidden="true" />
                    KHUNG HÌNH MÔ PHỎNG
                  </span>
                  <span className="room-cctv-cam-title">{`${activeCamera.code} · ${activeCamera.name}`}</span>
                  <span className="room-cctv-timestamp">
                    {isFloor2 || isStaticSample
                      ? `${sampleDateLabel} 17:00:00`
                      : `${currentDateVi} ${currentTimeVi}`}
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
                <StatusBadge status={activeCamera.status} label="Khung hình mô phỏng" />
              </div>
            </div>
          </section>
        )}

        <section aria-label="Thiết bị theo dõi định danh trong phòng" style={{ marginTop: "0.75rem" }}>
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
                        <span className="room-tracked-device-type">{`${device.type} · ID: ${device.id}`}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <StatusBadge status={device.status} label={trackedDeviceStatusLabel[device.status]} />
                        {isDeviceOffline ? (
                          <button
                            type="button"
                            className="room-ac-mode-btn is-selected"
                            disabled={!canControl}
                            onClick={() => restoreDeviceConnection(device.id)}
                          >
                            <RefreshCw aria-hidden="true" size={12} /> Khôi phục kết nối mô phỏng
                          </button>
                        ) : (device.id === "device-ac-mt2-01" || device.id === "device-temp-04") ? (
                          <button
                            type="button"
                            className="room-ac-mode-btn"
                            disabled={!canControl}
                            onClick={() => disconnectDevice(device.id)}
                          >
                            Mô phỏng mất kết nối
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {deviceSensors.length > 0 && (
                      <div className="room-tracked-sensor-readings">
                        {deviceSensors.map((sensor) => {
                          if (sensor.metric === "connection") {
                            return (
                              <span key={sensor.id} className="room-tracked-sensor-chip">
                                {isDeviceOffline || sensor.value === 0
                                  ? "Kết nối: Thiết bị mất kết nối"
                                  : device.type === "Camera"
                                    ? "Khung hình mô phỏng (1080p)"
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
                                    : sensor.metric === "maintenance-hours-remaining"
                                      ? "Giờ bảo trì còn lại"
                                      : sensor.metric;
                          return (
                            <span key={sensor.id} className="room-tracked-sensor-chip">
                              {metricLabel}: {sensor.value} {sensor.unit}
                              {isDeviceOffline ? " (Dữ liệu cuối trước khi mất kết nối)" : ""}
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
      </section>

      <div className="room-drawer-actions">
        <ScopedDashboardLink className="room-action-secondary" to={`/dashboard/devices?roomId=${encodeURIComponent(room.id)}`}>
          Xem chi tiết <ArrowUpRight aria-hidden="true" size={15} />
        </ScopedDashboardLink>
      </div>
    </aside>
  );
}
