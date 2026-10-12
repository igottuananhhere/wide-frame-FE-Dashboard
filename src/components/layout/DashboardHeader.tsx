import { ChevronDown, LogOut, Menu } from "lucide-react";
import { useMemo, type RefObject } from "react";
import { Link } from "react-router-dom";
import ICSLogo from "../common/ICSLogo";
import BuildingFloorSelector from "./BuildingFloorSelector";
import IncidentsPopover from "./IncidentsPopover";
import { useAuthStore } from "../../features/auth/authStore";
import { canControlDevice } from "../../features/auth/permissions";
import { useTwinStore } from "../../features/twin/twinStore";
import { ALL_BUILDING_SCOPE_ID } from "../../data/mock/buildingLocations";
import type { EntityId } from "../../types/models";
import type { BuildingLocationOption } from "../../data/mock/buildingLocations";
import { isUnresolvedIncident } from "../../features/alerts/alertSelectors";
import { formatTelemetryTime, getDataFreshnessPresentation } from "../../features/building/dataFreshness";
import type { DashboardTheme } from "../../features/theme/themePreferences";

type DashboardHeaderProps = {
  locations: readonly BuildingLocationOption[];
  buildingId: EntityId;
  floorId: EntityId;
  onLocationChange: (buildingId: EntityId, floorId: EntityId) => void;
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
  mobileMenuButtonRef: RefObject<HTMLButtonElement | null>;
  theme: DashboardTheme;
  onThemeChange: (theme: DashboardTheme) => void;
};

export default function DashboardHeader({
  locations,
  buildingId,
  floorId,
  onLocationChange,
  onMobileMenuToggle,
  isMobileMenuOpen,
  mobileMenuButtonRef,
  theme,
  onThemeChange,
}: DashboardHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const setAutomaticTelemetryRunning = useTwinStore((state) => state.setAutomaticTelemetryRunning);
  const lastUpdatedByFloor = useTwinStore((state) => state.lastUpdatedByFloor);
  const alerts = useTwinStore((state) => state.alerts);
  const acknowledgeAlert = useTwinStore((state) => state.acknowledgeAlert);
  const selectedFloor = locations.find((location) => location.building.id === buildingId)?.floors
    .find((floor) => floor.id === floorId);
  const noFloorData = floorId !== ALL_BUILDING_SCOPE_ID && selectedFloor?.dataAvailability !== "simulation";
  const freshness = getDataFreshnessPresentation(floorId, automaticTelemetryRunning);
  const scopedUpdatedAt = freshness.updatedFloorId
    ? lastUpdatedByFloor[freshness.updatedFloorId]
    : undefined;
  const canAcknowledge = canControlDevice(role);
  const scopedAlerts = useMemo(() => {
    return alerts.filter((alert) => isUnresolvedIncident(alert)
      && (floorId === ALL_BUILDING_SCOPE_ID || alert.floorId === floorId));
  }, [alerts, floorId]);
  const unresolvedAlertCount = scopedAlerts.length;
  const scopeLabel = floorId === ALL_BUILDING_SCOPE_ID
    ? "Toàn tòa nhà"
    : selectedFloor?.name ?? "Tầng đang chọn";

  const displayName = user?.displayName ?? "ICS User";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  const handleLogout = () => {
    setAutomaticTelemetryRunning(false);
    logout();
  };

  return (
    <header className="dashboard-header">
      <button
        ref={mobileMenuButtonRef}
        aria-expanded={isMobileMenuOpen}
        aria-controls="dashboard-sidebar"
        aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
        className="mobile-menu-toggle"
        onClick={onMobileMenuToggle}
        type="button"
      >
        <Menu aria-hidden="true" size={20} />
      </button>

      <Link
        aria-label="Về tổng quan tòa nhà ICS Digital Twin"
        className="dashboard-header-brand"
        onClick={() => onLocationChange(buildingId, ALL_BUILDING_SCOPE_ID)}
        to="/dashboard/overview"
      >
        <ICSLogo className="dashboard-brand-logo" />
        <span className="dashboard-brand-caption">DIGITAL TWIN</span>
      </Link>

      <div className="dashboard-header-live">
        <BuildingFloorSelector
          buildingId={buildingId}
          floorId={floorId}
          locations={locations}
          onLocationChange={onLocationChange}
        />
        <div aria-label="Chế độ giao diện" className="theme-switcher theme-switcher--header" role="group">
          <span>Giao diện</span>
          <div className="theme-switcher-options">
            <button aria-pressed={theme === "light"} className="theme-switch-button" onClick={() => onThemeChange("light")} type="button">
              Sáng
            </button>
            <button aria-pressed={theme === "dark"} className="theme-switch-button" onClick={() => onThemeChange("dark")} type="button">
              Tối
            </button>
          </div>
        </div>
        {freshness.mode !== "mixed" && (
          <span
            className={`live-indicator live-indicator--${freshness.mode}`}
            role="status"
            aria-label={freshness.ariaLabel}
            data-connection-status={freshness.connectionStatus}
          >
            <span aria-hidden="true" className="live-dot" />
            {freshness.headerLabel}
          </span>
        )}
        <span className="last-sync">
          {scopedUpdatedAt !== undefined ? (
            <>
              Floor 1 · Cập nhật <time aria-label="Floor 1 telemetry last updated" dateTime={new Date(scopedUpdatedAt).toISOString()}>
                {formatTelemetryTime(scopedUpdatedAt)}
              </time>
            </>
          ) : freshness.mode === "static" ? (
            "Floor 2 · Dữ liệu mẫu, không cập nhật trực tiếp"
          ) : (
            "Tầng này chưa có dữ liệu"
          )}
        </span>
      </div>

      <div className="dashboard-header-actions">
        <IncidentsPopover
          unresolvedAlertCount={unresolvedAlertCount}
          noFloorData={noFloorData}
          scopeLabel={scopeLabel}
          alerts={scopedAlerts}
          canAcknowledge={canAcknowledge}
          onAcknowledge={acknowledgeAlert}
        />

        <details className="dashboard-user-menu">
          <summary aria-label={`User menu for ${displayName}`}>
            <span aria-hidden="true" className="user-avatar">{initials}</span>
            <span className="user-menu-identity">
              <span className="user-menu-name">{displayName}</span>
              <span className="user-menu-role">{role}</span>
            </span>
            <ChevronDown aria-hidden="true" className="user-menu-chevron" size={15} />
          </summary>
          <div className="user-menu-popover">
            <p className="user-popover-name">{displayName}</p>
            <p className="user-popover-role">{role} access</p>
            <button onClick={handleLogout} type="button">
              <LogOut aria-hidden="true" size={16} />
              Sign out
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
