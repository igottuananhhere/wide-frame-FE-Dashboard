import { AlertTriangle, CalendarClock, CircleAlert } from "lucide-react";
import type { AttentionEntry } from "../../features/dashboard/types";
import StatusBadge from "./StatusBadge";

const kindLabels = {
  critical: "CRITICAL",
  warning: "WARNING",
  maintenance: "MAINTENANCE",
} as const;

const kindIcons = {
  critical: CircleAlert,
  warning: AlertTriangle,
  maintenance: CalendarClock,
} as const;

type AlertItemProps = { item: AttentionEntry };

export default function AlertItem({ item }: AlertItemProps) {
  const Icon = kindIcons[item.kind];

  return (
    <article className={`attention-item attention-item--${item.kind}`}>
      <span className="attention-icon" aria-hidden="true"><Icon size={17} /></span>
      <div className="attention-copy">
        <div className="attention-meta">
          <StatusBadge status={item.kind} label={kindLabels[item.kind]} />
          <time>{item.occurredAt}</time>
        </div>
        <h3>{item.title}</h3>
        {item.location && <p className="attention-location">{item.location}</p>}
        {item.reading && <p className="attention-reading">{item.reading}</p>}
      </div>
    </article>
  );
}
