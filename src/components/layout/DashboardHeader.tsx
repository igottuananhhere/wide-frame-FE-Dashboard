import { Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import ICSLogo from "../common/ICSLogo";
import BuildingFloorSelector from "./BuildingFloorSelector";
import { useAuthStore } from "../../features/auth/authStore";
import { useTwinStore } from "../../features/twin/twinStore";
import { ALL_BUILDING_SCOPE_ID } from "../../data/mock/buildingLocations";
import type { EntityId } from "../../types/models";
import type { BuildingLocationOption } from "../../data/mock/buildingLocations";

type DashboardHeaderProps = {
  locations: readonly BuildingLocationOption[];
  buildingId: EntityId;
  floorId: EntityId;
  onLocationChange: (buildingId: EntityId, floorId: EntityId) => void;
  onMobileMenuToggle: () => void;
  isMobileMenuOpen: boolean;
};

export default function DashboardHeader({
  locations,
  buildingId,
  floorId,
  onLocationChange,
  onMobileMenuToggle,
  isMobileMenuOpen,
}: DashboardHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const connectionStatus = useTwinStore((state) => state.connectionStatus);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const setAutomaticTelemetryRunning = useTwinStore((state) => state.setAutomaticTelemetryRunning);
  const lastUpdated = useTwinStore((state) => state.lastUpdated);
  const alerts = useTwinStore((state) => state.alerts);
  const selectedFloor = locations.find((location) => location.building.id === buildingId)?.floors
    .find((floor) => floor.id === floorId);
  const noFloorData = floorId !== ALL_BUILDING_SCOPE_ID && selectedFloor?.dataAvailability !== "simulation";
  const activeAlertCount = alerts.filter((alert) => alert.status === "active"
    && (floorId === ALL_BUILDING_SCOPE_ID || alert.floorId === floorId)).length;

  const displayName = user?.displayName ?? "ICS User";
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  const handleLogout = () => {
    setAutomaticTelemetryRunning(false);
    logout();
  };

  return (
    <header className="dashboard-header">
      <button
        aria-expanded={isMobileMenuOpen}
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

      <div className="dashboard-header-location">
        <BuildingFloorSelector
          buildingId={buildingId}
          floorId={floorId}
          locations={locations}
          onLocationChange={onLocationChange}
        />
      </div>

      <div className="dashboard-header-live">
        <span
          className={`live-indicator live-indicator--simulation${automaticTelemetryRunning ? " is-active" : ""}`}
          role="status"
          aria-label={automaticTelemetryRunning ? "Live simulation" : "Paused simulation"}
          data-connection-status={connectionStatus}
        >
          <span aria-hidden="true" className="live-dot" />
          {automaticTelemetryRunning ? "LIVE" : "PAUSED"}<i aria-hidden="true">/</i> SIMULATION
        </span>
        <span className="last-sync">
          Last update <time aria-label={noFloorData ? "No data for selected floor" : "Last updated"} dateTime={noFloorData ? undefined : new Date(lastUpdated).toISOString()}>
            {noFloorData ? "Chưa có dữ liệu" : new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
              .format(lastUpdated)}
          </time>
        </span>
      </div>

      <div className="dashboard-header-actions">
        <div aria-label={noFloorData ? `Alert data unavailable for ${selectedFloor?.name ?? "selected floor"}` : `${activeAlertCount} active alerts`} className="alerts-summary">
          <Bell aria-hidden="true" size={17} />
          <span>Alerts</span>
          <span className="alerts-count">{noFloorData ? "—" : activeAlertCount}</span>
        </div>

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
