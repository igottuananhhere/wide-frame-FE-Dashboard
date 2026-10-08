import { afterEach, describe, expect, it } from "vitest";
import { useTwinStore } from "./twinStore";

const getRoom = (roomId: string) => useTwinStore.getState().rooms.find((room) => room.id === roomId);

afterEach(() => {
  useTwinStore.getState().resetSimulation();
});

describe("Twin simulation store", () => {
  it("starts from a normal server reading and coherent Floor 1 and Floor 2 demo snapshots", () => {
    const state = useTwinStore.getState();
    const serverRoom = getRoom("room-server-01");

    expect(state.connectionStatus).toBe("simulation-paused");
    expect(serverRoom?.temperature).toBe(25.4);
    expect(serverRoom?.status).toBe("normal");
    expect(state.alerts.filter((alert) => alert.status === "active")).toHaveLength(8);
    expect(state.rooms.reduce((total, room) => total + room.deviceCount, 0)).toBe(46);
    expect(state.rooms.reduce((total, room) => total + room.onlineDeviceCount, 0)).toBe(42);
    expect(state.rooms.filter((room) => room.floorId === "ics-headquarters-floor-2")).toHaveLength(5);
    expect(state.energyHistory.at(-1)?.kwh).toBe(266.6);
  });

  it("raises a critical server event and updates telemetry, sensor, alerts and time", () => {
    const before = useTwinStore.getState().lastUpdated;
    useTwinStore.getState().selectRoom("room-server-01");
    useTwinStore.getState().simulateScenario("server-temperature-high");

    const state = useTwinStore.getState();
    const serverRoom = getRoom("room-server-01");
    const serverTemperature = state.sensors.find((sensor) => sensor.id === "sensor-server-temp-01");
    const criticalAlert = state.alerts.find((alert) => alert.correlationKey === "server-temperature-high");

    expect(serverRoom?.temperature).toBe(29.1);
    expect(serverRoom?.status).toBe("critical");
    expect(serverTemperature?.value).toBe(29.1);
    expect(serverTemperature?.status).toBe("critical");
    expect(criticalAlert?.severity).toBe("critical");
    expect(state.alerts.filter((alert) => alert.status === "active")).toHaveLength(9);
    expect(state.selectedRoomId).toBe("room-server-01");
    expect(state.lastUpdated).toBeGreaterThan(before);
    expect(state.events.some((event) => event.type === "TemperatureThresholdExceeded")).toBe(true);
  });

  it("marks TEMP-04 offline and updates the room device counts", () => {
    useTwinStore.getState().simulateScenario("temp-04-offline");

    const state = useTwinStore.getState();
    const room = getRoom("room-meeting-02");
    const device = state.devices.find((item) => item.id === "device-temp-04");
    const sensor = state.sensors.find((item) => item.id === "sensor-temp-04");

    expect(device?.status).toBe("offline");
    expect(sensor?.status).toBe("offline");
    expect(room?.status).toBe("warning");
    expect(room?.onlineDeviceCount).toBe(2);
    expect(room?.offlineDeviceCount).toBe(1);
    expect(state.alerts.some((alert) => alert.correlationKey === "temp-04-offline" && alert.status === "active"))
      .toBe(true);
    expect(state.events.some((event) => event.type === "DeviceOffline")).toBe(true);
  });

  it("raises AC-03 maintenance due and can acknowledge and reset simulation", () => {
    useTwinStore.getState().simulateScenario("ac-03-maintenance-due");

    let state = useTwinStore.getState();
    const acDevice = state.devices.find((item) => item.id === "device-ac-03");
    const maintenanceAlert = state.alerts.find((alert) => alert.correlationKey === "ac-03-maintenance-due");
    expect(acDevice?.maintenanceHoursRemaining).toBe(0);
    expect(maintenanceAlert?.kind).toBe("maintenance");
    expect(state.alerts.filter((alert) => alert.status === "active")).toHaveLength(8);
    expect(state.events.some((event) => event.type === "MaintenanceDue")).toBe(true);

    state.acknowledgeAlert(maintenanceAlert!.id);
    expect(useTwinStore.getState().alerts.find((alert) => alert.id === maintenanceAlert!.id)?.status)
      .toBe("acknowledged");

    useTwinStore.getState().resetSimulation();
    state = useTwinStore.getState();
    expect(state.devices.find((item) => item.id === "device-ac-03")?.maintenanceHoursRemaining).toBe(12);
    expect(getRoom("room-server-01")?.temperature).toBe(25.4);
    expect(state.automaticTelemetryRunning).toBe(false);
  });

  it("returns all simulated values to the baseline scenario", () => {
    useTwinStore.getState().simulateScenario("server-temperature-high");
    useTwinStore.getState().simulateScenario("return-normal");

    const state = useTwinStore.getState();
    expect(getRoom("room-server-01")?.temperature).toBe(25.4);
    expect(getRoom("room-server-01")?.status).toBe("normal");
    expect(state.alerts.some((alert) => alert.correlationKey === "server-temperature-high" && alert.status === "active"))
      .toBe(false);
  });
});
