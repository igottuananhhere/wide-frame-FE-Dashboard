import type { EntityId } from "../../types/models";
import type { BuildingLocationOption } from "../../data/mock/buildingLocations";
import {
  ACTIVE_FLOOR_ID,
  ALL_BUILDING_SCOPE_ID,
  DEMO_FLOOR_2_ID,
} from "../../data/mock/buildingLocations";

type BuildingFloorSelectorProps = {
  locations: readonly BuildingLocationOption[];
  buildingId: EntityId;
  floorId: EntityId;
  onLocationChange: (buildingId: EntityId, floorId: EntityId) => void;
};

export default function BuildingFloorSelector({
  locations,
  buildingId,
  floorId,
  onLocationChange,
}: BuildingFloorSelectorProps) {
  const selectedLocation = locations.find((location) => location.building.id === buildingId)
    ?? locations[0];

  if (!selectedLocation) return null;

  const isBuildingScope = floorId === ALL_BUILDING_SCOPE_ID;
  const selectedFloor = selectedLocation.floors.find((floor) => floor.id === floorId);

  return (
    <div className="building-floor-selector" aria-label="Building and floor">
      <label className="selector-field">
        <span className="selector-label">Building</span>
        <select
          aria-label="Building"
          onChange={(event) => {
            const nextLocation = locations.find(
              (location) => location.building.id === event.target.value,
            );
            if (nextLocation) onLocationChange(nextLocation.building.id, ALL_BUILDING_SCOPE_ID);
          }}
          value={selectedLocation.building.id}
        >
          {locations.map(({ building }) => (
            <option key={building.id} value={building.id}>{building.name}</option>
          ))}
        </select>
      </label>
      <span aria-hidden="true" className="location-divider">/</span>
      <label className="selector-field selector-field--floor">
            <span className="selector-label">Floor</span>
        <select
          aria-label="Floor"
          onChange={(event) => onLocationChange(selectedLocation.building.id, event.target.value)}
          value={isBuildingScope ? ALL_BUILDING_SCOPE_ID : selectedFloor?.id ?? ALL_BUILDING_SCOPE_ID}
        >
          <option value={ALL_BUILDING_SCOPE_ID}>Toàn tòa nhà</option>
          {selectedLocation.floors.map((floor) => (
            <option key={floor.id} value={floor.id}>
              {floor.name}{floor.dataAvailability === "not-configured"
                ? " · Chưa có dữ liệu"
                : floor.id === DEMO_FLOOR_2_ID
                  ? " · Dữ liệu mẫu tĩnh"
                  : floor.id === ACTIVE_FLOOR_ID ? " · Telemetry mô phỏng" : " · Dữ liệu mô phỏng"}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
