import { AlertTriangle, ArrowUpRight, CalendarClock, CheckCircle2, CircleAlert } from "lucide-react";
import ScopedDashboardLink from "../common/ScopedDashboardLink";
import type { AttentionEntry, IncidentCategory } from "../../features/dashboard/types";
import StatusBadge from "./StatusBadge";

const kindLabels = {
  critical: "CRITICAL",
  warning: "WARNING",
  maintenance: "MAINTENANCE",
} as const;

const categoryLabels: Record<IncidentCategory, string> = {
  device: "Sự cố thiết bị",
  environment: "Sự cố môi trường",
  maintenance: "Sự cố bảo trì",
};

const priorityLabels = {
  high: "Ưu tiên cao",
  medium: "Ưu tiên trung bình",
} as const;

const kindIcons = {
  critical: CircleAlert,
  warning: AlertTriangle,
  maintenance: CalendarClock,
} as const;

type AlertItemProps = {
  item: AttentionEntry;
  canAcknowledge?: boolean;
  onAcknowledge?: (alertId: string) => void;
};

function resolveAlertDetailRoute(item: AttentionEntry): string {
  const floorSuffix = item.floorId ? `&floorId=${encodeURIComponent(item.floorId)}` : "";
  if (item.category === "environment" && item.roomId) {
    return `/dashboard/environment?roomId=${encodeURIComponent(item.roomId)}${floorSuffix}`;
  }
  if (item.assetId) {
    return `/dashboard/assets?assetId=${encodeURIComponent(item.assetId)}${floorSuffix}`;
  }
  if (item.deviceId) {
    return `/dashboard/devices?deviceId=${encodeURIComponent(item.deviceId)}${floorSuffix}`;
  }
  return item.floorId ? `/dashboard/incidents?floorId=${encodeURIComponent(item.floorId)}` : "/dashboard/incidents";
}

export default function AlertItem({ item, canAcknowledge = false, onAcknowledge }: AlertItemProps) {
  const Icon = kindIcons[item.kind];
  const priority = item.priority ?? (item.kind === "critical" ? "high" : "medium");
  const detailRoute = resolveAlertDetailRoute(item);
  const floorplanRoute = item.roomId
    ? `/dashboard/overview?${item.floorId ? `floorId=${encodeURIComponent(item.floorId)}&` : ""}roomId=${encodeURIComponent(item.roomId)}`
    : null;
  const floorAttribution =
    item.location && !item.location.includes("Floor") && item.floorId
      ? item.floorId === "ics-headquarters-floor-2"
        ? " · Floor 2"
        : " · Floor 1"
      : "";

  return (
    <article
      className={`attention-item attention-item--${item.kind} attention-item--priority-${priority}`}
      data-priority={priority}
      data-category={item.category}
    >
      <span className="attention-icon" aria-hidden="true"><Icon size={17} /></span>
      <div className="attention-copy">
        <div className="attention-meta">
          <StatusBadge status={item.kind} label={kindLabels[item.kind]} />
          <span className={`attention-priority-pill attention-priority-pill--${priority}`}>
            {priorityLabels[priority]}
          </span>
          {item.category && (
            <span className={`attention-category-pill attention-category-pill--${item.category}`}>
              {categoryLabels[item.category]}
            </span>
          )}
          <span className={`attention-handling-status attention-handling-status--${item.status}`}>
            {item.status === "active" ? "Chưa tiếp nhận" : "Đang xử lý"}
          </span>
          <time>{item.occurredAt}</time>
        </div>
        <h3>{item.title}</h3>
        {item.location && <p className="attention-location">{`${item.location}${floorAttribution}`}</p>}
        {item.reading && <p className="attention-reading">{item.reading}</p>}
        {item.priorityReason && (
          <p className="attention-priority-reason">{item.priorityReason}</p>
        )}
        <div className="attention-actions">
          {canAcknowledge && onAcknowledge && item.status === "active" && (
            <button
              type="button"
              className="attention-ack-btn"
              onClick={() => onAcknowledge(item.id)}
              aria-label={`Tiếp nhận sự cố ${item.id}`}
            >
              <CheckCircle2 size={13} aria-hidden="true" />
              <span>Tiếp nhận</span>
            </button>
          )}
          <ScopedDashboardLink
            className="attention-detail-link"
            to={detailRoute}
            aria-label={`Xem chi tiết sự cố: ${item.title}`}
          >
            <span>Xem chi tiết sự cố</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </ScopedDashboardLink>
          {floorplanRoute && (
            <ScopedDashboardLink
              className="attention-detail-link attention-floorplan-link"
              to={floorplanRoute}
              aria-label={`Mở mặt bằng phòng của sự cố: ${item.title}`}
            >
              <span>Mở mặt bằng phòng</span>
              <ArrowUpRight size={13} aria-hidden="true" />
            </ScopedDashboardLink>
          )}
        </div>
      </div>
    </article>
  );
}


