import type { OperationalStatus } from "../../types/models";

export type DashboardStatus = OperationalStatus | "online" | "maintenance";

export type KpiIcon = "energy" | "devices" | "environment" | "alerts";

export interface KpiDetail {
  label: string;
  tone?: DashboardStatus;
}

export interface KpiSummary {
  id: string;
  label: string;
  value: string;
  icon: KpiIcon;
  details: KpiDetail[];
}

export type AttentionKind = "critical" | "warning" | "maintenance";

export interface AttentionEntry {
  id: string;
  kind: AttentionKind;
  title: string;
  location?: string;
  reading?: string;
  occurredAt: string;
}

export interface EnergyPoint {
  time: string;
  kwh: number;
}

export interface EnvironmentMetric {
  id: string;
  label: string;
  value: string;
  icon: "temperature" | "humidity" | "co2" | "pm25";
}

export interface AssetException {
  id: string;
  type: string;
  area: string;
  status: Extract<OperationalStatus, "warning" | "critical" | "offline">;
  issue: string;
  actionLabel: string;
}
