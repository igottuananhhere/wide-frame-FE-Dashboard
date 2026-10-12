import type { AlertStatus } from "../../types/models";
import type { TwinAlert } from "../twin/types";

export type IncidentStatusFilter = "unresolved" | AlertStatus;

export function isUnresolvedIncident<T extends Pick<TwinAlert, "status">>(
  alert: T,
): alert is T & { status: "active" | "acknowledged" } {
  return alert.status !== "resolved";
}

export function filterIncidents(alerts: readonly TwinAlert[], filter: IncidentStatusFilter): TwinAlert[] {
  return [...alerts]
    .filter((alert) => filter === "unresolved"
      ? isUnresolvedIncident(alert)
      : alert.status === filter)
    .sort((first, second) => second.occurredAt - first.occurredAt);
}
