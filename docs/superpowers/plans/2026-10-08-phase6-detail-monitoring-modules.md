# Phase 6 Detail Monitoring Modules Implementation Plan

> Execute these steps inline in the current authorized project session. Keep the Overview layout intact and keep the Digital Twin 3D route as a placeholder.

**Goal:** Replace the Energy, Environment, Devices, Incidents, and Assets placeholders with typed Floor 1 drill-down modules.

**Architecture:** Route pages subscribe to the existing Zustand Twin Store and use separate typed mock files for static domain details. Add only metadata needed for lists and identity views, reuse the existing status badges and energy chart, and add focused module components/styles.

**Tech Stack:** React, TypeScript, React Router, Zustand, Recharts, Lucide React, Vitest, Testing Library.

---

### Task 1: Lock down route and interaction expectations

**Files:** modify src/features/auth/auth.test.tsx; create src/features/monitoring/detailModules.test.tsx.

- [x] Test all five module routes in the existing shell; keep /dashboard/digital-twin on its placeholder.
- [x] Test Overview KPI navigation, device filters, incident acknowledgement, and AC-03 identity fields.
- [x] Run focused tests and confirm failures are from missing Phase 6 pages/interactions.

### Task 2: Add typed domain mock data

**Files:** create types under src/features/{energy,environment,devices,assets}; create src/data/mock/floor1EnergyDetail.mock.ts, floor1Environment.mock.ts, and floor1AssetIdentities.mock.ts; modify twin types, mock seeds, and store.

- [x] Add typed area/device energy records and explicit mock thresholds.
- [x] Add per-room CO2/PM2.5 values; temperature/humidity remain store telemetry.
- [x] Add device last-seen and primary-metric metadata while preserving stable IDs and mock status counts.
- [x] Add a typed AC-03 digital identity linked to the existing device and room.

### Task 3: Implement detail routes and interactions

**Files:** create EnergyPage, EnvironmentPage, DevicesPage, IncidentsPage, AssetsPage and reusable detail components; modify router, KpiCard, DashboardPage.

- [x] Energy: total, comparison, hourly Recharts trend, area/device breakdowns, highest area, and abnormal usage.
- [x] Environment: per-area temperature, humidity, CO2, PM2.5 and threshold states.
- [x] Devices: required fields with All/Online/Offline/Warning filters.
- [x] Incidents: severity/title/area/asset/time/status, status filters, and store-backed acknowledge action.
- [x] Assets: AC-03 identity and maintenance state derived from the Twin Store device.
- [x] Link Overview KPI cards to their detail routes without changing the Overview hierarchy.
- [x] Preserve the existing Digital Twin 3D placeholder.
- [x] Preserve and complete the existing room-to-device navigation with the `roomId` query filter.

### Task 4: Documentation and verification

**Files:** modify README.md.

- [x] Document Phase 6 routes and which values remain mock/aggregate.
- [x] Run npm test, npm run typecheck, npm run lint, and npm run build.
- [x] Resolve regressions before completion.
