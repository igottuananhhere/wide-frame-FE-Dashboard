import { Droplets, Gauge, Thermometer, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EnvironmentMetric } from "../../features/dashboard/types";

const metricIcons: Record<EnvironmentMetric["icon"], LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplets,
  co2: Wind,
  pm25: Gauge,
};

type MetricCardProps = { metric: EnvironmentMetric };

export default function MetricCard({ metric }: MetricCardProps) {
  const Icon = metricIcons[metric.icon];

  return (
    <article className="metric-card">
      <span className="metric-card-icon" aria-hidden="true"><Icon size={16} /></span>
      <p>{metric.label}</p>
      <strong>{metric.value}</strong>
    </article>
  );
}
