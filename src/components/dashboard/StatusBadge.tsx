import type { DashboardStatus } from "../../features/dashboard/types";

const statusLabels: Record<DashboardStatus, string> = {
  normal: "Bình thường",
  online: "Online",
  warning: "Warning",
  critical: "Critical",
  offline: "Offline",
  maintenance: "Maintenance",
};

type StatusBadgeProps = {
  status: DashboardStatus;
  label?: string;
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${status}`}>{label ?? statusLabels[status]}</span>;
}
