import { useMemo, useState } from "react";
import { Check, CircleAlert, ShieldAlert } from "lucide-react";
import ModulePageHeader from "../../components/common/ModulePageHeader";
import DetailStatCard from "../../components/dashboard/DetailStatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { filterIncidents } from "../../features/alerts/alertSelectors";
import type { IncidentStatusFilter } from "../../features/alerts/alertSelectors";
import { floor1AssetIdentities } from "../../data/mock/floor1AssetIdentities.mock";
import { floor2AssetIdentities } from "../../data/mock/floor2AssetIdentities.mock";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import { useAuthStore } from "../../features/auth/authStore";
import { canControlDevice } from "../../features/auth/permissions";
import { useTwinStore } from "../../features/twin/twinStore";
import type { AlertStatus, OperationalStatus } from "../../types/models";

const statusFilters: readonly { id: AlertStatus; label: string }[] = [
  { id: "active", label: "Open" },
  { id: "acknowledged", label: "Acknowledged" },
  { id: "resolved", label: "Resolved" },
];

const statusPresentation: Record<AlertStatus, { label: string; tone: OperationalStatus }> = {
  active: { label: "Open", tone: "warning" },
  acknowledged: { label: "Acknowledged", tone: "normal" },
  resolved: { label: "Resolved", tone: "offline" },
};

const severityPresentation: Record<string, { label: string; tone: OperationalStatus }> = {
  critical: { label: "Critical", tone: "critical" },
  warning: { label: "Warning", tone: "warning" },
  info: { label: "Info", tone: "normal" },
};

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function IncidentsPage() {
  const [filter, setFilter] = useState<IncidentStatusFilter>("active");
  const scope = useDashboardScopeData();
  const { alerts, devices } = scope;
  const acknowledgeAlert = useTwinStore((state) => state.acknowledgeAlert);
  const role = useAuthStore((state) => state.role);
  const canAcknowledge = canControlDevice(role);
  const visibleAlerts = useMemo(() => filterIncidents(alerts, filter), [alerts, filter]);
  const assetIdentities = [...floor1AssetIdentities, ...floor2AssetIdentities];
  const openCount = alerts.filter((alert) => alert.status === "active").length;
  const acknowledgedCount = alerts.filter((alert) => alert.status === "acknowledged").length;
  const resolvedCount = alerts.filter((alert) => alert.status === "resolved").length;
  const criticalCount = alerts.filter((alert) => alert.status === "active" && alert.severity === "critical").length;
  const statusCounts: Record<AlertStatus, number> = {
    active: openCount,
    acknowledged: acknowledgedCount,
    resolved: resolvedCount,
  };

  return (
    <section className="dashboard-page detail-module-page" aria-labelledby="module-page-title">
      <ModulePageHeader
        section="OPERATION / INCIDENTS"
        title={`Sự cố vận hành · ${scope.scopeLabel}`}
        description={`Theo dõi sự cố theo mức độ, khu vực và trạng thái xử lý trong ${scope.scopeLabel}.`}
        scopeLabel={scope.scopeLabel}
      />

      <section className="detail-stat-grid detail-stat-grid--incidents" aria-label="Incident summary">
        <DetailStatCard label="Open incidents" value={String(openCount)} detail="Đang cần xử lý" icon={CircleAlert} tone={openCount ? "amber" : "green"} />
        <DetailStatCard label="Critical" value={String(criticalCount)} detail="Ưu tiên cao nhất" icon={ShieldAlert} tone={criticalCount ? "red" : "green"} />
        <DetailStatCard label="Acknowledged" value={String(acknowledgedCount)} detail="Đã tiếp nhận" icon={Check} tone="cyan" />
        <DetailStatCard label="Resolved" value={String(resolvedCount)} detail="Đã khôi phục" icon={Check} tone="green" />
      </section>

      <section className="detail-panel" aria-labelledby="incident-list-title">
        <header className="detail-panel-header incident-list-heading">
          <div>
            <p className="section-eyebrow">INCIDENT REGISTER</p>
            <h2 id="incident-list-title">Nhật ký sự cố</h2>
          </div>
          <div className="incident-filter-group" role="group" aria-label="Filter incidents by status">
            {statusFilters.map((option) => (
              <button
                aria-pressed={filter === option.id}
                className={filter === option.id ? "incident-filter-button is-active" : "incident-filter-button"}
                key={option.id}
                onClick={() => setFilter(option.id)}
                type="button"
              >
                {option.label}<span>{statusCounts[option.id]}</span>
              </button>
            ))}
          </div>
        </header>
        <div className="detail-table-scroll">
          <table className="detail-data-table" aria-label={`Incidents in ${scope.scopeLabel}`}>
            <thead><tr><th>Severity</th><th>Incident</th><th>Area</th><th>Asset</th><th>Created</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {visibleAlerts.map((alert) => {
                const asset = assetIdentities.find((item) => item.id === alert.assetId);
                const device = devices.find((item) => item.id === alert.deviceId);
                const severity = severityPresentation[alert.severity] ?? severityPresentation.info;
                const status = statusPresentation[alert.status];
                return (
                  <tr key={alert.id}>
                    <td><StatusBadge status={severity.tone} label={severity.label} /></td>
                    <th scope="row"><span className="incident-title-cell">{alert.title}</span><small>{alert.message}</small></th>
                    <td>{alert.location ?? "—"}</td>
                    <td>{asset?.name ?? device?.name ?? "—"}</td>
                    <td><time dateTime={alert.createdAt}>{formatCreatedAt(alert.createdAt)}</time></td>
                    <td><StatusBadge status={status.tone} label={status.label} /></td>
                    <td>
                      {alert.status === "active" && canAcknowledge ? (
                        <button className="incident-acknowledge-button" type="button" onClick={() => acknowledgeAlert(alert.id)} aria-label={`Acknowledge ${alert.title}`}>
                          <Check aria-hidden="true" size={14} /> Acknowledge
                        </button>
                      ) : alert.status === "active" ? (
                        <span className="incident-viewer-note">Admin xử lý</span>
                      ) : <span className="incident-action-complete">—</span>}
                    </td>
                  </tr>
                );
              })}
              {visibleAlerts.length === 0 && (
                <tr><td className="detail-empty-cell" colSpan={7}>Không có sự cố trong trạng thái này.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="detail-panel-footnote">{canAcknowledge ? "Acknowledge cập nhật trạng thái mock trong Twin Store." : "Viewer chỉ theo dõi; tài khoản Admin thực hiện Acknowledge trong demo."}</p>
      </section>
    </section>
  );
}
