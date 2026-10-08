import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SimulationControlPanel from "../../components/dashboard/SimulationControlPanel";
import { useTwinStore } from "./twinStore";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  useTwinStore.getState().resetSimulation();
});

describe("Simulation controls", () => {
  it("advances telemetry on a controlled interval, pauses, and resets", async () => {
    vi.useFakeTimers();
    useTwinStore.getState().resetSimulation();
    render(<SimulationControlPanel />);

    fireEvent.click(screen.getByRole("button", { name: /start automatic telemetry/i }));
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(useTwinStore.getState().rooms.find((room) => room.id === "room-server-01")?.temperature)
      .toBe(26.1);

    fireEvent.click(screen.getByRole("button", { name: /pause automatic telemetry/i }));
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(useTwinStore.getState().rooms.find((room) => room.id === "room-server-01")?.temperature)
      .toBe(26.1);

    fireEvent.click(screen.getByRole("button", { name: /reset simulation/i }));
    expect(useTwinStore.getState().rooms.find((room) => room.id === "room-server-01")?.temperature)
      .toBe(25.4);
  });

  it("clears the telemetry interval when the controls unmount", async () => {
    vi.useFakeTimers();
    useTwinStore.getState().resetSimulation();
    const view = render(<SimulationControlPanel />);
    fireEvent.click(screen.getByRole("button", { name: /start automatic telemetry/i }));
    view.unmount();

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(useTwinStore.getState().rooms.find((room) => room.id === "room-server-01")?.temperature)
      .toBe(25.4);
    expect(useTwinStore.getState().automaticTelemetryRunning).toBe(false);
    expect(useTwinStore.getState().connectionStatus).toBe("simulation-paused");
  });

  it("crosses warning and critical temperature thresholds during automatic updates", async () => {
    vi.useFakeTimers();
    useTwinStore.getState().resetSimulation();
    render(<SimulationControlPanel />);

    fireEvent.click(screen.getByRole("button", { name: /start automatic telemetry/i }));
    await act(async () => {
      vi.advanceTimersByTime(9000);
    });

    const state = useTwinStore.getState();
    expect(state.rooms.find((room) => room.id === "room-server-01")?.status).toBe("critical");
    expect(state.rooms.find((room) => room.id === "room-server-01")?.temperature).toBe(29.1);
    expect(state.events.filter((event) => event.type === "TemperatureThresholdExceeded")
      .map((event) => event.type === "TemperatureThresholdExceeded" ? event.threshold : null))
      .toEqual(["warning", "critical"]);
  });
});
