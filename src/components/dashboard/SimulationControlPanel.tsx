import { useState } from "react";
import { Activity, ChevronDown, ChevronUp, FastForward, Pause, Play, RotateCcw, Siren } from "lucide-react";
import { useTwinStore } from "../../features/twin/twinStore";
import type { SimulationScenario } from "../../features/twin/types";

const scenarios: readonly { id: SimulationScenario; label: string }[] = [
  { id: "server-temperature-high", label: "Kịch bản A · Server Room Temperature High (29.1°C)" },
  { id: "meeting-room-unoccupied-power", label: "Kịch bản B · Phòng họp trống 15 phút còn bật thiết bị" },
  { id: "ac-mt2-offline", label: "Kịch bản C · Điều hòa AC-MT2 mất kết nối" },
  { id: "temp-04-offline", label: "Kịch bản C (Cảm biến) · TEMP-04 Sensor Offline" },
  { id: "ac-03-maintenance-due", label: "Bảo trì · AC-03 Maintenance Due (0h)" },
  { id: "meeting-room-02-co2-high", label: "Môi trường · Meeting Room 02 CO₂ High (1,600 ppm)" },
  { id: "hourly-energy-spike", label: "Năng lượng · Hourly Energy Spike 16.5 kWh (Dữ liệu mô phỏng)" },
  { id: "return-normal", label: "Khôi phục · Return System To Normal" },
];

export default function SimulationControlPanel() {
  const [scenario, setScenario] = useState<SimulationScenario>("server-temperature-high");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const setAutomaticTelemetryRunning = useTwinStore((state) => state.setAutomaticTelemetryRunning);
  const simulateScenario = useTwinStore((state) => state.simulateScenario);
  const advanceTelemetry = useTwinStore((state) => state.advanceTelemetry);
  const resetSimulation = useTwinStore((state) => state.resetSimulation);

  const runQuickScenario = (target: SimulationScenario) => {
    setScenario(target);
    simulateScenario(target);
  };

  return (
    <section className="simulation-control-panel" aria-labelledby="simulation-control-title">
      <div className="simulation-control-heading">
        <div className="simulation-control-title">
          <span className="simulation-control-icon" aria-hidden="true"><Activity size={17} /></span>
          <div>
            <p className="section-eyebrow">BẢNG ĐIỀU KHIỂN DÀNH CHO NGƯỜI TRÌNH DIỄN · DỮ LIỆU MÔ PHỎNG</p>
            <h2 id="simulation-control-title">Realtime simulation</h2>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span className="simulation-only-tag">
            <i aria-hidden="true" /> {automaticTelemetryRunning ? "Mô phỏng đang chạy" : "Mô phỏng tạm dừng"}
          </span>
          <button
            type="button"
            className="simulation-secondary-button"
            aria-expanded={!isCollapsed}
            onClick={() => setIsCollapsed((prev) => !prev)}
          >
            {isCollapsed ? (
              <><ChevronDown aria-hidden="true" size={14} /> Mở rộng bảng kịch bản</>
            ) : (
              <><ChevronUp aria-hidden="true" size={14} /> Thu gọn</>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
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
            <button
              className="simulation-secondary-button"
              type="button"
              onClick={advanceTelemetry}
              title="Tiến 1 bước thời gian mô phỏng để quan sát nhiệt độ giảm dần hoặc điện năng tích lũy"
            >
              <FastForward aria-hidden="true" size={14} /> Tiến 1 bước mô phỏng
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

          <div
            className="simulation-quick-scenarios"
            role="group"
            aria-label="Phím tắt 3 kịch bản trình diễn chính"
            style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}
          >
            <button
              type="button"
              className="simulation-secondary-button"
              onClick={() => runQuickScenario("server-temperature-high")}
            >
              Kịch bản A: Server tăng nhiệt (29.1°C)
            </button>
            <button
              type="button"
              className="simulation-secondary-button"
              onClick={() => runQuickScenario("meeting-room-unoccupied-power")}
            >
              Kịch bản B: Phòng họp trống còn bật điện
            </button>
            <button
              type="button"
              className="simulation-secondary-button"
              onClick={() => runQuickScenario("ac-mt2-offline")}
            >
              Kịch bản C: Thiết bị AC-MT2 mất kết nối
            </button>
          </div>

          <p className="simulation-control-note">
            Khu vực dành cho người trình diễn (Admin): kích hoạt nhanh kịch bản A/B/C, tiến từng bước mô phỏng hoặc Reset toàn bộ thiết bị, cảm biến, điều khiển và sự cố về trạng thái ban đầu.
          </p>
        </>
      )}
    </section>
  );
}
