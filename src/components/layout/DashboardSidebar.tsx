import {
  AlertTriangle,
  Building2,
  Box,
  ChevronLeft,
  ChevronRight,
  Cpu,
  LayoutDashboard,
  Package,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";

type DashboardSidebarProps = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  activeScopeLabel: string;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  onOverviewClick: () => void;
};

type NavigationItem = { label: string; to: string; icon: LucideIcon; end?: boolean };
type NavigationGroup = { title: string; items: readonly NavigationItem[] };

const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  {
    title: "OVERVIEW",
    items: [{ label: "Tổng quan", to: "/dashboard/overview", icon: LayoutDashboard, end: true }],
  },
  {
    title: "MONITORING",
    items: [
      { label: "Năng lượng", to: "/dashboard/energy", icon: Zap },
      { label: "Môi trường", to: "/dashboard/environment", icon: Wind },
      { label: "Thiết bị", to: "/dashboard/devices", icon: Cpu },
    ],
  },
  {
    title: "OPERATION",
    items: [
      { label: "Sự cố", to: "/dashboard/incidents", icon: AlertTriangle },
      { label: "Tài sản & bảo trì", to: "/dashboard/assets", icon: Package },
    ],
  },
  {
    title: "DIGITAL TWIN",
    items: [{ label: "Mô hình 3D", to: "/dashboard/digital-twin", icon: Box }],
  },
];

export default function DashboardSidebar({
  isCollapsed,
  isMobileOpen,
  activeScopeLabel,
  onToggleCollapsed,
  onCloseMobile,
  onOverviewClick,
}: DashboardSidebarProps) {
  return (
    <aside
      aria-label="Application sidebar"
      className={`dashboard-sidebar${isCollapsed ? " dashboard-sidebar--collapsed" : ""}${isMobileOpen ? " dashboard-sidebar--mobile-open" : ""}`}
    >
      <div className="sidebar-topline">
        <div className="sidebar-floor-label">
          <span className="sidebar-floor-marker"><Building2 aria-hidden="true" size={15} /></span>
          <span className="sidebar-floor-copy">
            <span>ACTIVE SCOPE</span>
            <strong>{activeScopeLabel}</strong>
          </span>
        </div>
        <button
          aria-label={isMobileOpen ? "Close sidebar" : isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sidebar-collapse-button"
          onClick={isMobileOpen ? onCloseMobile : onToggleCollapsed}
          type="button"
        >
          {isMobileOpen ? <X aria-hidden="true" size={17} /> : isCollapsed
            ? <ChevronRight aria-hidden="true" size={17} />
            : <ChevronLeft aria-hidden="true" size={17} />}
        </button>
      </div>

      <nav aria-label="Dashboard navigation" className="dashboard-navigation">
        {NAVIGATION_GROUPS.map((group) => (
          <div className="navigation-group" key={group.title}>
            <p className="navigation-group-title">{group.title}</p>
            {group.items.map(({ label, to, icon: Icon, end }) => (
              <NavLink
                aria-label={label}
                className={({ isActive }) => `navigation-link${isActive ? " navigation-link--active" : ""}`}
                end={end}
                key={to}
                onClick={() => {
                  onCloseMobile();
                  if (to === "/dashboard/overview") onOverviewClick();
                }}
                title={isCollapsed ? label : undefined}
                to={to}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span className="navigation-link-label">{label}</span>
                <span aria-hidden="true" className="navigation-active-marker" />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom-note">
        <span aria-hidden="true" className="sidebar-bottom-dot" />
        <span>ICS HEADQUARTERS · {activeScopeLabel.toUpperCase()}</span>
      </div>
    </aside>
  );
}
