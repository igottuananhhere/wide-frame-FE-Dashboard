import { ALL_BUILDING_SCOPE_ID } from "../../data/mock/buildingLocations";

export function withFloorScope(to: string, floorId: string): string {
  const [pathAndSearch, hash] = to.split("#", 2);
  const [pathname, rawSearch] = pathAndSearch.split("?", 2);
  const search = new URLSearchParams(rawSearch);

  if (floorId !== ALL_BUILDING_SCOPE_ID && !search.has("floorId")) {
    search.set("floorId", floorId);
  }

  const query = search.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}
