import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useRef, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { NavLink } from "react-router-dom";
import { ALL_BUILDING_SCOPE_ID } from "../../data/mock/buildingLocations";
import { isUnresolvedIncident } from "../../features/alerts/alertSelectors";
import { useAuthStore } from "../../features/auth/authStore";
import type { AppRole } from "../../features/auth/types";
import { withFloorScope } from "../../features/building/scopedPath";
import type { DashboardTheme } from "../../features/theme/themePreferences";
import { useTwinStore } from "../../features/twin/twinStore";
import { getNavigationGroupsForRole } from "./navigationConfig";

export type DashboardSidebarProps = {
  isCollapsed: boolean;
  isPinned?: boolean;
  isHovered?: boolean;
  isMobileOpen: boolean;
  isMobileInactive: boolean;
  activeScopeLabel: string;
  sidebarRef: RefObject<HTMLElement | null>;
  mobileCloseButtonRef: RefObject<HTMLButtonElement | null>;
  floorId: string;
  role?: AppRole | null;
  theme?: DashboardTheme;
  onThemeChange?: (theme: DashboardTheme) => void;
  unresolvedAlertCount?: number;
  hasCriticalAlerts?: boolean;
  noFloorData?: boolean;
  onToggleCollapsed: () => void;
  onHoverChange?: (hovered: boolean) => void;
  onCloseMobile: () => void;
  onOverviewClick: () => void;
};

