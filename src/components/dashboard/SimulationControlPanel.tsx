import { useState } from "react";
import { Activity, Pause, Play, RotateCcw, Siren } from "lucide-react";
import { useTwinStore } from "../../features/twin/twinStore";
import type { SimulationScenario } from "../../features/twin/types";

const scenarios: readonly { id: SimulationScenario; label: string }[] = [
  { id: "server-temperature-high", label: "Server Room Temperature High" },
  { id: "temp-04-offline", label: "TEMP-04 Sensor Offline" },
  { id: "ac-03-maintenance-due", label: "AC-03 Maintenance Due" },
  { id: "meeting-room-02-co2-high", label: "Meeting Room 02 CO₂ High" },
  { id: "hourly-energy-spike", label: "Hourly Energy Spike 16.5 kWh (Dữ liệu mô phỏng)" },
  { id: "return-normal", label: "Return System To Normal" },
];

export default function SimulationControlPanel() {
  const [scenario, setScenario] = useState<SimulationScenario>("server-temperature-high");
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const setAutomaticTelemetryRunning = useTwinStore((state) => state.setAutomaticTelemetryRunning);
  const simulateScenario = useTwinStore((state) => state.simulateScenario);
  const resetSimulation = useTwinStore((state) => state.resetSimulation);

  return (
    <section className="simulation-control-panel" aria-labelledby="simulation-control-title">
      <div className="simulation-control-heading">
        <div className="simulation-control-title">
          <span className="simulation-control-icon" aria-hidden="true"><Activity size={17} /></span>
          <div>
            <p className="section-eyebrow">DEMO CONTROL · MOCK DATA</p>
            <h2 id="simulation-control-title">Realtime simulation</h2>
          </div>
        </div>
        <span className="simulation-only-tag"><i aria-hidden="true" /> MOCK SIMULATION ONLY</span>
      </div>

      <div className="simulation-control-actions">
        <label className="simulation-scenario-field">
          <span>Scenario</span>
          <select
            aria-label="Simulation scenario"
            value={scenario}
            onChange={(event) => setScenario(event.target.value as SimulationScenario)}
          >
            {scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <button className="simulation-run-button" type="button" onClick={() => simulateScenario(scenario)}>
          <Siren aria-hidden="true" size={15} /> SIMULATE EVENT
        </button>
        <span className="simulation-action-divider" aria-hidden="true" />
        <button
          className="simulation-secondary-button"
          type="button"
          aria-label={automaticTelemetryRunning ? "Pause automatic telemetry" : "Start automatic telemetry"}
          onClick={() => setAutomaticTelemetryRunning(!automaticTelemetryRunning)}
        >
          {automaticTelemetryRunning
            ? <><Pause aria-hidden="true" size={14} /> Pause updates</>
            : <><Play aria-hidden="true" size={14} /> Start auto telemetry</>}
        </button>
        <button
          className="simulation-reset-button"
          type="button"
          aria-label="Reset simulation"
          onClick={resetSimulation}
        >
          <RotateCcw aria-hidden="true" size={14} /> Reset
        </button>
      </div>

      <p className="simulation-control-note">
        Tất cả chỉ số và sự kiện ở đây là dữ liệu mô phỏng; chưa kết nối thiết bị IoT.
      </p>
    </section>
  );
}
