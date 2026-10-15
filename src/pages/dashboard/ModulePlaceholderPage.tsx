import { Clock3 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import BuildingFloorSelector from "../../components/layout/BuildingFloorSelector";
import type { DashboardLocationContextValue } from "../../features/building/types";

type ModulePlaceholderPageProps = {
  title: string;
  section: "MONITORING" | "OPERATION" | "DIGITAL TWIN";
};

export default function ModulePlaceholderPage({ title, section }: ModulePlaceholderPageProps) {
  const location = useOutletContext<DashboardLocationContextValue | undefined>();

  return (
    <section className="dashboard-page module-placeholder-page" aria-labelledby="module-title">
      <div className="overview-page-heading">
        <div className="dashboard-page-heading">
          <div className="dashboard-breadcrumb">ICS Digital Twin <span>/</span> {section}</div>
          <h1 id="module-title">{title}</h1>
        </div>
        {location && (
          <div className="overview-heading-actions">
            <BuildingFloorSelector
              buildingId={location.buildingId}
              floorId={location.floorId}
              locations={location.locations}
              onLocationChange={location.onLocationChange}
            />
          </div>
        )}
      </div>
      <div className="module-placeholder-card">
        <span className="module-placeholder-icon"><Clock3 aria-hidden="true" size={20} /></span>
        <div>
          <h2>Module planned for a later phase</h2>
          <p>This area will be available in a future phase of the ICS Digital Twin platform.</p>
        </div>
        <span className="module-phase-tag">PLANNED</span>
      </div>
    </section>
  );
}
