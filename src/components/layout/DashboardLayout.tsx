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
import { useTwinStore } from "../../features/twin/twinStore";
import type { DashboardLocationContextValue } from "../../features/building/types";
import { persistDashboardTheme, readDashboardTheme } from "../../features/theme/themePreferences";

const TELEMETRY_INTERVAL_MS = 3_000;
const MOBILE_NAV_QUERY = "(max-width: 850px)";

function matchesMobileNavigationViewport(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(MOBILE_NAV_QUERY).matches;
}

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(matchesMobileNavigationViewport);
  const [theme, setTheme] = useState(readDashboardTheme);
  const [buildingId, setBuildingId] = useState<EntityId>(ACTIVE_BUILDING_ID);
  const [searchParams, setSearchParams] = useSearchParams();
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpen = useRef(false);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const advanceTelemetry = useTwinStore((state) => state.advanceTelemetry);
  const requestedFloorId = searchParams.get("floorId");
  const buildingFloors = BUILDING_LOCATIONS.find((location) => location.building.id === buildingId)?.floors ?? [];
  const floorId = requestedFloorId && buildingFloors.some((floor) => floor.id === requestedFloorId)
    ? requestedFloorId
    : ALL_BUILDING_SCOPE_ID;
  const activeScopeLabel = floorId === ALL_BUILDING_SCOPE_ID
    ? "Toàn tòa nhà"
    : BUILDING_LOCATIONS.find((location) => location.building.id === buildingId)?.floors
      .find((floor) => floor.id === floorId)?.name ?? "Tầng đã chọn";

  useEffect(() => {
    if (!automaticTelemetryRunning) return undefined;
    const intervalId = window.setInterval(advanceTelemetry, TELEMETRY_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [automaticTelemetryRunning, advanceTelemetry]);

  useEffect(() => {
    persistDashboardTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mediaQuery = window.matchMedia(MOBILE_NAV_QUERY);
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
      if (!event.matches) setIsMobileOpen(false);
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

  const handleLocationChange = (nextBuildingId: EntityId, nextFloorId: EntityId) => {
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

  const locationContext: DashboardLocationContextValue = {
    buildingId,
    floorId,
    locations: BUILDING_LOCATIONS,
    onLocationChange: handleLocationChange,
  };

  return (
    <div className={`dashboard-shell dashboard-entry${isCollapsed ? " dashboard-shell--collapsed" : ""}`} data-theme={theme}>
      <DashboardHeader
        buildingId={buildingId}
        floorId={floorId}
        isMobileMenuOpen={isMobileOpen}
        mobileMenuButtonRef={mobileMenuButtonRef}
        theme={theme}
        onThemeChange={setTheme}
        locations={BUILDING_LOCATIONS}
        onLocationChange={handleLocationChange}
        onMobileMenuToggle={() => setIsMobileOpen((open) => !open)}
      />
      <div className="dashboard-content-row">
        <DashboardSidebar
          activeScopeLabel={activeScopeLabel}
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          isMobileInactive={isMobileViewport && !isMobileOpen}
          floorId={floorId}
          sidebarRef={sidebarRef}
          mobileCloseButtonRef={mobileCloseButtonRef}
          onCloseMobile={() => setIsMobileOpen(false)}
          onOverviewClick={() => handleLocationChange(buildingId, ALL_BUILDING_SCOPE_ID)}
          onToggleCollapsed={() => setIsCollapsed((collapsed) => !collapsed)}
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
          <Outlet context={locationContext} />
        </main>
      </div>
    </div>
  );
}
