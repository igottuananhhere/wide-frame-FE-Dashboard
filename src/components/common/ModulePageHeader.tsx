import { useOutletContext } from "react-router-dom";
import type { DashboardLocationContextValue } from "../../features/building/types";
import BuildingFloorSelector from "../layout/BuildingFloorSelector";

type ModulePageHeaderProps = {
  section: string;
  title: string;
  description: string;
  scopeLabel: string;
};

export default function ModulePageHeader({ section, title, description, scopeLabel }: ModulePageHeaderProps) {
  const location = useOutletContext<DashboardLocationContextValue | undefined>();

  return (
    <header className="module-page-header">
      <div className="module-page-heading-copy">
        <div className="dashboard-breadcrumb">ICS Digital Twin <span>/</span> {section}</div>
        <h1 id="module-page-title">{title}</h1>
        <p>{description}</p>
      </div>
      <div className="module-page-header-actions">
        <div className="module-page-context" aria-label={`Mock monitoring data for ${scopeLabel}`}>
          <span className="module-page-context-dot" aria-hidden="true" />
          <span>MOCK DATA</span>
          <i aria-hidden="true">/</i>
          <span>{scopeLabel.toUpperCase()}</span>
        </div>
        {location && (
          <BuildingFloorSelector
            buildingId={location.buildingId}
            floorId={location.floorId}
            locations={location.locations}
            onLocationChange={location.onLocationChange}
          />
        )}
      </div>
    </header>
  );
}
