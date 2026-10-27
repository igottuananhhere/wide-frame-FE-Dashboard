import {
  ACTIVE_FLOOR_ID,
  ALL_BUILDING_SCOPE_ID,
} from "../../data/mock/buildingLocations";

export type DataFreshnessMode = "live" | "paused" | "static" | "mixed" | "unavailable";

export interface DataFreshnessPresentation {
  mode: DataFreshnessMode;
  label: string;
  headerLabel: string;
  ariaLabel: string;
  connectionStatus: string;
  updatedFloorId: string | null;
}

export function getDataFreshnessPresentation(
  floorId: string,
  automaticTelemetryRunning: boolean,
): DataFreshnessPresentation {
  const floor1State = automaticTelemetryRunning ? "live" : "paused";
  const statusText = automaticTelemetryRunning ? "Mô phỏng đang chạy" : "Mô phỏng tạm dừng";

  if (floorId === ACTIVE_FLOOR_ID) {
    return {
      mode: floor1State,
      label: `Tầng 1 · ${statusText}`,
      headerLabel: statusText,
      ariaLabel: `Floor 1 ${floor1State} simulation`,
      connectionStatus: `simulation-${floor1State}`,
      updatedFloorId: ACTIVE_FLOOR_ID,
    };
  }

  if (floorId === ALL_BUILDING_SCOPE_ID) {
    return {
      mode: floor1State,
      label: `Phạm vi demo Tầng 1 · ${statusText}`,
      headerLabel: statusText,
      ariaLabel: `Building demo scope: Floor 1 ${floor1State} simulation`,
      connectionStatus: `simulation-${floor1State}`,
      updatedFloorId: ACTIVE_FLOOR_ID,
    };
  }

  return {
    mode: "unavailable",
    label: "Ngoài phạm vi demo",
    headerLabel: "Ngoài phạm vi demo",
    ariaLabel: "Out of demo scope for selected floor",
    connectionStatus: "out-of-demo-scope",
    updatedFloorId: null,
  };
}

export function formatTelemetryTime(timestamp: number): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(timestamp);
}
