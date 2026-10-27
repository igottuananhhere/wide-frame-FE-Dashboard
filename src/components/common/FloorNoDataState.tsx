import { ArrowLeft, Layers3 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { ACTIVE_FLOOR_ID } from "../../data/mock/buildingLocations";
import type { DashboardLocationContextValue } from "../../features/building/types";
import BuildingFloorSelector from "../layout/BuildingFloorSelector";

type FloorNoDataStateProps = {
  floorName: string;
  onBackToBuilding: () => void;
};

export default function FloorNoDataState({ floorName, onBackToBuilding }: FloorNoDataStateProps) {
  const location = useOutletContext<DashboardLocationContextValue | undefined>();

  return (
    <section className="dashboard-page floor-no-data-page" aria-labelledby="floor-no-data-title">
      {location && (
        <header className="floor-no-data-header">
          <div className="overview-heading-copy">
            <div className="dashboard-breadcrumb">ICS Digital Twin <span>/</span> {floorName}</div>
          </div>
          <div className="overview-heading-actions">
            <BuildingFloorSelector
              buildingId={location.buildingId}
              floorId={location.floorId}
              locations={location.locations}
              onLocationChange={location.onLocationChange}
            />
          </div>
        </header>
      )}
      <article className="floor-no-data-card">
        <span className="floor-no-data-icon" aria-hidden="true"><Layers3 size={24} /></span>
        <p className="section-eyebrow">ICS HEADQUARTERS / DEMO SCOPE</p>
        <h1 id="floor-no-data-title">{floorName} — Ngoài phạm vi demo</h1>
        <p>
          Phạm vi vận hành demo hiện tại chỉ bao gồm <strong>Tầng 1 / 5 tầng (Dữ liệu mô phỏng)</strong>. {floorName} nằm ngoài phạm vi demo nên không hiển thị số liệu trực tiếp và không cộng vào tổng vận hành toàn tòa nhà.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button className="floor-no-data-back" onClick={onBackToBuilding} type="button">
            <ArrowLeft aria-hidden="true" size={15} /> Về tổng quan tòa nhà
          </button>
          {location && (
            <button
              className="floor-no-data-back"
              onClick={() => location.onLocationChange(location.buildingId, ACTIVE_FLOOR_ID)}
              type="button"
            >
              Mở Dashboard Tầng 1 (Phạm vi demo)
            </button>
          )}
        </div>
      </article>
    </section>
  );
}
