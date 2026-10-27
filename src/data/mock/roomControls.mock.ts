import type { OperationalStatus } from "../../types/models";
import type { TwinDevice } from "../../features/twin/types";

export type AcMode = "cool" | "eco" | "fan";

export interface ControllableLightConfig {
  id: string;
  roomId: string;
  name: string;
  code: string;
  defaultOn: boolean;
  defaultStatus: OperationalStatus;
  powerKw: number;
  twinDeviceId?: string;
}

export interface ControllableAcConfig {
  id: string;
  roomId: string;
  name: string;
  code: string;
  defaultOn: boolean;
  defaultTemp: number;
  defaultMode: AcMode;
  defaultStatus: OperationalStatus;
  powerKwByMode: Record<AcMode, number>;
  twinDeviceId?: string;
}

export interface RoomQuickControlConfig {
  lights: ControllableLightConfig[];
  acs: ControllableAcConfig[];
}

export interface AcControlState {
  isOn: boolean;
  targetTemp: number;
  mode: AcMode;
}

export interface RoomOccupancyState {
  roomId: string;
  isOccupied: boolean;
  occupantCount: number;
  unoccupiedMinutes: number;
  thresholdMinutes: number;
}

export interface EnergySavingRuleState {
  roomId: string;
  enabled: boolean;
  autoExecute: boolean;
  overrideActive: boolean;
  overrideRemainingMinutes: number;
}

/**
 * Shared control definitions for Floor 1 rooms.
 * Note on device identity integrity:
 * - WS-08 (device-workspace-08) is strictly a workstation environmental sensor, NOT a light.
 * - TEMP-04 (device-temp-04) is strictly a room temperature/CO₂ sensor in Meeting Room 02, NOT an AC unit.
 * - Controllable devices linked to TwinStore use distinct IDs (device-ac-mt2-01, device-light-mt2-01, device-crac-01, device-crac-02, device-ac-03, device-utility-01).
 */
