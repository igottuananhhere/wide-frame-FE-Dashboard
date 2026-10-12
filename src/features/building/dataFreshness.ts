import {
  ACTIVE_FLOOR_ID,
  ALL_BUILDING_SCOPE_ID,
  DEMO_FLOOR_2_ID,
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

  if (floorId === ACTIVE_FLOOR_ID) {
    const label = `Floor 1 ${automaticTelemetryRunning ? "LIVE" : "PAUSED"} · Simulation`;
    return {
      mode: floor1State,
      label,
      headerLabel: `F1 ${automaticTelemetryRunning ? "LIVE" : "PAUSED"}`,
      ariaLabel: `Floor 1 ${floor1State} simulation`,
      connectionStatus: `simulation-${floor1State}`,
      updatedFloorId: ACTIVE_FLOOR_ID,
    };
  }

  if (floorId === DEMO_FLOOR_2_ID) {
    return {
      mode: "static",
      label: "Floor 2 · DỮ LIỆU MẪU TĨNH",
      headerLabel: "F2 · MẪU TĨNH",
      ariaLabel: "Floor 2 static demo data",
      connectionStatus: "static-demo",
      updatedFloorId: null,
    };
  }

  if (floorId === ALL_BUILDING_SCOPE_ID) {
    return {
      mode: "mixed",
      label: `Floor 1 ${automaticTelemetryRunning ? "LIVE" : "PAUSED"} · Floor 2 static demo`,
      headerLabel: `F1 ${automaticTelemetryRunning ? "LIVE" : "PAUSED"} · F2 STATIC`,
      ariaLabel: `Mixed data: Floor 1 ${floor1State} simulation; Floor 2 static demo data`,
      connectionStatus: "mixed-data-sources",
      updatedFloorId: ACTIVE_FLOOR_ID,
    };
  }

  return {
    mode: "unavailable",
    label: "CHƯA CÓ DỮ LIỆU",
    headerLabel: "NO DATA",
    ariaLabel: "No monitoring data for selected floor",
    connectionStatus: "no-data",
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
