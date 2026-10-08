import type { Building, EntityId, Floor } from "../../types/models";

export interface BuildingLocationOption {
  building: Building;
  floors: readonly Floor[];
}

export const ACTIVE_BUILDING_ID: EntityId = "ics-headquarters";
export const ACTIVE_FLOOR_ID: EntityId = "ics-headquarters-floor-1";
export const DEMO_FLOOR_2_ID: EntityId = "ics-headquarters-floor-2";
export const ALL_BUILDING_SCOPE_ID: EntityId = "ics-headquarters-all-floors";

/** Floors 1 and 2 have mock telemetry. Floors 3–5 remain unconfigured. */
export const BUILDING_LOCATIONS: readonly BuildingLocationOption[] = [
  {
    building: {
      id: ACTIVE_BUILDING_ID,
      name: "ICS Headquarters",
      code: "ICS-HQ",
      floorIds: [
        ACTIVE_FLOOR_ID,
        "ics-headquarters-floor-2",
        "ics-headquarters-floor-3",
        "ics-headquarters-floor-4",
        "ics-headquarters-floor-5",
      ],
    },
    floors: [1, 2, 3, 4, 5].map((level) => ({
      id: `ics-headquarters-floor-${level}`,
      buildingId: ACTIVE_BUILDING_ID,
      name: `Floor ${level}`,
      level,
      dataAvailability: level <= 2 ? "simulation" as const : "not-configured" as const,
      roomIds: [],
    })),
  },
];
