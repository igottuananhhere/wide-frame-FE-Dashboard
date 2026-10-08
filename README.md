# ICS Digital Twin

ICS Digital Twin is a management platform for understanding the operational
health of ICS Headquarters. The current proof of concept is limited to Floor 1.
The product is designed to grow to additional floors later, while keeping the
management experience focused on a 2D overview. A 3D Digital Twin is a separate
future module.

## Stack

- React and TypeScript, built with Vite
- Tailwind CSS v4 with the official Vite plugin
- React Router for client-side routes
- Zustand for auth and mock twin state
- Recharts for the Phase 3 energy trend
- Lucide React for icons
- SVG for the schematic Floor 1 2D visualization

## Project structure

```text
src/
  app/                 App entry and route configuration
  components/          Shared, dashboard, floor, and layout components
  pages/                Route-level pages
  features/             Building, floor, device, alert, energy, and environment domains
  store/                Client state stores
  services/             API and transport boundaries
  data/mock/            Mock data, kept separate from UI
  types/                Shared TypeScript models
  hooks/                Shared React hooks
  utils/                Pure helpers
  styles/               Global CSS and design tokens
```

Phase 3 dashboard presentation models live in `src/features/dashboard/`, and
Floor 1 overview fixtures live in `src/data/mock/floor1Overview.ts`.

## Development commands

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Run the production build (including a TypeScript check):

```bash
npm run build
```

Run TypeScript and ESLint checks independently:

```bash
npm run typecheck
npm run lint
```

Preview a production build locally:

```bash
npm run preview
```

## Phase 1: Authentication and access control

Authentication is mock-only and exists to exercise the frontend flow. The
development accounts live in `src/data/mock/authUsers.ts`:

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Viewer | `viewer` | `viewer123` |

The two application roles are `Admin` and `Viewer`. Both can view the dashboard
and assets; only Admin has the future device-control permission. No device
control actions are implemented in this phase.

The auth store uses `sessionStorage`: sign-in survives a refresh in the same
browser tab and is cleared by logout or when the tab session ends.

This frontend RBAC is not a security boundary. The credentials and permission
checks are shipped to the browser and can be inspected or bypassed. A future
backend must authenticate users and enforce authorization on every protected
API operation.

## Phase 2: Application shell

Protected dashboard routes share `DashboardLayout`, with a responsive header,
collapsible navigation, location selector, user menu, and main content outlet.
The location selector offers Toàn tòa nhà and Floors 1–5. The authenticated
dashboard opens at building scope; Floor 1 is the only floor with mock
operational data. Floors 2–5 are selectable no-data locations and are not
presented as live monitoring.

Available routes:

- `/dashboard/overview` — building overview or selected-floor overview
- `/dashboard/energy`
- `/dashboard/environment`
- `/dashboard/devices`
- `/dashboard/incidents`
- `/dashboard/assets`
- `/dashboard/digital-twin`

The Overview opens at building scope and links to the existing Floor 1
management view. Five monitoring routes still use Floor 1 demo data; when
building scope is selected they show a 1/5 coverage note, and Floors 2–5 show
a no-data state. The 3D route remains a planned-module placeholder. Header
status and alert count are read from the mock twin simulation store; they do
not represent a production monitoring connection.

Live monitoring connections, API authentication, OAuth, backend JWT, and the
3D module remain unimplemented.

## Phase 3: Floor 1 management overview

`/dashboard/overview` presents a management summary for ICS Headquarters,
Floor 1: four operational KPIs, the Phase 4 SVG floor schematic, a prioritized
attention queue, an energy trend, environmental readings, and a compact asset
exceptions table. The “Mở Digital Twin 3D” action opens the hosted 3D prototype in a new tab.

The current Floor 1 dashboard remains the detailed operational view. Floor 2
has a separate, explicitly fictional demo fixture so the building aggregate and
floor selection can be demonstrated. Floors 3–5 have no telemetry fixtures and
are never presented as live data.

Energy comparison and room-level air-quality seeds are mock data in
`src/data/mock/`. Energy history and CO₂ readings load into the typed Twin Store
and change with simulation events. Nothing is connected to sensors or APIs.

## Phase 4: Interactive Floor 1 map

The Floor 1 panel uses an accessible SVG schematic with selectable room
regions and a room detail drawer. Geometry is an illustrative layout and is
kept separate from room telemetry so an architectural floor drawing can
replace it later. The 3D route remains a placeholder.

## Phase 5: Mock realtime simulation

`src/features/twin/twinStore.ts` owns building, floor, room, device, sensor,
alert, timestamp, and simulation state. All data is local mock data; the
dashboard labels it `LIVE / SIMULATION` or `PAUSED / SIMULATION`. The Overview
contains Admin-only controls for server temperature, TEMP-04 connectivity,
AC-03 maintenance, Meeting Room 02 CO₂, automatic telemetry, return-to-normal,
and reset. Automatic telemetry runs every three seconds while enabled, persists
across dashboard routes, and stops on logout or when the dashboard layout
unmounts.

The simulation has five individually modeled demo devices and their sensor
records; the remaining 21 of the 26 Floor 1 devices are aggregate mock totals.
Overview and detail pages distinguish environmental threshold exceptions from
operational room/device states. Device tables show the five tracked devices;
room totals retain all 26 devices.

The store records simple typed events (`TelemetryUpdated`, `DeviceOffline`,
`TemperatureThresholdExceeded`, `AirQualityThresholdExceeded`, and
`MaintenanceDue`). Temperature, CO₂, energy, room state, device/sensor status,
alerts, and the last-update timestamp share the same simulated state. A future
WebSocket adapter can parse incoming messages into these event shapes and
dispatch them to the same store actions. Production authorization, validation,
reconnect handling, and device data transport are not implemented.

## Phase 6: Detail monitoring modules

The Energy, Environment, Devices, Incidents, and Assets routes now provide
Floor 1 drill-down pages. Overview KPI cards and asset exceptions link to the
relevant modules. The pages reuse the application shell, shared metric cards,
status badges, the existing Recharts energy chart, and the Zustand Twin Store.

Yesterday comparison, initial per-device energy samples, and initial CO₂/PM2.5
readings are mock fixtures in `src/data/mock/`. Current room readings, energy
history, per-device sample readings, device/sensor state, alerts, incident
acknowledgement, and AC-03 maintenance state are read from the local Twin Store.
Only five demo devices have individual records; the other 21 device counts are
aggregate. The energy and device pages label samples and aggregates separately.

The incident acknowledgement action changes local mock state only and is
available to Admin; Viewer is read-only. The AC-03 asset identity is a sample
Digital Identity record, with runtime hours derived from its simulated
maintenance countdown. The 3D route remains a placeholder, and no live IoT/API
connection or backend authorization is implemented.

## Building overview and monthly energy forecast

The default dashboard scope is the ICS Headquarters building. The floor
selector offers Toàn tòa nhà and Floors 1–5. Floor 1 and Floor 2 have mock
operational data; the building overview aggregates those two floors and reports
2/5 floor coverage. Selecting either floor shows only its own readings and
incidents. Floors 3–5 show a no-data state and are excluded from totals. The
Overview navigation item always returns to the building scope.

The Energy page includes a forecast card based on a mock METER-01 cumulative
reading, a linear month-end projection, and an illustrative flat 2,500 VND/kWh
rate. It compares the projected amount with the previous month's mock actual.
The forecast combines METER-01 and METER-02 in building scope and follows the
selected floor in floor scope. It is not an actual utility bill: tariff tiers,
taxes, billing adjustments, and real meter integration are not included.

Run the automated test suite with:

```bash
npm test
```
