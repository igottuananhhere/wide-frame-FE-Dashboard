import { Activity, Bell, Leaf, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { KpiIcon, KpiSummary } from "../../features/dashboard/types";
import StatusBadge from "./StatusBadge";

const iconByType: Record<KpiIcon, LucideIcon> = {
  energy: Zap,
  devices: Activity,
  environment: Leaf,
  alerts: Bell,
};

type KpiCardProps = { item: KpiSummary; to?: string };

export default function KpiCard({ item, to }: KpiCardProps) {
  const Icon = iconByType[item.icon];

  const card = (
    <article className={`kpi-card kpi-card--${item.icon}`} aria-label={item.label}>
      <div className="kpi-card-topline">
        <span className="kpi-card-label">{item.label}</span>
        <span className="kpi-icon" aria-hidden="true"><Icon size={17} strokeWidth={1.8} /></span>
      </div>
      <strong className="kpi-card-value">{item.value}</strong>
      <div className="kpi-card-details">
        {item.details.map((detail) => detail.tone ? (
          <StatusBadge key={detail.label} status={detail.tone} label={detail.label} />
        ) : (
          <span key={detail.label} className="kpi-detail-copy">{detail.label}</span>
        ))}
      </div>
    </article>
  );

  return to ? <Link aria-label={`Xem chi tiết: ${item.label}`} className="kpi-card-link" to={to}>{card}</Link> : card;
}
