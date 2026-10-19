import { useEffect, useRef, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import {
  ACTIVE_BUILDING_ID,
  ALL_BUILDING_SCOPE_ID,
  BUILDING_LOCATIONS,
} from "../../data/mock/buildingLocations";
import type { EntityId } from "../../types/models";
import { isUnresolvedIncident } from "../../features/alerts/alertSelectors";
import { useAuthStore } from "../../features/auth/authStore";
import { useTwinStore } from "../../features/twin/twinStore";
import type { DashboardLocationContextValue } from "../../features/building/types";
import {
  persistDashboardTheme,
  persistSidebarPinned,
  readDashboardTheme,
  readSidebarPinned,
} from "../../features/theme/themePreferences";

const TELEMETRY_INTERVAL_MS = 3_000;
const MOBILE_NAV_QUERY = "(max-width: 850px)";

function matchesMobileNavigationViewport(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(MOBILE_NAV_QUERY).matches;
}

export default function DashboardLayout() {
  const [isPinned, setIsPinned] = useState(readSidebarPinned);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(matchesMobileNavigationViewport);
  const [theme, setTheme] = useState(readDashboardTheme);
  const [buildingId, setBuildingId] = useState<EntityId>(ACTIVE_BUILDING_ID);
  const [searchParams, setSearchParams] = useSearchParams();
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpen = useRef(false);
  const role = useAuthStore((state) => state.role);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const advanceTelemetry = useTwinStore((state) => state.advanceTelemetry);
  const alerts = useTwinStore((state) => state.alerts);
  const requestedFloorId = searchParams.get("floorId");
  const buildingFloors = BUILDING_LOCATIONS.find((location) => location.building.id === buildingId)?.floors ?? [];
  const floorId = requestedFloorId && buildingFloors.some((floor) => floor.id === requestedFloorId)
    ? requestedFloorId
    : ALL_BUILDING_SCOPE_ID;
  const selectedFloor = buildingFloors.find((floor) => floor.id === floorId);
  const noFloorData = floorId !== ALL_BUILDING_SCOPE_ID && selectedFloor?.dataAvailability !== "simulation";
  const scopedUnresolvedAlerts = alerts.filter(
    (alert) => isUnresolvedIncident(alert) && (floorId === ALL_BUILDING_SCOPE_ID || alert.floorId === floorId),
  );
  const unresolvedAlertCount = scopedUnresolvedAlerts.length;
  const hasCriticalAlerts = scopedUnresolvedAlerts.some(
    (alert) => alert.severity === "critical" || alert.kind === "critical",
  );
  const activeScopeLabel = floorId === ALL_BUILDING_SCOPE_ID
    ? "Toàn tòa nhà"
    : selectedFloor?.name ?? "Tầng đã chọn";
  const isExpanded = isMobileViewport ? isMobileOpen : (isPinned || isHovered);
  const isCollapsed = !isExpanded;

  useEffect(() => {
    if (!automaticTelemetryRunning) return undefined;
    const intervalId = window.setInterval(advanceTelemetry, TELEMETRY_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [automaticTelemetryRunning, advanceTelemetry]);

  useEffect(() => {
    persistDashboardTheme(theme);
  }, [theme]);

  useEffect(() => {
    persistSidebarPinned(isPinned);
  }, [isPinned]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia(MOBILE_NAV_QUERY);
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
      if (event.matches) setIsHovered(false);
      else setIsMobileOpen(false);
    };
    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || !isMobileOpen) {
      if (wasMobileOpen.current) {
        if (isMobileViewport) mobileMenuButtonRef.current?.focus();
        else sidebarRef.current?.querySelector<HTMLElement>(".navigation-link--active")?.focus();
      }
      wasMobileOpen.current = false;
      return undefined;
    }

    wasMobileOpen.current = true;
    mobileCloseButtonRef.current?.focus();

    const handleNavigationKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = sidebarRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleNavigationKeyDown);
    return () => document.removeEventListener("keydown", handleNavigationKeyDown);
  }, [isMobileOpen, isMobileViewport]);

  const isInvalidFloorParam = Boolean(
    requestedFloorId
      && requestedFloorId !== ALL_BUILDING_SCOPE_ID
      && !buildingFloors.some((floor) => floor.id === requestedFloorId),
  );

  const clearInvalidFloorParam = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("floorId");
      return next;
    });
  };

  const handleLocationChange = (nextBuildingId: EntityId, nextFloorId: EntityId) => {
    if (nextBuildingId !== buildingId || nextFloorId !== floorId) {
      useTwinStore.getState().selectRoom(null);
    }
    setBuildingId(nextBuildingId);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextFloorId === ALL_BUILDING_SCOPE_ID) next.delete("floorId");
      else next.set("floorId", nextFloorId);
      if (nextBuildingId !== buildingId || nextFloorId !== floorId) {
        next.delete("roomId");
        next.delete("deviceId");
        next.delete("assetId");
      }
      return next;
    });
  };

  const handleToggleCollapsed = () => {
    setIsPinned((currentPinned) => {
      const nextPinned = !currentPinned;
      if (!nextPinned) {
        setIsHovered(false);
      }
      return nextPinned;
    });
  };

  const locationContext: DashboardLocationContextValue = {
    buildingId,
    floorId,
    locations: BUILDING_LOCATIONS,
    onLocationChange: handleLocationChange,
  };

  return (
    <div
      className={`dashboard-shell dashboard-entry${isCollapsed ? " dashboard-shell--collapsed" : " dashboard-shell--expanded"}${isPinned ? " dashboard-shell--pinned" : ""}${isHovered ? " dashboard-shell--hovered" : ""}`}
      data-theme={theme}
    >
      <DashboardHeader
        buildingId={buildingId}
        floorId={floorId}
        isMobileMenuOpen={isMobileOpen}
        mobileMenuButtonRef={mobileMenuButtonRef}
        locations={BUILDING_LOCATIONS}
        onLocationChange={handleLocationChange}
        onMobileMenuToggle={() => setIsMobileOpen((open) => !open)}
      />
      <div className="dashboard-content-row">
        <DashboardSidebar
          activeScopeLabel={activeScopeLabel}
          isCollapsed={isCollapsed}
          isPinned={isPinned}
          isHovered={isHovered}
          isMobileOpen={isMobileOpen}
          isMobileInactive={isMobileViewport && !isMobileOpen}
          floorId={floorId}
          role={role}
          theme={theme}
          onThemeChange={setTheme}
          unresolvedAlertCount={unresolvedAlertCount}
          hasCriticalAlerts={hasCriticalAlerts}
          noFloorData={noFloorData}
          sidebarRef={sidebarRef}
          mobileCloseButtonRef={mobileCloseButtonRef}
          onCloseMobile={() => setIsMobileOpen(false)}
          onHoverChange={setIsHovered}
          onOverviewClick={() => handleLocationChange(buildingId, ALL_BUILDING_SCOPE_ID)}
          onToggleCollapsed={handleToggleCollapsed}
        />
        {isMobileOpen && (
          <button
            aria-hidden="true"
            aria-label="Close navigation"
            className="dashboard-sidebar-backdrop"
            onClick={() => setIsMobileOpen(false)}
            tabIndex={-1}
            type="button"
          />
        )}
        <main className="dashboard-main" id="dashboard-main" tabIndex={-1}>
          {isInvalidFloorParam && (
            <div className="dashboard-invalid-param-banner" role="status">
              <span>
                Tham số tầng trên URL không hợp lệ ({requestedFloorId}) — hệ thống đã đưa về Tổng quan toàn tòa nhà.
              </span>
              <button
                type="button"
                className="dashboard-invalid-param-clear-btn"
                onClick={clearInvalidFloorParam}
              >
                Xóa tham số lỗi
              </button>
            </div>
          )}
          <Outlet context={locationContext} />
        </main>
      </div>
    </div>
  );
}