export default function DashboardSidebar({
  isCollapsed,
  isPinned = false,
  isHovered = false,
  isMobileOpen,
  isMobileInactive,
  activeScopeLabel,
  sidebarRef,
  mobileCloseButtonRef,
  floorId,
  role,
  theme = "dark",
  onThemeChange,
  unresolvedAlertCount,
  hasCriticalAlerts,
  noFloorData = false,
  onToggleCollapsed,
  onHoverChange,
  onCloseMobile,
  onOverviewClick,
}: DashboardSidebarProps) {
  const storeRole = useAuthStore((state) => state.role);
  const alerts = useTwinStore((state) => state.alerts);
  const lastPointerTypeRef = useRef<string>("mouse");

  const effectiveRole: AppRole = role !== undefined ? (role ?? "Viewer") : (storeRole ?? "Admin");
  const navigationGroups = getNavigationGroupsForRole(effectiveRole);

  const scopedUnresolvedAlerts = alerts.filter(
    (alert) =>
      isUnresolvedIncident(alert) &&
      (floorId === ALL_BUILDING_SCOPE_ID || alert.floorId === floorId),
  );

  const resolvedAlertCount =
    unresolvedAlertCount !== undefined ? unresolvedAlertCount : scopedUnresolvedAlerts.length;
  const resolvedHasCritical =
    hasCriticalAlerts !== undefined
      ? hasCriticalAlerts
      : scopedUnresolvedAlerts.some(
          (alert) => alert.severity === "critical" || alert.kind === "critical",
        );

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType) {
      lastPointerTypeRef.current = event.pointerType;
    }
  };

  const handleMouseEnter = () => {
    if (isMobileOpen || isMobileInactive) return;
    if (lastPointerTypeRef.current === "touch") return;
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    if (isMobileOpen || isMobileInactive) return;
    onHoverChange?.(false);
  };

  const handleNavKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && isHovered && !isPinned && !isMobileOpen) {
      event.preventDefault();
      onHoverChange?.(false);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const links = Array.from(
      event.currentTarget.querySelectorAll<HTMLAnchorElement>("a.navigation-link"),
    );
    if (links.length === 0) return;

    const currentIndex = links.findIndex((link) => link === document.activeElement);
    if (currentIndex === -1) return;

    event.preventDefault();
    if (event.key === "ArrowDown") {
      links[(currentIndex + 1) % links.length]?.focus();
    } else if (event.key === "ArrowUp") {
      links[(currentIndex - 1 + links.length) % links.length]?.focus();
    } else if (event.key === "Home") {
      links[0]?.focus();
    } else if (event.key === "End") {
      links[links.length - 1]?.focus();
    }
  };

  const sidebarClasses = [
    "dashboard-sidebar",
    isCollapsed ? "dashboard-sidebar--collapsed" : "dashboard-sidebar--expanded",
    isPinned ? "dashboard-sidebar--pinned" : "",
    isHovered ? "dashboard-sidebar--hovered" : "",
    isMobileOpen ? "dashboard-sidebar--mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      ref={sidebarRef}
      id="dashboard-sidebar"
      aria-label="Application sidebar"
      aria-hidden={isMobileInactive ? true : undefined}
      inert={isMobileInactive ? true : undefined}
      data-collapsed={isCollapsed ? "true" : "false"}
      data-expanded={isCollapsed ? "false" : "true"}
      data-pinned={isPinned ? "true" : "false"}
      data-hovered={isHovered ? "true" : "false"}
      className={sidebarClasses}
      onPointerDown={handlePointerDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sidebar-topline">
        <div className="sidebar-floor-label">
          <span className="sidebar-floor-marker">
            <Building2 aria-hidden="true" size={15} />
          </span>
          <span className="sidebar-floor-copy">
            <span>ACTIVE SCOPE</span>
            <strong>{activeScopeLabel}</strong>
          </span>
        </div>
        <button
          ref={mobileCloseButtonRef}
          aria-label={
            isMobileOpen
              ? "Close sidebar"
              : isPinned
                ? "Unpin and collapse sidebar"
                : "Pin and expand sidebar"
          }
          aria-expanded={isMobileOpen ? true : !isCollapsed}
          aria-pressed={isMobileOpen ? undefined : isPinned}
          data-pinned={isPinned ? "true" : "false"}
          title={
            isMobileOpen
              ? "Đóng thanh điều hướng"
              : isPinned
                ? "Bỏ ghim Sidebar (Tự động thu gọn khi rời chuột)"
                : "Ghim mở Sidebar cố định"
          }
          className={`sidebar-collapse-button${isPinned && !isMobileOpen ? " sidebar-collapse-button--pinned" : ""}`}
          onClick={isMobileOpen ? onCloseMobile : onToggleCollapsed}
          type="button"
        >
          {isMobileOpen ? (
            <X aria-hidden="true" size={17} />
          ) : isPinned ? (
            <ChevronLeft aria-hidden="true" size={17} />
          ) : (
            <ChevronRight aria-hidden="true" size={17} />
          )}
        </button>
      </div>

      <nav
        aria-label="Dashboard navigation"
        className="dashboard-navigation"
        onKeyDown={handleNavKeyDown}
      >
        {navigationGroups.map((group) => (
          <div className="navigation-group" key={group.id}>
            <p className="navigation-group-title">{group.title}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const showAlertBadge = item.badgeKey === "unresolvedAlerts";
              const badgeTone = noFloorData
                ? "unavailable"
                : resolvedHasCritical
                  ? "critical"
                  : resolvedAlertCount > 0
                    ? "warning"
                    : "normal";
              const targetPath = item.preserveFloorScope
                ? withFloorScope(item.to, floorId)
                : item.to;

              return (
                <NavLink
                  aria-label={item.label}
                  className={({ isActive }) =>
                    `navigation-link${isActive ? " navigation-link--active" : ""}`
                  }
                  data-nav-id={item.id}
                  end={item.end}
                  key={item.to}
                  onClick={() => {
                    onCloseMobile();
                    if (item.to === "/dashboard/overview") onOverviewClick();
                  }}
                  title={
                    isCollapsed
                      ? `${item.label} · ${item.englishLabel}${showAlertBadge && !noFloorData ? ` (${resolvedAlertCount})` : ""}`
                      : item.englishLabel
                  }
                  to={targetPath}
                >
                  <Icon className="navigation-link-icon" aria-hidden="true" size={18} strokeWidth={1.8} />
                  <span className="navigation-link-copy">
                    <span className="navigation-link-label">{item.label}</span>
                    <span className="navigation-link-sublabel">{item.englishLabel}</span>
                  </span>
                  {showAlertBadge && (
                    <span
                      className={`navigation-link-badge navigation-link-badge--${badgeTone}`}
                      data-testid="sidebar-alert-badge"
                      title={
                        noFloorData
                          ? "Chưa có dữ liệu sự cố cho tầng này"
                          : `${resolvedAlertCount} sự cố chưa giải quyết (Dữ liệu mô phỏng Digital Twin)`
                      }
                    >
                      {noFloorData ? "—" : resolvedAlertCount}
                    </span>
                  )}
                  <span aria-hidden="true" className="navigation-active-marker" />
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-theme-section">
        <div
          aria-label="Chế độ giao diện"
          className="theme-switcher theme-switcher--sidebar"
          role="group"
        >
          <div className="theme-switcher-options">
            <button
              aria-label="Chế độ sáng"
              aria-pressed={theme === "light"}
              className={`theme-switch-button${theme === "light" ? " theme-switch-button--active" : ""}`}
              data-theme-option="light"
              data-tooltip="Chế độ sáng"
              onClick={() => onThemeChange?.("light")}
              title="Chế độ sáng"
              type="button"
            >
              <Sun aria-hidden="true" size={16} strokeWidth={1.9} />
            </button>
            <button
              aria-label="Chế độ tối"
              aria-pressed={theme === "dark"}
              className={`theme-switch-button${theme === "dark" ? " theme-switch-button--active" : ""}`}
              data-theme-option="dark"
              data-tooltip="Chế độ tối"
              onClick={() => onThemeChange?.("dark")}
              title="Chế độ tối"
              type="button"
            >
              <Moon aria-hidden="true" size={16} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </div>

      <div className="sidebar-bottom-note">
        <span aria-hidden="true" className="sidebar-bottom-dot" />
        <span>ICS HEADQUARTERS · {activeScopeLabel.toUpperCase()}</span>
      </div>
    </aside>
  );
}
