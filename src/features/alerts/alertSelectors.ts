import type { AlertStatus } from "../../types/models";
import type { TwinAlert } from "../twin/types";

export type IncidentStatusFilter = "all" | AlertStatus;

export function filterIncidents(alerts: readonly TwinAlert[], filter: IncidentStatusFilter): TwinAlert[] {
  return [...alerts]
    .filter((alert) => filter === "all" || alert.status === filter)
    .sort((first, second) => second.occurredAt - first.occurredAt);
}
