# Building Overview and Monthly Energy Forecast Implementation Plan

> **For agentic workers:** Execute task-by-task inline in this authorized session. Keep the ICS Headquarters POC's actual monitoring data limited to Floor 1.

**Goal:** Add a building-level overview with explicit Floor 1-only coverage, a Floor 1–5 selector with no-data states for Floors 2–5, and a mock monthly energy cost forecast.

**Architecture:** DashboardLayout owns selected location and passes it through outlet context. Building overview and shared floor-scope presentation read that context. Floor availability and meter forecast inputs live in typed mock data, while a pure energy selector computes estimated month-end consumption and cost.

**Tech Stack:** React, TypeScript, React Router, Zustand, existing global CSS, and Lucide React.

---

### Task 1: Model building scope and floor availability

**Files:** Modify `src/types/models.ts`, `src/data/mock/buildingLocations.ts`, `src/components/layout/BuildingFloorSelector.tsx`, and `src/components/layout/DashboardLayout.tsx`.

- [x] Add floor availability to the floor model and fixtures: Floor 1 active; Floors 2–5 no-data.
- [x] Add an all-building scope ID and make it the initial header selection.
- [x] List Floors 1–5 in the selector with explicit no-data labels for Floors 2–5.
- [x] Pass building ID, selected scope ID, and location-change callback to child routes through Outlet context.

### Task 2: Add building overview and no-data states

**Files:** Create `src/pages/dashboard/BuildingOverviewPage.tsx` and `src/components/common/FloorNoDataState.tsx`; modify `src/pages/dashboard/DashboardPage.tsx`, `src/app/router.tsx`, and `src/styles/global.css`.

- [x] Render the building overview by default: show 1/5 data coverage, known Floor 1 aggregate values, and five selectable floor tiles.
- [x] On Floor 1 selection, render the existing Floor 1 dashboard unchanged.
- [x] On Floors 2–5, render a named no-data state, never reusing Floor 1 readings.
- [x] Wrap detail routes so building scope shows a Floor 1-only coverage note and no-data floor selections show the no-data state.

### Task 3: Add typed monthly energy forecast

**Files:** Create `src/data/mock/energyForecast.mock.ts`, `src/features/energy/energyForecast.ts`, and `src/components/dashboard/EnergyForecastCard.tsx`; modify `src/pages/dashboard/EnergyPage.tsx` and `src/styles/global.css`.

- [x] Store METER-01 period/date, month-to-date kWh, elapsed and total billing days, today's baseline energy, average mock rate, and last-month mock actuals in the fixture.
- [x] Implement the pure selector with projectedKwh = adjustedMonthToDateKwh / elapsedDays * periodDays and projectedCost = projectedKwh * mockRate.
- [x] Add a forecast card below the existing four Energy summary cards with estimate, previous actual, VND and percentage difference, meter/date, and demo-rate disclosure.
- [x] Source the current-day adjustment from Twin Store energy so automatic telemetry updates the forecast.

### Task 4: Documentation and validation

**Files:** Modify `README.md` and `docs/phase-6-demo-script.md`.

- [x] Document building scope, Floors 2–5 no-data treatment, coverage semantics, forecast formula, and mock tariff limitation.
- [x] Run `npm run build` and `npm run lint`; fix any errors before reporting completion.
- [x] Do not run the test suite unless explicitly requested.

## Self-review

- Every approved design section maps to Tasks 1–4.
- Floor 2–5 entries are availability metadata only; no telemetry fixtures are introduced for those floors.
- Forecast inputs and output share the kWh, VND, elapsedDays, and daysInBillingPeriod names consistently.
- Building totals are labeled Floor 1-only while coverage is 1/5, avoiding false whole-building completeness.