import type { LucideIcon } from "lucide-react";

type DetailStatCardProps = {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "cyan" | "green" | "amber" | "red";
};

export default function DetailStatCard({ label, value, detail, icon: Icon, tone = "cyan" }: DetailStatCardProps) {
  return (
    <article className={`detail-stat-card detail-stat-card--${tone}`}>
      <div className="detail-stat-card-heading">
        <span>{label}</span>
        <Icon aria-hidden="true" size={17} />
      </div>
      <strong>{value}</strong>
      {detail && <p>{detail}</p>}
    </article>
  );
}
