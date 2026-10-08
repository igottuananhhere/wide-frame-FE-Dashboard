import { Outlet, useOutletContext } from "react-router-dom";
import { ALL_BUILDING_SCOPE_ID } from "../../data/mock/buildingLocations";
import type { DashboardLocationContextValue } from "../../features/building/types";
import FloorNoDataState from "../common/FloorNoDataState";

export default function DashboardScopeBoundary() {
  const location = useOutletContext<DashboardLocationContextValue>();
  const selectedLocation = location.locations.find((item) => item.building.id === location.buildingId);
  const selectedFloor = selectedLocation?.floors.find((floor) => floor.id === location.floorId);
  const dataFloors = selectedLocation?.floors.filter((floor) => floor.dataAvailability === "simulation") ?? [];
  const dataFloorCount = dataFloors.length;
  const floorCount = selectedLocation?.floors.length ?? 0;

  if (location.floorId !== ALL_BUILDING_SCOPE_ID && selectedFloor?.dataAvailability !== "simulation") {
    return (
      <FloorNoDataState
        floorName={selectedFloor?.name ?? "Tầng đã chọn"}
        onBackToBuilding={() => location.onLocationChange(location.buildingId, ALL_BUILDING_SCOPE_ID)}
      />
    );
  }

  return (
    <div className="dashboard-scope-page">
      {location.floorId === ALL_BUILDING_SCOPE_ID && (
        <div className="dashboard-scope-coverage" role="status">
          <strong>Phạm vi tòa nhà: có dữ liệu {dataFloorCount}/{floorCount} tầng.</strong>
          <span>Tổng hợp từ {dataFloors.map((floor) => floor.name).join(" + ") || "chưa có tầng"}; các tầng chưa cấu hình được loại khỏi số liệu.</span>
        </div>
      )}
      <Outlet context={location} />
    </div>
  );
}
