import { useMemo, useState } from "react";
import { Check, CircleAlert, ShieldAlert } from "lucide-react";
import ModulePageHeader from "../../components/common/ModulePageHeader";
import TableScrollHint from "../../components/common/TableScrollHint";
import DetailStatCard from "../../components/dashboard/DetailStatCard";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { filterIncidents, isUnresolvedIncident } from "../../features/alerts/alertSelectors";
import type { IncidentStatusFilter } from "../../features/alerts/alertSelectors";
import { floor1AssetIdentities } from "../../data/mock/floor1AssetIdentities.mock";
import { floor2AssetIdentities } from "../../data/mock/floor2AssetIdentities.mock";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";
import { useAuthStore } from "../../features/auth/authStore";
import { canControlDevice } from "../../features/auth/permissions";
import { useTwinStore } from "../../features/twin/twinStore";
import type { AlertStatus, OperationalStatus } from "../../types/models";

const statusFilters: readonly { id: IncidentStatusFilter; label: string }[] = [
  { id: "unresolved", label: "Chưa giải quyết" },
  { id: "active", label: "Chưa tiếp nhận" },
  { id: "acknowledged", label: "Đang xử lý" },
  { id: "resolved", label: "Đã giải quyết" },
];

const statusPresentation: Record<AlertStatus, { label: string; tone: OperationalStatus }> = {
  active: { label: "Chưa tiếp nhận", tone: "warning" },
  acknowledged: { label: "Đang xử lý", tone: "warning" },
  resolved: { label: "Đã giải quyết", tone: "normal" },
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
  const [filter, setFilter] = useState<IncidentStatusFilter>("unresolved");
  const scope = useDashboardScopeData();
  const { alerts, devices } = scope;
  const acknowledgeAlert = useTwinStore((state) => state.acknowledgeAlert);
  const role = useAuthStore((state) => state.role);
  const canAcknowledge = canControlDevice(role);
  const visibleAlerts = useMemo(() => filterIncidents(alerts, filter), [alerts, filter]);
  const assetIdentities = [...floor1AssetIdentities, ...floor2AssetIdentities];
  const unresolvedCount = alerts.filter(isUnresolvedIncident).length;
  const unacknowledgedCount = alerts.filter((alert) => alert.status === "active").length;
  const acknowledgedCount = alerts.filter((alert) => alert.status === "acknowledged").length;
  const resolvedCount = alerts.filter((alert) => alert.status === "resolved").length;
  const criticalCount = alerts.filter((alert) => isUnresolvedIncident(alert) && alert.severity === "critical").length;
  const statusCounts: Record<IncidentStatusFilter, number> = {
    unresolved: unresolvedCount,
    active: unacknowledgedCount,
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
        <DetailStatCard label="Sự cố chưa giải quyết" value={String(unresolvedCount)} detail={`${unacknowledgedCount} chưa tiếp nhận · ${acknowledgedCount} đang xử lý`} icon={CircleAlert} tone={unresolvedCount ? "amber" : "green"} />
        <DetailStatCard label="Critical" value={String(criticalCount)} detail="Ưu tiên cao nhất" icon={ShieldAlert} tone={criticalCount ? "red" : "green"} />
        <DetailStatCard label="Đang xử lý" value={String(acknowledgedCount)} detail="Đã tiếp nhận, chưa giải quyết" icon={Check} tone="amber" />
        <DetailStatCard label="Đã giải quyết" value={String(resolvedCount)} detail="Đã khôi phục" icon={Check} tone="green" />
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
        <ul className="incident-mobile-card-list" aria-label={`Incidents in ${scope.scopeLabel}`}>
          {visibleAlerts.map((alert) => {
            const asset = assetIdentities.find((item) => item.id === alert.assetId);
            const device = devices.find((item) => item.id === alert.deviceId);
            const severity = severityPresentation[alert.severity] ?? severityPresentation.info;
            const status = statusPresentation[alert.status];
            return (
              <li key={alert.id}>
                <article className="incident-mobile-card" aria-label={alert.title}>
                  <div className="incident-mobile-card-topline">
                    <StatusBadge status={severity.tone} label={severity.label} />
                    <StatusBadge status={status.tone} label={status.label} />
                  </div>
                  <h3>{alert.title}</h3>
                  <p>{alert.message}</p>
                  <dl>
                    <div><dt>Khu vực</dt><dd>{alert.location ?? "—"}</dd></div>
                    <div><dt>Tài sản</dt><dd>{asset?.name ?? device?.name ?? "—"}</dd></div>
                    <div><dt>Thời điểm</dt><dd><time dateTime={alert.createdAt}>{formatCreatedAt(alert.createdAt)}</time></dd></div>
                  </dl>
                  <footer>
                    {alert.status === "active" && canAcknowledge ? (
                      <button className="incident-acknowledge-button" type="button" onClick={() => acknowledgeAlert(alert.id)} aria-label={`Tiếp nhận ${alert.title}`}>
                        <Check aria-hidden="true" size={14} /> Tiếp nhận
                      </button>
                    ) : alert.status === "active" ? (
                      <span className="incident-viewer-note">Admin xử lý</span>
                    ) : (
                      <span className="incident-action-complete">{status.label}</span>
                    )}
                  </footer>
                </article>
              </li>
            );
          })}
          {visibleAlerts.length === 0 && <li className="incident-mobile-empty">Không có sự cố trong trạng thái này.</li>}
        </ul>
        <div className="detail-table-scroll incident-table-desktop" role="region" aria-label={`Incidents in ${scope.scopeLabel}; horizontal scroll to see all columns`} tabIndex={0}>
          <table className="detail-data-table incident-data-table" aria-label={`Incidents in ${scope.scopeLabel}`}>
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
                        <button className="incident-acknowledge-button" type="button" onClick={() => acknowledgeAlert(alert.id)} aria-label={`Tiếp nhận ${alert.title}`}>
                          <Check aria-hidden="true" size={14} /> Tiếp nhận
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
          <TableScrollHint />
        </div>
        <p className="detail-panel-footnote">{canAcknowledge ? "Tiếp nhận cập nhật trạng thái mô phỏng trong Twin Store; sự cố vẫn mở đến khi điều kiện được khôi phục." : "Viewer chỉ theo dõi; tài khoản Admin thực hiện tiếp nhận trong demo."}</p>
      </section>
    </section>
  );
}
