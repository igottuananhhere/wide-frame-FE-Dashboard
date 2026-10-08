# Realtime Demo Dashboard Improvements

> Implemented inline in this project session. The ICS Floor 1 POC scope and existing Overview hierarchy were preserved.

**Goal:** Make the Floor 1 realtime demo’s status summaries understandable and keep simulated room, device, energy, and environment values consistent across the dashboard.

**Architecture:** Keep Zustand as the single browser-local Twin Store. Keep seed data and thresholds in typed mock modules. Derive operational and environmental summaries independently from the same store. Run automatic telemetry at the dashboard layout lifecycle, while the Overview panel owns only demo controls.

**Tech Stack:** React, TypeScript, Zustand, Recharts, existing selectors and mock data.

---

### Task 1 [x]: Separate operational exceptions from environment exceptions

**Files:** modify `src/features/twin/twinSelectors.ts`, `src/pages/dashboard/DashboardPage.tsx`, `src/pages/dashboard/EnvironmentPage.tsx`, and environment mock selectors.

- Derive environment state from temperature, humidity, CO2, and PM2.5 thresholds.
- Derive operational status counts separately from room/device status.
- Show the room, violated metric, current value, and threshold for each exception.
- For current seeds, show workspace warning and utility offline in operational status; show Meeting Room 02 CO2 at 1100 ppm as the environmental exception.
- Keep incident counts, area counts, and device counts distinct.

### Task 2 [x]: Propagate scenario state consistently

**Files:** modify `src/features/twin/twinStore.ts`, its mock seeds, and derived selectors.

- Define one recalculation path for room status and online/offline counts.
- Ensure device maintenance and connection scenarios update all relevant room, device, sensor, alert, map, asset, and KPI views.
- Preserve alert upsert behavior and make reset return to the coherent baseline.

### Task 3 [x]: Keep automatic telemetry stable across routes

**Files:** modify `src/components/dashboard/SimulationControlPanel.tsx`, `src/components/layout/DashboardLayout.tsx`, and `src/features/twin/twinStore.ts`.

- Move timer ownership to the dashboard layout lifecycle.
- Preserve start/pause/reset controls.
- Hold threshold state long enough to present the event, then recover by explicit scenario/reset.
- Ensure only one controlled interval runs.

### Task 4 [x]: Add realtime energy and air-quality readings

**Files:** modify `src/features/twin/types.ts`, `src/features/twin/twinStore.ts`, `src/data/mock/floor1Overview.ts`, `src/data/mock/floor1Environment.mock.ts`, `src/data/mock/floor1EnergyDetail.mock.ts`, `src/pages/dashboard/DashboardPage.tsx`, `src/pages/dashboard/EnergyPage.tsx`, and `src/pages/dashboard/EnvironmentPage.tsx`.

- Store energy history and device sample readings with the Twin state.
- Advance room energy and chart totals with controlled mock telemetry.
- Store CO2/PM2.5 readings and thresholds with the same Twin state.
- Add a CO2 high scenario for Meeting Room 02 and derive overview/detail environment data from the same readings.

### Task 5 [x]: Make the device inventory count explicit

**Files:** modify `src/data/mock/twinSimulation.mock.ts`, `src/features/twin/twinStore.ts`, `src/pages/dashboard/DevicesPage.tsx`, and relevant device/energy selectors.

- Keep the current five devices as individual live samples and clearly account for the remaining 21 devices as room-level aggregate mock data.
- Derive aggregate room health without implying the five tracked rows are all 26 devices.
- Keep total Floor 1 device counts at 26, with 24 online and 2 offline at baseline.

### Task 6 [x]: Apply role behavior to demo controls and document the result

**Files:** modify `src/components/dashboard/SimulationControlPanel.tsx`, relevant auth permission helpers if needed, `README.md`, and `docs/phase-6-demo-script.md`.

- Restrict scenario/start/pause/reset controls to Admin; Viewer can continue observing state.
- Keep the frontend-only RBAC limitation documented.
- Update the demo script with the corrected operational/environment counts and new event flow.
