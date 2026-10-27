import { afterEach, describe, expect, it } from "vitest";
import { useTwinStore } from "./twinStore";
import { ACTIVE_FLOOR_ID, DEMO_FLOOR_2_ID } from "../../data/mock/buildingLocations";
import { calculateRoomPowerKw } from "../../data/mock/roomControls.mock";
import { useAuthStore } from "../auth/authStore";

const getRoom = (roomId: string) => useTwinStore.getState().rooms.find((room) => room.id === roomId);

afterEach(() => {
  useAuthStore.setState({
    user: { username: "admin", displayName: "ICS Platform Administrator", role: "Admin" },
    role: "Admin",
    isAuthenticated: true,
  });
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
    expect(state.rooms.reduce((total, room) => total + room.deviceCount, 0)).toBe(52);
    expect(state.rooms.reduce((total, room) => total + room.onlineDeviceCount, 0)).toBe(48);
    expect(state.rooms.filter((room) => room.floorId === "ics-headquarters-floor-2")).toHaveLength(6);
    expect(state.energyHistory.at(-1)?.kwh).toBe(266.6);
  });

  it("Scenario A: raises a critical server event, supports cooling boost, steps temperature down gradually, and auto-resolves incident", () => {
    const before = useTwinStore.getState().lastUpdated;
    useTwinStore.getState().selectRoom("room-server-01");
    useTwinStore.getState().simulateScenario("server-temperature-high");

    let state = useTwinStore.getState();
    let serverRoom = getRoom("room-server-01");
    const serverTemperature = state.sensors.find((sensor) => sensor.id === "sensor-server-temp-01");
    const criticalAlert = state.alerts.find((alert) => alert.correlationKey === "server-temperature-high");

    expect(serverRoom?.temperature).toBe(29.1);
    expect(serverRoom?.status).toBe("critical");
    expect(serverTemperature?.value).toBe(29.1);
    expect(serverTemperature?.status).toBe("critical");
    expect(criticalAlert?.severity).toBe("critical");
    expect(state.selectedRoomId).toBe("room-server-01");
    expect(state.lastUpdated).toBeGreaterThan(before);
    expect(state.events.some((event) => event.type === "TemperatureThresholdExceeded")).toBe(true);

    // Admin acknowledges incident -> remains in unresolved (acknowledged) while temp is 29.1
    useTwinStore.getState().acknowledgeAlert(criticalAlert!.id);
    expect(useTwinStore.getState().alerts.find((a) => a.id === criticalAlert!.id)?.status).toBe("acknowledged");

    // Admin triggers cooling boost -> does NOT jump immediately to 25.4°C
    useTwinStore.getState().activateServerCoolingBoost();
    state = useTwinStore.getState();
    expect(state.serverCoolingBoostActive).toBe(true);
    expect(state.acStates["ac-srv-01"]?.targetTemp).toBe(18);
    expect(state.acStates["ac-srv-02"]?.targetTemp).toBe(18);
    expect(getRoom("room-server-01")?.temperature).toBe(29.1);

    // Step 1: 29.1 -> 27.8 (warning, alert still unresolved)
    useTwinStore.getState().advanceTelemetry();
    expect(getRoom("room-server-01")?.temperature).toBe(27.8);
    expect(getRoom("room-server-01")?.status).toBe("warning");

    // Step 2: 27.8 -> 26.4 (< 27.0°C -> room normal & alert automatically resolved!)
    useTwinStore.getState().advanceTelemetry();
    serverRoom = getRoom("room-server-01");
    expect(serverRoom?.temperature).toBe(26.4);
    expect(serverRoom?.status).toBe("normal");
    expect(useTwinStore.getState().alerts.find((a) => a.id === criticalAlert!.id)?.status).toBe("resolved");

    // Step 3: 26.4 -> 25.4 (boost completes)
    useTwinStore.getState().advanceTelemetry();
    expect(getRoom("room-server-01")?.temperature).toBe(25.4);
    expect(useTwinStore.getState().serverCoolingBoostActive).toBe(false);
  });

  it("Scenario B: detects unoccupied Meeting Room 02 after 15m wait, recommends/executes energy saving, and reduces instantaneous kW", () => {
    const beforeKw = calculateRoomPowerKw(
      "room-meeting-02",
      useTwinStore.getState().lightStates,
      useTwinStore.getState().acStates,
      useTwinStore.getState().devices,
    );
    expect(beforeKw).toBeGreaterThan(1.5);

    useTwinStore.getState().simulateScenario("meeting-room-unoccupied-power");
    let state = useTwinStore.getState();
    expect(state.roomOccupancyByRoom["room-meeting-02"]?.isOccupied).toBe(false);
    expect(state.roomOccupancyByRoom["room-meeting-02"]?.unoccupiedMinutes).toBe(15);
    const savingAlert = state.alerts.find((a) => a.correlationKey === "unoccupied-power-room-meeting-02");
    expect(savingAlert?.status).toBe("active");

    // Admin applies energy saving now -> turns off lights & AC, resolves alert, drops kW to base load (0.25 kW)
    useTwinStore.getState().applyEnergySavingNow("room-meeting-02");
    state = useTwinStore.getState();
    expect(state.lightStates["light-mt2-01"]).toBe(false);
    expect(state.lightStates["light-mt2-02"]).toBe(false);
    expect(state.acStates["ac-mt2-01"]?.isOn).toBe(false);
    expect(state.alerts.find((a) => a.correlationKey === "unoccupied-power-room-meeting-02")?.status).toBe("resolved");

    const afterKw = calculateRoomPowerKw(
      "room-meeting-02",
      state.lightStates,
      state.acStates,
      state.devices,
    );
    expect(afterKw).toBe(0.25);
    // Active power off does NOT mark device as offline
    expect(state.devices.find((d) => d.id === "device-ac-mt2-01")?.status).toBe("normal");
  });

  it("Scenario C: marks AC-MT2 or TEMP-04 offline, locks controls, and restores connection cleanly", () => {
    useTwinStore.getState().simulateScenario("ac-mt2-offline");

    let state = useTwinStore.getState();
    const room = getRoom("room-meeting-02");
    const acDevice = state.devices.find((item) => item.id === "device-ac-mt2-01");
    expect(acDevice?.status).toBe("offline");
    expect(room?.status).toBe("warning");
    expect(room?.onlineDeviceCount).toBe(2);
    expect(room?.offlineDeviceCount).toBe(1);
    expect(state.alerts.some((alert) => alert.correlationKey === "ac-mt2-offline" && alert.status === "active")).toBe(true);

    // Attempting to toggle offline AC power fails and does not change state
    const beforeIsOn = state.acStates["ac-mt2-01"]?.isOn;
    useTwinStore.getState().toggleAcPower("ac-mt2-01");
    expect(useTwinStore.getState().acStates["ac-mt2-01"]?.isOn).toBe(beforeIsOn);
    expect(useTwinStore.getState().lastCommandFeedback?.status).toBe("failed");

    // Restoring connection brings device online and resolves the alert
    useTwinStore.getState().restoreDeviceConnection("device-ac-mt2-01");
    state = useTwinStore.getState();
    expect(state.devices.find((item) => item.id === "device-ac-mt2-01")?.status).toBe("normal");
    expect(getRoom("room-meeting-02")?.onlineDeviceCount).toBe(3);
    expect(state.alerts.find((alert) => alert.correlationKey === "ac-mt2-offline")?.status).toBe("resolved");
  });

  it("enforces RBAC so Viewer cannot mutate controls or incident states", () => {
    useAuthStore.setState({
      user: { username: "viewer", displayName: "Viewer User", role: "Viewer" },
      role: "Viewer",
      isAuthenticated: true,
    });

    const beforeLight = useTwinStore.getState().lightStates["light-lobby-01"];
    useTwinStore.getState().toggleLight("light-lobby-01");
    expect(useTwinStore.getState().lightStates["light-lobby-01"]).toBe(beforeLight);

    const activeAlert = useTwinStore.getState().alerts.find((a) => a.status === "active");
    useTwinStore.getState().acknowledgeAlert(activeAlert!.id);
    expect(useTwinStore.getState().alerts.find((a) => a.id === activeAlert!.id)?.status).toBe("active");
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

    useTwinStore.getState().toggleLight("light-lobby-01");
    expect(useTwinStore.getState().lightStates["light-lobby-01"]).toBe(false);

    useTwinStore.getState().resetSimulation();
    state = useTwinStore.getState();
    expect(state.devices.find((item) => item.id === "device-ac-03")?.maintenanceHoursRemaining).toBe(12);
    expect(getRoom("room-server-01")?.temperature).toBe(25.4);
    expect(state.lightStates["light-lobby-01"]).toBe(true);
    expect(state.actionHistory).toHaveLength(0);
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

  it("resolves an acknowledged threshold incident when its reading returns to normal", () => {
    const alert = useTwinStore.getState().alerts.find(
      (item) => item.correlationKey === "air-quality-co2-room-meeting-02",
    );
    expect(alert).toBeTruthy();

    useTwinStore.getState().acknowledgeAlert(alert!.id);
    useTwinStore.getState().updateAirQuality("room-meeting-02", { co2Ppm: 800 });

    expect(useTwinStore.getState().alerts.find((item) => item.id === alert!.id)?.status).toBe("resolved");
  });

  it("tracks telemetry update times independently by floor", () => {
    const before = useTwinStore.getState();
    const floor1Timestamp = before.lastUpdatedByFloor[ACTIVE_FLOOR_ID];
    const floor2Alert = before.alerts.find((alert) => alert.floorId === DEMO_FLOOR_2_ID && alert.status === "active");
    expect(floor1Timestamp).toBeTypeOf("number");
    expect(floor2Alert).toBeTruthy();

    useTwinStore.getState().acknowledgeAlert(floor2Alert!.id);
    expect(useTwinStore.getState().lastUpdatedByFloor[ACTIVE_FLOOR_ID]).toBe(floor1Timestamp);

    useTwinStore.getState().updateRoomTelemetry("room-meeting-02", { temperature: 25.1 });
    const updatedFloor1Timestamp = useTwinStore.getState().lastUpdatedByFloor[ACTIVE_FLOOR_ID];
    expect(updatedFloor1Timestamp).toBeGreaterThan(floor1Timestamp!);

    useTwinStore.getState().updateRoomTelemetry("room-meeting-03", { temperature: 25.2 });
    expect(useTwinStore.getState().lastUpdatedByFloor[DEMO_FLOOR_2_ID]).toBeGreaterThan(updatedFloor1Timestamp!);
    expect(useTwinStore.getState().lastUpdatedByFloor[ACTIVE_FLOOR_ID]).toBe(updatedFloor1Timestamp);
  });

  it("timestamps a current energy observation instead of rewriting the seeded 17:00 point", () => {
    useTwinStore.getState().simulateScenario("server-temperature-high");

    const state = useTwinStore.getState();
    const expectedTime = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(state.lastUpdatedByFloor[ACTIVE_FLOOR_ID]);
    const latestPoint = state.energyHistoryByFloor[ACTIVE_FLOOR_ID].at(-1);

    expect(latestPoint?.time).toBe(expectedTime);
    expect(latestPoint?.time).not.toBe("17:00");
  });
});