export const ROOM_QUICK_CONTROLS: Record<string, RoomQuickControlConfig> = {
  "room-lobby-01": {
    lights: [
      { id: "light-lobby-01", roomId: "room-lobby-01", name: "Đèn trần sảnh chính", code: "LT-LB-01", defaultOn: true, defaultStatus: "normal", powerKw: 0.35 },
      { id: "light-lobby-02", roomId: "room-lobby-01", name: "Đèn hắt quầy lễ tân", code: "LT-LB-02", defaultOn: true, defaultStatus: "normal", powerKw: 0.2 },
    ],
    acs: [
      {
        id: "ac-lobby-01",
        roomId: "room-lobby-01",
        name: "Điều hòa âm trần Sảnh",
        code: "AC-LB-01",
        defaultOn: true,
        defaultTemp: 24,
        defaultMode: "cool",
        defaultStatus: "normal",
        powerKwByMode: { cool: 1.8, eco: 1.2, fan: 0.45 },
      },
    ],
  },
  "room-workspace-01": {
    lights: [
      { id: "light-ws-01", roomId: "room-workspace-01", name: "Đèn LED dãy bàn Bắc", code: "LT-WS-01", defaultOn: true, defaultStatus: "normal", powerKw: 0.65 },
      { id: "light-ws-02", roomId: "room-workspace-01", name: "Đèn LED dãy bàn Nam", code: "LT-WS-02", defaultOn: true, defaultStatus: "normal", powerKw: 0.65 },
    ],
    acs: [
      {
        id: "ac-ws-03",
        roomId: "room-workspace-01",
        name: "Điều hòa trung tâm AC-03",
        code: "AC-03",
        defaultOn: true,
        defaultTemp: 24,
        defaultMode: "cool",
        defaultStatus: "normal",
        powerKwByMode: { cool: 2.6, eco: 1.8, fan: 0.65 },
        twinDeviceId: "device-ac-03",
      },
      {
        id: "ac-ws-04",
        roomId: "room-workspace-01",
        name: "Điều hòa phụ trợ AC-04",
        code: "AC-04",
        defaultOn: true,
        defaultTemp: 25,
        defaultMode: "eco",
        defaultStatus: "normal",
        powerKwByMode: { cool: 2.1, eco: 1.4, fan: 0.5 },
      },
    ],
  },
  "room-server-01": {
    lights: [
      { id: "light-srv-01", roomId: "room-server-01", name: "Đèn kỹ thuật phòng Server", code: "LT-SRV-01", defaultOn: false, defaultStatus: "normal", powerKw: 0.25 },
    ],
    acs: [
      {
        id: "ac-srv-01",
        roomId: "room-server-01",
        name: "Hệ thống làm mát CRAC-01",
        code: "CRAC-01",
        defaultOn: true,
        defaultTemp: 20,
        defaultMode: "cool",
        defaultStatus: "normal",
        powerKwByMode: { cool: 2.4, eco: 1.7, fan: 0.7 },
        twinDeviceId: "device-crac-01",
      },
      {
        id: "ac-srv-02",
        roomId: "room-server-01",
        name: "Hệ thống làm mát dự phòng CRAC-02",
        code: "CRAC-02",
        defaultOn: true,
        defaultTemp: 21,
        defaultMode: "eco",
        defaultStatus: "normal",
        powerKwByMode: { cool: 2.2, eco: 1.5, fan: 0.6 },
        twinDeviceId: "device-crac-02",
      },
    ],
  },
  "room-corridor-01": {
    lights: [
      { id: "light-cor-01", roomId: "room-corridor-01", name: "Đèn hành lang chính", code: "LT-COR-01", defaultOn: true, defaultStatus: "normal", powerKw: 0.4 },
      { id: "light-cor-02", roomId: "room-corridor-01", name: "Đèn định hướng lối đi", code: "LT-COR-02", defaultOn: true, defaultStatus: "normal", powerKw: 0.25 },
    ],
    acs: [
      {
        id: "ac-cor-01",
        roomId: "room-corridor-01",
        name: "Thông gió & cấp khí tươi Hành lang",
        code: "AHU-COR-01",
        defaultOn: true,
        defaultTemp: 25,
        defaultMode: "fan",
        defaultStatus: "normal",
        powerKwByMode: { cool: 1.1, eco: 0.8, fan: 0.45 },
      },
    ],
  },
  "room-meeting-01": {
    lights: [
      { id: "light-mt1-01", roomId: "room-meeting-01", name: "Đèn chính Meeting Room 01", code: "LT-MT1-01", defaultOn: true, defaultStatus: "normal", powerKw: 0.3 },
      { id: "light-mt1-02", roomId: "room-meeting-01", name: "Đèn trình chiếu", code: "LT-MT1-02", defaultOn: false, defaultStatus: "normal", powerKw: 0.15 },
    ],
    acs: [
      {
        id: "ac-mt1-01",
        roomId: "room-meeting-01",
        name: "Điều hòa Meeting Room 01",
        code: "AC-MT1-01",
        defaultOn: true,
        defaultTemp: 23,
        defaultMode: "cool",
        defaultStatus: "normal",
        powerKwByMode: { cool: 1.4, eco: 0.95, fan: 0.35 },
      },
    ],
  },
  "room-meeting-02": {
    lights: [
      {
        id: "light-mt2-01",
        roomId: "room-meeting-02",
        name: "Đèn chính Meeting Room 02",
        code: "LT-MT2-01",
        defaultOn: true,
        defaultStatus: "normal",
        powerKw: 0.35,
        twinDeviceId: "device-light-mt2-01",
      },
      {
        id: "light-mt2-02",
        roomId: "room-meeting-02",
        name: "Đèn bảng viết",
        code: "LT-MT2-02",
        defaultOn: true,
        defaultStatus: "normal",
        powerKw: 0.15,
      },
    ],
    acs: [
      {
        id: "ac-mt2-01",
        roomId: "room-meeting-02",
        name: "Điều hòa Meeting Room 02",
        code: "AC-MT2",
        defaultOn: true,
        defaultTemp: 24,
        defaultMode: "cool",
        defaultStatus: "normal",
        powerKwByMode: { cool: 1.5, eco: 1.0, fan: 0.4 },
        twinDeviceId: "device-ac-mt2-01",
      },
    ],
  },
  "room-pantry-01": {
    lights: [
      { id: "light-pt-01", roomId: "room-pantry-01", name: "Đèn khu Pantry", code: "LT-PT-01", defaultOn: true, defaultStatus: "normal", powerKw: 0.25 },
    ],
    acs: [
      {
        id: "ac-pt-01",
        roomId: "room-pantry-01",
        name: "Quạt hút & Điều hòa Pantry",
        code: "AC-PT-01",
        defaultOn: true,
        defaultTemp: 25,
        defaultMode: "eco",
        defaultStatus: "normal",
        powerKwByMode: { cool: 0.95, eco: 0.65, fan: 0.3 },
      },
    ],
  },
  "room-utility-01": {
    lights: [
      {
        id: "light-ut-01",
        roomId: "room-utility-01",
        name: "Đèn buồng kỹ thuật",
        code: "LT-UT-01",
        defaultOn: false,
        defaultStatus: "offline",
        powerKw: 0.2,
        twinDeviceId: "device-utility-01",
      },
    ],
    acs: [
      {
        id: "ac-ut-01",
        roomId: "room-utility-01",
        name: "Thông gió kỹ thuật",
        code: "VENT-UT-01",
        defaultOn: true,
        defaultTemp: 26,
        defaultMode: "fan",
        defaultStatus: "normal",
        powerKwByMode: { cool: 0.9, eco: 0.65, fan: 0.4 },
      },
    ],
  },
};

