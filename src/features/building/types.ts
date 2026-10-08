import type { BuildingLocationOption } from "../../data/mock/buildingLocations";
import type { EntityId } from "../../types/models";

export interface DashboardLocationContextValue {
  buildingId: EntityId;
  floorId: EntityId;
  locations: readonly BuildingLocationOption[];
  onLocationChange: (buildingId: EntityId, floorId: EntityId) => void;
}
