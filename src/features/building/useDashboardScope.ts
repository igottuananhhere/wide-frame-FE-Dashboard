import { useOutletContext } from "react-router-dom";
import { ALL_BUILDING_SCOPE_ID } from "../../data/mock/buildingLocations";
import { combineEnergyHistoryByFloor } from "../energy/energySelectors";
import { useTwinStore } from "../twin/twinStore";
import type { DashboardLocationContextValue } from "./types";

/** Selects only mock data belonging to the current floor scope. */
export function useDashboardScopeData() {
  const location = useOutletContext<DashboardLocationContextValue>();
  const roomsInStore = useTwinStore((state) => state.rooms);
  const devicesInStore = useTwinStore((state) => state.devices);
  const sensorsInStore = useTwinStore((state) => state.sensors);
  const alertsInStore = useTwinStore((state) => state.alerts);
  const airQualityInStore = useTwinStore((state) => state.airQualityByRoom);
  const historyByFloor = useTwinStore((state) => state.energyHistoryByFloor);
  const energyDeviceReadingsInStore = useTwinStore((state) => state.energyDeviceReadings);
  const selectedBuilding = location.locations.find((item) => item.building.id === location.buildingId);
  const dataFloors = selectedBuilding?.floors.filter((floor) => floor.dataAvailability === "simulation") ?? [];
  const isBuildingScope = location.floorId === ALL_BUILDING_SCOPE_ID;
  const selectedFloor = selectedBuilding?.floors.find((floor) => floor.id === location.floorId);
  const floors = isBuildingScope
    ? dataFloors
    : selectedFloor?.dataAvailability === "simulation" ? [selectedFloor] : [];
  const floorIds = floors.map((floor) => floor.id);
  const floorIdSet = new Set(floorIds);
  const rooms = roomsInStore.filter((room) => floorIdSet.has(room.floorId));
  const roomIds = new Set(rooms.map((room) => room.id));
  const devices = devicesInStore.filter((device) => roomIds.has(device.roomId));
  const deviceIds = new Set(devices.map((device) => device.id));

  return {
    location,
    selectedBuilding,
    selectedFloor,
    dataFloors,
    floors,
    floorIds,
    isBuildingScope,
    scopeLabel: isBuildingScope ? "Toàn tòa nhà" : selectedFloor?.name ?? "Tầng đã chọn",
    rooms,
    devices,
    sensors: sensorsInStore.filter((sensor) => roomIds.has(sensor.roomId)),
    alerts: alertsInStore.filter((alert) => floorIdSet.has(alert.floorId)),
    airQualityByRoom: airQualityInStore.filter((reading) => roomIds.has(reading.roomId)),
    energyHistory: combineEnergyHistoryByFloor(historyByFloor, floorIds),
    energyDeviceReadings: energyDeviceReadingsInStore.filter((reading) => deviceIds.has(reading.deviceId)),
  };
}