export const ROOM_BASE_LOAD_KW: Record<string, number> = {
  "room-lobby-01": 0.45,
  "room-workspace-01": 3.4,
  "room-server-01": 4.2,
  "room-corridor-01": 0.3,
  "room-meeting-01": 0.3,
  "room-meeting-02": 0.25,
  "room-pantry-01": 0.6,
  "room-utility-01": 1.8,
};

export function buildInitialLightStates(): Record<string, boolean> {
  const initial: Record<string, boolean> = {};
  for (const config of Object.values(ROOM_QUICK_CONTROLS)) {
    for (const light of config.lights) {
      initial[light.id] = light.defaultOn;
    }
  }
  return initial;
}

export function buildInitialAcStates(): Record<string, AcControlState> {
  const initial: Record<string, AcControlState> = {};
  for (const config of Object.values(ROOM_QUICK_CONTROLS)) {
    for (const ac of config.acs) {
      initial[ac.id] = {
        isOn: ac.defaultOn,
        targetTemp: ac.defaultTemp,
        mode: ac.defaultMode,
      };
    }
  }
  return initial;
}

export function buildInitialRoomOccupancy(): Record<string, RoomOccupancyState> {
  return {
    "room-meeting-01": {
      roomId: "room-meeting-01",
      isOccupied: true,
      occupantCount: 4,
      unoccupiedMinutes: 0,
      thresholdMinutes: 15,
    },
    "room-meeting-02": {
      roomId: "room-meeting-02",
      isOccupied: true,
      occupantCount: 6,
      unoccupiedMinutes: 0,
      thresholdMinutes: 15,
    },
  };
}

export function buildInitialEnergySavingRules(): Record<string, EnergySavingRuleState> {
  return {
    "room-meeting-01": {
      roomId: "room-meeting-01",
      enabled: true,
      autoExecute: false,
      overrideActive: false,
      overrideRemainingMinutes: 0,
    },
    "room-meeting-02": {
      roomId: "room-meeting-02",
      enabled: true,
      autoExecute: false,
      overrideActive: false,
      overrideRemainingMinutes: 0,
    },
  };
}

export function findControllableLightById(lightId: string): ControllableLightConfig | undefined {
  for (const config of Object.values(ROOM_QUICK_CONTROLS)) {
    const found = config.lights.find((light) => light.id === lightId);
    if (found) return found;
  }
  return undefined;
}

export function findControllableAcById(acId: string): ControllableAcConfig | undefined {
  for (const config of Object.values(ROOM_QUICK_CONTROLS)) {
    const found = config.acs.find((ac) => ac.id === acId);
    if (found) return found;
  }
  return undefined;
}

export function findControllableByTwinDeviceId(
  twinDeviceId: string,
): { kind: "light"; config: ControllableLightConfig } | { kind: "ac"; config: ControllableAcConfig } | undefined {
  for (const config of Object.values(ROOM_QUICK_CONTROLS)) {
    const light = config.lights.find((item) => item.twinDeviceId === twinDeviceId);
    if (light) return { kind: "light", config: light };
    const ac = config.acs.find((item) => item.twinDeviceId === twinDeviceId);
    if (ac) return { kind: "ac", config: ac };
  }
  return undefined;
}

export function calculateRoomPowerKw(
  roomId: string,
  lightStates: Record<string, boolean>,
  acStates: Record<string, AcControlState>,
  devices: readonly Pick<TwinDevice, "id" | "status">[] = [],
  serverCoolingBoostActive = false,
): number {
  const baseKw = ROOM_BASE_LOAD_KW[roomId] ?? 0.3;
  const controls = ROOM_QUICK_CONTROLS[roomId];
  if (!controls) return Number(baseKw.toFixed(2));

  let lightsKw = 0;
  for (const light of controls.lights) {
    const isOffline = light.twinDeviceId
      ? devices.some((d) => d.id === light.twinDeviceId && d.status === "offline")
      : light.defaultStatus === "offline";
    if (!isOffline && (lightStates[light.id] ?? light.defaultOn)) {
      lightsKw += light.powerKw;
    }
  }

  let acsKw = 0;
  for (const ac of controls.acs) {
    const state = acStates[ac.id] ?? {
      isOn: ac.defaultOn,
      targetTemp: ac.defaultTemp,
      mode: ac.defaultMode,
    };
    if (state.isOn) {
      const modeKw = ac.powerKwByMode[state.mode] ?? ac.powerKwByMode.cool;
      const tempFactor = state.mode === "cool" ? Math.max(0.85, 1 + (24 - state.targetTemp) * 0.04) : 1;
      acsKw += modeKw * tempFactor;
    }
  }

  const boostKw = roomId === "room-server-01" && serverCoolingBoostActive ? 0.9 : 0;
  return Number((baseKw + lightsKw + acsKw + boostKw).toFixed(2));
}

