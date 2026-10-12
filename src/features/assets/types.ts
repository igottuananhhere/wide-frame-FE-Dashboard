import type { EntityId } from "../../types/models";

export interface AssetDigitalIdentity {
  id: EntityId;
  deviceId: EntityId;
  roomId: EntityId;
  name: string;
  manufacturer: string;
  model: string;
  installationDate: string;
  runtimeHours: number;
  maintenanceIntervalHours: number;
  serialNumber: string;
  category?: "air-conditioner" | "controller" | "sensor" | "lighting" | "other";
  hasMaintenancePlan?: boolean;
}

export type AssetMaintenanceStatus = "normal" | "due-soon" | "due" | "unconfigured";

export type MaintenanceBasis = "runtime_hours" | "calendar" | "condition";

export type PlanDueStatus = "normal" | "due-soon" | "due" | "overdue" | "unspecified";

export type PlanProgressStatus = "scheduled" | "in_progress" | "completed";

export interface MaintenancePlanItem {
  id: EntityId;
  assetId: EntityId;
  deviceId?: EntityId;
  assetName: string;
  assetModel?: string;
  roomId?: EntityId;
  floorId?: EntityId;
  title: string;
  basis: MaintenanceBasis;
  basisLabel: string;
  intervalValue: number;
  intervalUnit: "hours" | "days" | "months" | "years";
  intervalLabel: string;
  nominalCycleLabel: string;
  nextMilestoneValue: number | string;
  nextMilestoneLabel: string;
  remainingHours?: number;
  remainingDays?: number;
  remainingLabel: string;
  dueStatus: PlanDueStatus;
  progressStatus: PlanProgressStatus;
  assignee: string;
  lastCompletedDate?: string;
  notes?: string;
}

export interface MaintenanceHistoryRecord {
  id: EntityId;
  planId?: EntityId;
  assetId: EntityId;
  deviceId?: EntityId;
  assetName: string;
  itemTitle: string;
  completedAt: string;
  completedAtIso?: string;
  performer: string;
  result: "passed" | "needs_monitoring" | "failed";
  resultLabel: string;
  notes: string;
  runtimeHoursAtService?: number;
}

export interface MaintenanceKpiSummary {
  assetsInScopeCount: number;
  dueSoonPlansCount: number;
  overduePlansCount: number;
  unconfiguredAssetsCount: number;
}

