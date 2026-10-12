import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SimulationControlPanel from "../../components/dashboard/SimulationControlPanel";
import { useTwinStore } from "./twinStore";

afterEach(() => {
  cleanup();
  useTwinStore.getState().resetSimulation();
});

describe("Simulation controls", () => {
  it("toggles the automatic telemetry state", () => {
    useTwinStore.getState().resetSimulation();
    render(<SimulationControlPanel />);

    fireEvent.click(screen.getByRole("button", { name: /start automatic telemetry/i }));
    expect(useTwinStore.getState().automaticTelemetryRunning).toBe(true);
    expect(useTwinStore.getState().connectionStatus).toBe("simulation-live");

    fireEvent.click(screen.getByRole("button", { name: /pause automatic telemetry/i }));
    expect(useTwinStore.getState().automaticTelemetryRunning).toBe(false);
    expect(useTwinStore.getState().connectionStatus).toBe("simulation-paused");
  });

  it("resets the telemetry state and readings from the control panel", () => {
    useTwinStore.getState().resetSimulation();
    useTwinStore.getState().updateRoomTelemetry("room-server-01", { temperature: 29.1 });
    useTwinStore.getState().setAutomaticTelemetryRunning(true);
    render(<SimulationControlPanel />);

    fireEvent.click(screen.getByRole("button", { name: /reset simulation/i }));

    expect(useTwinStore.getState().rooms.find((room) => room.id === "room-server-01")?.temperature).toBe(25.4);
    expect(useTwinStore.getState().automaticTelemetryRunning).toBe(false);
    expect(useTwinStore.getState().connectionStatus).toBe("simulation-paused");
  });
});
