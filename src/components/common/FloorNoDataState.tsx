import { ArrowLeft, Layers3 } from "lucide-react";
import { useOutletContext } from "react-router-dom";
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
        <p className="section-eyebrow">ICS HEADQUARTERS / FLOOR STATUS</p>
        <h1 id="floor-no-data-title">{floorName} chưa có dữ liệu</h1>
        <p>Tầng này chưa được cấu hình nguồn dữ liệu, nên chưa có chỉ số vận hành để hiển thị hoặc cộng vào tổng tòa nhà.</p>
        <button className="floor-no-data-back" onClick={onBackToBuilding} type="button">
          <ArrowLeft aria-hidden="true" size={15} /> Về tổng quan tòa nhà
        </button>
      </article>
    </section>
  );
}
