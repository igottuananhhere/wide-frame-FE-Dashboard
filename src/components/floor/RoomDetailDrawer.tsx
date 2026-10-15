import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  Clock3,
  Droplets,
  Lightbulb,
  Minus,
  Plus,
  Power,
  Snowflake,
  Thermometer,
  Wifi,
  WifiOff,
  Wind,
  X,
  Zap,
} from "lucide-react";
import type { RefObject } from "react";
import type { AreaEnvironmentReading } from "../../features/environment/types";
import type { FloorRoomSnapshot } from "../../features/floor/types";
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
};

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

type RoomDetailDrawerProps = {
  room: FloorRoomSnapshot;
  environmentReading?: AreaEnvironmentReading;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

export default function RoomDetailDrawer({
  room,
  environmentReading,
  closeButtonRef,
  onClose,
}: RoomDetailDrawerProps) {
  const onCloseRef = useRef(onClose);
  const twinDevices = useTwinStore((state) => state.devices);
  const [lightStates, setLightStates] = useState<Record<string, boolean>>(buildInitialLightStates);
  const [acStates, setAcStates] = useState<Record<string, AcControlState>>(buildInitialAcStates);

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

  const envStatus = environmentReading?.status ?? "normal";
  const roomControls = ROOM_QUICK_CONTROLS[room.id] ?? { lights: [], airConditioners: [] };

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
          <p className="section-eyebrow">ROOM DETAIL / FLOOR 1</p>
          <h3 id="room-detail-title">{room.name}</h3>
        </div>
        <button ref={closeButtonRef} className="room-drawer-close" type="button" aria-label="Close room details" onClick={onClose}>
          <X aria-hidden="true" size={17} />
        </button>
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
        {environmentReading && (
          <div className="room-metric-row">
            <span className="room-metric-icon room-metric-icon--humidity"><Wind aria-hidden="true" size={16} /></span>
            <span>CO₂ (ngưỡng ≤ 1,000 ppm)</span>
            <strong>{environmentReading.co2Ppm.toLocaleString("en-US")} ppm</strong>
          </div>
        )}
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

      {(roomControls.lights.length > 0 || roomControls.airConditioners.length > 0) && (
        <div className="room-quick-controls" aria-label="Điều khiển nhanh thiết bị trong phòng">
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


