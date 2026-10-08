import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
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

const TELEMETRY_INTERVAL_MS = 3_000;

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [buildingId, setBuildingId] = useState<EntityId>(ACTIVE_BUILDING_ID);
  const [floorId, setFloorId] = useState<EntityId>(ALL_BUILDING_SCOPE_ID);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const advanceTelemetry = useTwinStore((state) => state.advanceTelemetry);
  const activeScopeLabel = floorId === ALL_BUILDING_SCOPE_ID
    ? "Toàn tòa nhà"
    : BUILDING_LOCATIONS.find((location) => location.building.id === buildingId)?.floors
      .find((floor) => floor.id === floorId)?.name ?? "Tầng đã chọn";

  useEffect(() => {
    if (!automaticTelemetryRunning) return undefined;
    const intervalId = window.setInterval(advanceTelemetry, TELEMETRY_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [automaticTelemetryRunning, advanceTelemetry]);

  const handleLocationChange = (nextBuildingId: EntityId, nextFloorId: EntityId) => {
    setBuildingId(nextBuildingId);
    setFloorId(nextFloorId);
  };

  const locationContext: DashboardLocationContextValue = {
    buildingId,
    floorId,
    locations: BUILDING_LOCATIONS,
    onLocationChange: handleLocationChange,
  };

  return (
    <div className={`dashboard-shell dashboard-entry${isCollapsed ? " dashboard-shell--collapsed" : ""}`}>
      <DashboardHeader
        buildingId={buildingId}
        floorId={floorId}
        isMobileMenuOpen={isMobileOpen}
        locations={BUILDING_LOCATIONS}
        onLocationChange={handleLocationChange}
        onMobileMenuToggle={() => setIsMobileOpen((open) => !open)}
      />
      <div className="dashboard-content-row">
        <DashboardSidebar
          activeScopeLabel={activeScopeLabel}
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          onOverviewClick={() => setFloorId(ALL_BUILDING_SCOPE_ID)}
          onToggleCollapsed={() => setIsCollapsed((collapsed) => !collapsed)}
        />
        {isMobileOpen && (
          <button
            aria-label="Close navigation"
            className="dashboard-sidebar-backdrop"
            onClick={() => setIsMobileOpen(false)}
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
