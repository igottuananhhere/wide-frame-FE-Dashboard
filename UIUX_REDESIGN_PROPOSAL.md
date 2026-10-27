# ICS Digital Twin: UI/UX Redesign Proposal

**Review date:** 2026-10-18; Figma/browser follow-up: 2026-10-19. **Status:** Design documentation only; no application changes authorized or implemented.

Deliverables are at repository root: [master brief](UIUX_MASTER_PROMPT.md), this proposal, and [user flows](UIUX_USER_FLOWS.md). Existing documents under `docs/` remain untouched.

> **Version note — 2026-10-19:** Sections 1–8 and UX-001–UX-028 preserve the earlier source-only review. Their statements about unavailable browser/Figma tools and their old counts describe that earlier pass. Section 9 records the later browser inspection, actual Figma deliverables, latest observed camera additions and current scope. No application change was implemented by this design task.

## 1. Scope, Evidence, and Limitations

- **Verified** means established by reading the current working-tree source, including pre-existing uncommitted changes. It does not mean browser-tested.
- **Inferred** means a plausible user need or consequence, not a finding from interviews, analytics, or usability sessions.
- **Proposed** means a future change requiring separate approval. All new layouts, tokens, interaction rules, and acceptance checks below are proposals.
- No browser inspection was performed: this session has no browser inspection tool. No screenshots, measured contrast results, real-device results, network behavior, or production performance claims are asserted.
- The application was not launched. Mounting it can write browser preferences/session state; simulation and maintenance actions were not exercised. No builds, tests, formatters, generators, package installs, or application data changes were run.
- No secrets, account credentials, personal fixture identities, or maintenance staff details are reproduced here. Entity codes refer to fictional demo equipment only.
- Source references use repository-relative paths and review-time line ranges. Future concurrent changes can move those lines.
- Git started dirty: 31 tracked modified files and four untracked files. Those changes are not this audit's work. A read-only SHA-256 aggregate baseline covers 151 tracked/non-ignored working files, excluding the three authorized deliverables: `9139C03C703DC7ACCA3FB56E58C9F4A98FB7D9152B92508FAB1A999941C3E75B`.

### Product Understanding

**Verified purpose:** a browser-based ICS Headquarters operations proof of concept. Users inspect building/floor health, energy, room environment, selected devices, incidents, asset identity, and maintenance. It is a 2D management experience with an external 3D prototype link and an internal planned-module page, not an integrated production digital twin.

**Inferred target users:** an operations administrator responsible for investigation and demo maintenance, and a read-only stakeholder reviewing operational summaries. These map to the actual `Admin` and `Viewer` roles; no technician, tenant, billing approver, or additional permission is assumed.

**Inferred business objectives:** prioritize exceptions, explain what data is available, connect a symptom to its room/device/asset, and demonstrate cross-module state coherence without implying real device operation or billing accuracy.

### Architecture and Constraints

- `package.json:14-38`: React 19, TypeScript, Vite 8, React Router 7, Zustand 5, Recharts 3, Lucide, Tailwind 4. Custom global CSS and a separate light-theme override stylesheet are loaded by `src/main.tsx:1-6`.
- `src/app/router.tsx:19-79`: browser-router nested routes; protected shell; scoped monitoring outlet; asset and Settings permission guards; root and dashboard index redirects; inside/outside-shell not-found routes.
- `src/components/layout/DashboardLayout.tsx:31-179`: floor scope comes from URL `floorId`; invalid floors fall back with a status banner; switching scope clears room/device/asset targets. A three-second telemetry interval lives in the layout. Theme is localStorage-backed; sidebar pin is sessionStorage-backed.
- `src/features/building/useDashboardScope.ts:8-47`: rooms determine scope membership for devices/sensors/readings; building scope combines available floors. Missing floors are excluded, not zero-valued contributors.
- `src/types/models.ts:1-77`: building > floor > room > asset > device/sensor relationships, operational status, incident severity, and incident lifecycle are different concepts.
- `src/features/auth/demoRoleMode.ts:4-17`, `authStore.ts:28-81`, `ProtectedRoute.tsx:12-20`: demo bypass is **currently enabled**, defaults to Admin, and automatically restores a demo role when no authenticated role exists. `/login` redirects to Overview. Credential login exists but is dormant under the current flag.
- `src/features/auth/permissions.ts:3-15`: both roles view dashboard and assets; only Admin has `canControlDevice` and `canManageSettings`. Client checks are not backend authorization. No production auth, IoT transport, billing service, durable maintenance database, or integrated 3D state was verified.
- Floor 1 has changing simulated telemetry. Floor 2 has static fictional fixtures and is not updated by automatic telemetry; however, the global Return System To Normal path currently normalizes both floors and resolves their initial alerts (`twinStore.ts:110-142,604-605`). Floors 3-5 have no monitoring configuration. The shared availability enum calls both data-bearing floors `simulation`, so presentation needs more precise provenance than that enum alone.
- Preserve mock/aggregate/sample distinctions. In particular, Floor 1 room totals cover 26 devices while only five have individual device records; a table with five rows is not a complete inventory.

### Historical Documentation Reconciliation

`README.md`, `docs/phase-6-demo-script.md`, `docs/ux-ui-improvement-wireframes.md`, and the 2026-10-08 building/forecast design were inspected. They are context, not current runtime authority. Earlier coverage claims of 1/5 floors and Floor-1-only detail modules are outdated; later sections acknowledge Floor 2. Older wireframes include an explicitly proposed Resolve button; no manual incident-resolution permission is inferred from that drawing.

Already present and to **retain**, not re-report as missing: URL floor persistence; clearing incompatible entity filters on floor change; Vietnamese document language (`index.html:2`); unresolved incident selection including acknowledged incidents (`alertSelectors.ts:6-17`); mobile incident cards; closed mobile sidebar `inert`; mobile navigation focus/Escape handling; room drawer entry/return focus; no-data floors excluded from totals; explicit Floor 2 static-data labels in the freshness helper. Remaining gaps are narrower and documented by ID below.

Also retain the chart's completed exact-hour interval derivation, no fabricated missing-hour intervals, explicit missing suspect-device readings, and cautious suspect ranking rather than asserted causation (`energySelectors.ts:57-95,133-173`, `EnergyChart.tsx:89-141,275-417`). Room totals already include sampled-device consumption; summing devices again would double-count. The Overview date selection does not rewind incident/device/air-quality/asset state; those remain current snapshots and need explicit applicability labels, not an invented historical timeline.

## 2. Product and Page Inventory

### Shared Shell and Overlays

- **Shell:** `DashboardLayout`, `DashboardHeader`, `DashboardSidebar`, `navigationConfig`. Brand, freshness, role switcher, incidents popover, account menu, collapsible/pinnable navigation, theme controls, scope context, main outlet.
- **Page header:** `ModulePageHeader` supplies breadcrumb/title/description, mock scope label, and floor selector. Scope selection is currently in page headings, not the global header.
- **Scope and recovery:** `DashboardScopeBoundary`, `FloorNoDataState`, `PermissionGuard`, inside/outside-shell `NotFoundPage`.
- **Shared content:** metric cards, status badges, energy chart/forecast with hourly/cumulative modes, selectable exceeded intervals and cautious suspect ranking, prioritized alert items, asset exceptions board/table, building stack, interactive SVG rooms/directory, room panel, asset drawer, maintenance recording dialog.

### Routes and Screen Variants

- **P01 Login, `/login`:** dormant credential form with username/password, visibility toggle, submission spinner, error alert, and mock account disclosure. Current demo mode redirects away. Intended users: both roles when credential mode is enabled. Evidence: `LoginPage.tsx:15-53,147-248`; router lines 24-27.
- **P02 Building Overview, `/dashboard/overview`:** default building summary, coverage, dated metrics, attention queue, floor stack/directory, environmental/asset/energy summaries. Both roles; Admin simulation controls belong to Floor 1 context. Source: `BuildingOverviewPage.tsx`, `DashboardPage.tsx`.
- **P03 Floor 1 Overview, `/dashboard/overview?floorId=...`:** operational KPIs, exception queue, SVG schematic and room directory, energy/environment/asset summaries, date filter, room panel, Admin simulation, external prototype action. Both roles inspect; controls differ by type. Source: `DashboardPage.tsx`, `Floor1MapPanel.tsx`, `RoomDetailDrawer.tsx`.
- **P04 Floor 2 Overview, same route with Floor 2 ID:** separate static fixture and rooms, not a second live floor. Same shared floor-map presentation with no Floor 1 device-control catalog. Source: same Overview files, `floor2.mock.ts`.
- **P05 Energy, `/dashboard/energy`:** scope KPIs, hourly/cumulative visualization and mode toggle, yesterday comparison toggle, room and tracked-device breakdown, waste/threshold interpretation, incident context and monthly forecast. There is no Energy calendar/date-range picker; Overview has its own local date filter that is not passed here. Both roles inspect. Source: `EnergyPage.tsx:61-81,225-280`, `energyWorkspaceModel.ts`.
- **P06 Environment, `/dashboard/environment`:** temperature/humidity/CO2/PM2.5 summary and room readings with thresholds; optional room query focus. Both roles inspect. Source: `EnvironmentPage.tsx`, `environmentSelectors.ts`.
- **P07 Devices, `/dashboard/devices`:** aggregate room-device counts plus individually modeled device/sensor table, status buttons, room/device query filters and reset. Both roles inspect. Source: `DevicesPage.tsx`, `deviceSelectors.ts`.
- **P08 Incidents, `/dashboard/incidents`:** unresolved/active/acknowledged/resolved filters, counts, timestamped room/device alerts, Admin acknowledgement, Viewer explanation; desktop table and mobile cards. Source: `IncidentsPage.tsx`, `alertSelectors.ts`.
- **P09 Assets and Maintenance, `/dashboard/assets`:** four clickable summary cards, three tabs (Assets, Maintenance plans, Maintenance history), searchable/filterable tables, five-tab asset drawer and Admin recording dialog. Viewer reads; Admin records local demo maintenance. The Overview asset-exceptions surface is a separate entry point. Source: `AssetsPage.tsx:417-610,623-1317`, `maintenanceData.ts`, `assetDetailSelectors.ts`.
- **P10 Analytics, `/dashboard/analytics`:** energy per room, room-normal percentage, tracked-device connectivity, unresolved alerts, cross-domain room matrix. Both roles inspect; not statistical correlation or historical uptime. Source: `AnalyticsPage.tsx:8-117`.
- **P11 Settings, `/dashboard/settings`:** global/Floor 1 simulation toggle/reset and role permission matrix. Admin only; no editable backend security configuration. Source: `SettingsPage.tsx:8-169`.
- **P12 3D Planned, `/dashboard/digital-twin`:** title, scope selector, planned-module card; separate from the external prototype opened by Floor 1 Overview. Both roles. Source: `ModulePlaceholderPage.tsx:11-40`, router line 70.
- **P13 No Data, Overview or scoped monitoring at Floors 3-5:** selected-floor explanation, scope selector, return action; not zero devices, clean environment, or no incidents. Source: `DashboardScopeBoundary.tsx:14-20`, `FloorNoDataState.tsx:14-39`.
- **P14 Access Restricted, guarded route state:** Viewer visiting Settings sees role/permission explanation and Overview link. Not a new route. Source: `PermissionGuard.tsx:18-40`.
- **P15 Not Found, unknown route:** generic Phase 0 placeholder and dashboard recovery link, either inside shell or standalone. Source: `NotFoundPage.tsx:3-10`, `PhasePlaceholder.tsx:18-59`.

Relationships: Overview KPI/exception links lead to monitoring; floor room selection opens a contextual panel, which leads to filtered Devices; maintenance incidents can lead to an asset; Assets joins identity, devices, plans, history, and simulated telemetry. URL scope is the common context, not an extra page entity.

## 3. Information Architecture

### Current Structure

```text
Entry / -> /dashboard/overview
/login -> Overview while demo bypass is enabled
Dashboard shell
  OVERVIEW: Total overview (resets to building)
  MONITORING: Energy | Environment | Analytics | Devices
  OPERATION: Incidents | Assets & maintenance | Settings (Admin)
  DIGITAL TWIN: 3D planned page
Scope: building | Floor 1 simulation | Floor 2 static | Floors 3-5 unavailable
Overlays: incidents popover | room panel | asset drawer | maintenance dialog
```

### Proposed Structure and Trade-offs

**Recommended: retain routes and shell, improve task ordering and context contracts** (UX-002, UX-007, UX-017, UX-025). This minimizes retraining and engineering risk. Keep Overview as the clearly labeled building home; floor-level return is a separate explicit action. Put scope, source/date, and exception priority before explanatory visualization.

```text
Building overview
  Current scope + data coverage + source dates
  Unresolved work -> Incidents -> contextual asset/device
  Floors -> selected-floor overview -> room panel -> filtered Devices
Monitoring: Energy | Environment | Devices | Analytics (comparison matrix)
Operations: Incidents | Assets & maintenance
Administration: Settings (Admin; global simulation controls)
Prototype: 3D (planned internally; external demo clearly labeled)
```

Alternative A, cosmetic-only restyling, is smaller but leaves misleading totals, permissions copy, and maintenance feedback unresolved. Alternative B, a new task-based route tree with work orders and a global command search, would be more disruptive and requires unverified requirements/data; it is not recommended or specified here. No new route, work-order lifecycle, sensor integration, tenant role, or manual incident-resolution action is proposed.

Cross-module links must retain valid `floorId` and the intended entity. Clearing a room filter must not clear the floor. Changing floor must remove incompatible entities. Global Settings must not suggest that its controls apply to the selected static/no-data floor. These are UX-002/UX-024/UX-025, not new business permissions.

## 4. Wireframe Conventions

These are **low-fidelity text specifications**, not rendered or high-fidelity designs. Brackets denote controls; text below a region denotes supporting copy. They describe proposed layouts unless explicitly marked current. Every proposed adjustment is owned by UX-001 through UX-028 in the backlog and final notes.

**Shared frame S:** top brand/demo status/role/incidents/account; left pinnable navigation on desktop, overlaid mobile navigation at the existing 850px threshold; page title and scope/source strip; main task content. The proposed skip link targets the existing main ID. Settings excludes the floor selector. Recovery screens can use a reduced shell. Source facts about existing frame do not imply that proposed shell refinements are implemented.

**Responsive contract R:** desktop >=1100px uses 12 content columns and 24px gutters; tablet 851-1099px uses eight columns, two-up summaries and stacked secondary panels; <=850px uses four columns and mobile navigation, with single-column task content where needed. At <=640px, use one-up KPI cards when value/label fit requires it. Support 320px width, 200% zoom and 400% reflow without page-level horizontal scrolling; complex data tables/maps may have labeled local scroll. These consolidate existing thresholds rather than requiring a new CSS framework (UX-018/UX-019).

**State contract T:** current synchronous mock data does not require fabricated network loaders. Future authorized async adapters need layout-matched loading, explicit partial/unavailable/error/retry, preserved last-known values labeled stale, and honest success messages. Missing data is never zero/normal. Do not introduce retry or save buttons without a functioning handler (UX-011/UX-022).

T applies to every wireframe below: on read-only pages, **success** means requested valid content/filter results are shown, not a fake save toast; **disabled** means a genuinely unavailable/pending/forbidden control with a visible reason, or not applicable when no action exists. Existing chart code-split fallback and asset exception states are retained. Per-page state paragraphs add specific empty/error/recovery behavior. WF-01/WF-09/WF-11 specify real form/action success and disabled states explicitly.

### WF-01: Login and Demo Entry (P01)

**Purpose/user/task:** both roles enter the correct access mode. **Current:** demo flag bypasses Login; dormant form validates required fields, disables blank/submitting actions and announces invalid credentials. Successful credential submission always returns to Overview, ignoring the captured return location.

```text
[ICS brand]                         [Demo environment]
Access to building operations
[Explicit demo-mode explanation OR credential-mode explanation]
[Username label / input]            credential mode only
[Password label / input / Show]
[Inline error connected to fields]
[Sign in]                          credential mode only
Role selection remains in demo shell, not a second invented login service
```

Use a centered 420-480px form region, not a marketing page. Primary action is Sign in only in credential mode; secondary is password visibility. In demo mode describe the default role and role switcher, not successful authentication. Logout must not promise a signed-out state while bypass immediately restores Admin (UX-001). Future return-location support must allow only valid internal permitted targets (UX-021/UX-024).

**States:** blank -> ready -> submitting -> success navigation or inline invalid-credentials recovery; disabled reason visible; no account-creation/password-reset promise without services. No credentials reproduced in documentation. **Desktop/tablet/mobile:** same single form, full-width controls on mobile, no hidden required instruction. **Accessibility:** visible labels, autofill, error association, focus to error summary, reduced-motion transition, logical heading order (UX-016/UX-018/UX-021/UX-023).

### WF-02: Building Overview (P02)

**Purpose/user/task:** both roles identify where attention is required across available floors. **Current:** coverage and static-vs-simulated distinctions exist; date filtering means headline daily energy can exclude Floor 2's older fixture while another module includes it.

```text
S: Building overview             [Scope] [Supported date]
2/5 floors with data | F1 simulated + timestamp | F2 static + date
[Unresolved incidents] [Comparable daily energy] [Device exceptions]
PRIORITY QUEUE (8 cols)                 FLOOR DIRECTORY (4 cols)
Severity | incident | floor | state     F1 simulation [Open]
[View incidents]                        F2 static     [Open]
                                        F3-F5 no data [Inspect status]
ENERGY: dated cumulative trend + text summary + coverage
ENVIRONMENT exceptions / ASSET exceptions -> relevant detail
```

Primary: open an unresolved item/floor. Secondary: module drill-down and date selection. Preserve acknowledged incidents until resolved; never count unavailable floors as healthy. A scope/date change recomputes labels and comparison eligibility, not only numbers (UX-007/UX-008/UX-013).

**States:** no unresolved work is distinct from no floor data; invalid date/floor has a clear reset; partial same-date coverage is explained; loader/error follow T. **Desktop:** priority/floors side by side. **Tablet:** priority first, directory second. **Mobile:** source strip, urgent work, compact KPIs, floors, then trend/details; all actions visible without horizontal table hunting. **Accessibility:** text severity, floor-row names/status, keyboard room/floor alternatives, live-region summaries only for meaningful changes (UX-018/UX-019/UX-023).

### WF-03: Floor 1 Overview (P03)

**Purpose/user/task:** both roles investigate a room exception; Admin can run mock scenarios. **Current:** SVG map and room directory, contextual nonmodal room panel, energy/date controls, exception and asset/environment summaries; floor prototype opens externally. Map layers are status/environment/devices/energy with 85/100/120/140% zoom and reset; layer changes do not implement an energy heatmap. Room switches/AC controls are local UI demo state, including for Viewer, not equipment commands.

```text
S: Floor 1 overview              [Scope] [Supported date]
SIMULATION / paused or running | reading date | freshness
[Unresolved] [Energy] [Device state] [Environment exceptions]
ATTENTION QUEUE                  [View incidents]
ROOM DIRECTORY + SVG (8 cols)    ROOM DETAIL (4 cols when selected)
Name | reason | status           identity > readings > devices
[Select room]                    [View devices] [Close]
Energy trend | Environment | Asset exceptions
Admin simulation (visually separate, explicit Floor 1 effect)
[External 3D prototype: opens new tab]
```

Primary: inspect exception/room and open correctly filtered Devices. Secondary: module links; Admin-only store-changing scenarios. Room panel selection is not a navigation event or permission grant. Preserve its nonmodal behavior and do not pull focus back on every telemetry object update. Local UI-demo controls need explicit persistence and role boundaries (UX-016/UX-025/UX-027).

**States:** no selection shows map/directory guidance; room offline/missing metric shows unavailable with last-known provenance; a denied simulation action explains permission; scenario success explicitly says local simulation. T covers future load/error. **Desktop:** dock panel beside map; **tablet:** panel below with an anchor; **mobile:** readable directory before schematic and a full-width contextual panel, not a compressed 3-column drawer. **Accessibility:** keyboard-selectable SVG plus equivalent room list, stable focus during telemetry, named local controls, no color-only threshold cues (UX-007/UX-018/UX-019/UX-023).

### WF-04: Floor 2 Static Overview (P04)

**Purpose/user/task:** both roles inspect illustrative Floor 2 data without mistaking it for current monitoring. **Current:** five static demo areas, separate source date, shared overview/map structure; no Floor 1 room-control catalog.

```text
S: Floor 2 overview                       [Scope]
STATIC DEMO | fixture date | not auto-updated
[Fixture energy] [Fixture devices] [Fixture unresolved incidents]
Static incident list -> scoped Incidents / Assets
Room directory + illustrative map -> room read-only detail
Trend/comparison: available fixture dates only; otherwise unavailable
[Return to building]
```

Primary: inspect a static room/incident. Secondary: change scope/return building. Never relabel static readings as today's measurements or display Floor 1 controls/data to fill gaps. Do not duplicate Admin simulation controls here; the existing global-normalization exception must be corrected or explicitly disclosed, not hidden behind the word static (UX-008/UX-025).

**States:** unsupported date shows no comparable data with a return-to-fixture-date action; no tracked asset/device explains coverage, not missing sensor connectivity; T covers future errors. **Desktop/tablet/mobile:** use R, prioritizing static-data disclosure before KPIs at every size. **Accessibility:** static is text, not just a muted color; use same keyboard room directory, headings and focus rules as Floor 1 (UX-018/UX-019/UX-023).

### WF-05: Energy Workspace (P05)

**Purpose/user/task:** both roles understand scoped consumption, exceptions, and an illustrative forecast. **Current:** summary, chart, room/device data and forecast use different coverage/time assumptions; chart mode/yesterday toggle and selectable exceeded-hour/suspect-device detail exist, but the proposed shared supported-period control below does not. Overview historical presentation is not equivalent to recorded telemetry and its selected dates currently do not carry into Energy.

```text
S: Energy                               [Scope] [Supported date/range]
SOURCE LEDGER: floor | date | simulation/static/estimated | included?
[Same-period kWh] [Comparable prior period or unavailable] [Exceptions]
CONSUMPTION CHART (8 cols)              FINDINGS (4 cols)
Title: cumulative kWh, date, coverage   threshold/waste explanation
[Hourly detail / text data]            [Relevant devices/incidents]
ROOM BREAKDOWN -> TRACKED DEVICE SAMPLES (coverage clearly separate)
FORECAST: projected cost | period | assumptions | estimated vs recorded
History availability explanation, not synthetic records presented as actual
```

Primary: investigate a room/device contributing to an exception; secondary: choose supported period and inspect forecast methodology. Date/scope switching updates every panel consistently or explicitly marks a panel's independent monthly period. No export, billing action, chart brushing, or pagination is claimed as existing (UX-008/UX-009/UX-010).

**States:** unavailable comparison/date/history produces an explanation, not zero; partial mixed-date totals cannot be called today; empty device samples do not invalidate aggregate rooms; no forecast inputs produces unavailable rather than currency zero; loading/error follow T. **Desktop:** chart/findings split; **tablet:** stack; **mobile:** metric context then chart summary, local horizontal chart/table exploration, forecast assumptions adjacent to estimate. **Accessibility:** chart data/text equivalent, distinguish measured/fixture/projected line styles and labels, readable units and focusable meaningful points without tooltip-only facts (UX-018/UX-019/UX-020/UX-023).

### WF-06: Environment (P06)

**Purpose/user/task:** both roles find room-level threshold exceptions and distinguish missing/offline readings. **Current:** metric summary and threshold table; room-focused links can filter it; clearing its room focus currently clears all query parameters, including floor.

```text
S: Environment                                  [Scope]
Source date/freshness | thresholds are demo operating thresholds
[Temperature] [Humidity] [CO2 exceptions] [PM2.5 exceptions]
[Room context chip x] [Show all rooms in THIS scope]
EXCEPTIONS FIRST
Room | reading + unit | limit | status | related context
All-room readings / threshold legend / source note
```

Primary: inspect affected room and related devices/incidents where those entities exist; secondary: clear only the room filter. Retain threshold definitions; never infer normal from absent air-quality data (UX-002/UX-011).

**States:** missing, offline, threshold exception and normal are distinct; unknown room shows no matching room/reset; empty scope is handled by No Data; T governs future load/error. **Desktop:** full table; **tablet:** locally scrollable with fixed room identity; **mobile:** exception summary cards with room and metric, then optional full table. **Accessibility:** threshold reason in words and unit, not badge color alone; labeled focusable scroll region and descriptive recovery action (UX-018/UX-019/UX-023/UX-024).

### WF-07: Devices (P07)

**Purpose/user/task:** both roles identify the status of individually modeled devices and understand aggregate coverage. **Current:** aggregate totals and tracked rows intentionally differ; status filters and room/device query filters exist, but target IDs need clear matching/no-match behavior.

```text
S: Devices                                      [Scope]
AGGREGATE: all room devices | online/offline/other status
TRACKED RECORDS: modeled count / aggregate count + source note
[Room chip x] [Device chip x] [Clear matching filters]
[All] [Online] [Warning] [Offline] + result counts
Device | floor/room | type | state | sensors/last-known context
[Open associated asset/incident, only when a target exists]
```

Primary: inspect the targeted modeled record; secondary: status filter and scoped clear. An Online filter is an exact status category, not shorthand for all non-offline states. Do not manufacture rows for aggregate-only devices or imply all records are controllable (UX-012/UX-024).

**States:** no status matches -> reset status; unmodeled device -> explain aggregate-only coverage; unknown/mismatched target -> clear only invalid entity; stale/offline -> label last-known readings; T for future async states. **Desktop/tablet:** keep room/device identity anchored in table; **mobile:** compact record summary then optional sensor table/local scroll. **Accessibility:** pressed filters, result-count announcement after user action, stable row labels, no color-only connection states (UX-018/UX-019/UX-023).

### WF-08: Incidents (P08)

**Purpose/user/task:** Admin accepts a local simulated incident; Viewer inspects unresolved work. **Current:** acknowledged remains unresolved; resolution can result from simulation normalization, not a manual Resolve action. Main list and header popover sort differently and popover drill-down can lose floor scope.

```text
S: Incidents                                    [Scope]
LOCAL SIMULATION ONLY | unresolved = new + acknowledged
[Unresolved] [New] [Acknowledged] [Resolved] + counts
Priority / severity | incident | floor/room | occurred | lifecycle
[Acknowledge] Admin only   OR   Admin handles this (Viewer)
[View related asset/device] when supported
Feedback: accepted locally; issue remains unresolved
```

Primary: acknowledge active alert (Admin); inspect details (both). Secondary: filter lifecycle and follow a context-safe target. Do not add Resolve or assignment/escalation controls without new approved business rules. Separate urgency, severity, lifecycle, and device state (UX-002/UX-013).

**States:** no unresolved is not no telemetry; empty filtered lifecycle offers reset; repeat acknowledgement does not create another event; local failure/denial keeps incident visible with reason; resolution appears with its simulated cause; T covers future persistence errors. **Desktop:** table; **tablet:** actions stay visible; **mobile:** retain existing cards and visible action, increasing readability as specified. **Accessibility:** native links/buttons rather than clickable nested button rows; announce acknowledgement once, preserve filter and focus, no false green healthy state for acknowledged (UX-016/UX-018/UX-019/UX-023).

### WF-09: Assets and Maintenance (P09)

**Purpose/user/task:** both roles inspect asset identity, plans/history and maintenance risk; Admin records a local result. **Current:** the page has Assets/Plans/History tabs and a separate five-tab detail drawer. Page-level plans/history and asset-drawer data can disagree; recorded failed/monitoring outcomes can still advance/reset maintenance state.

```text
S: Assets & maintenance                         [Scope]
[Due/overdue] [Attention] [Tracked asset coverage]
[Assets | Maintenance plans | Maintenance history]
[Existing search/filters for active tab] [Clear]
ASSET IDENTITY -> condition -> due plan -> evidence/history
Asset | floor/room | actual status | next milestone | [Inspect]
ASSET DETAIL: Overview | Operation | Maintenance | Incidents | Identity
[Record maintenance] Admin -> result dialog
Result dialog: plan identity, performed date, performer, applicable runtime,
acceptance result and result-aware required notes
[Cancel] [Record locally] -> coherent plan + history + detail feedback
```

Primary: inspect due plan/asset; Admin secondary: record outcome. Keep recording a simulated local action, not a work order, remote maintenance completion or compliance approval. A failed result must not imply recovered equipment; calendar and runtime cycles require different progression rules (UX-014/UX-015/UX-026).

**States:** no assets in scope vs no filtered match vs detail load failure have separate copy; invalid dates/results keep dialog open and preserve input; submit success updates all representations; failure does not silently advance; Viewer has explanatory read-only affordances. T covers future data adapters. **Desktop:** board/catalog with contextual drawer; **tablet:** single-column plans/history; **mobile:** priority rows and full-width detail/dialog, visible action footer not obscured by keyboard. **Accessibility:** deliberate modal focus, error summary/field association, named tabs, return focus to invoking plan, no normal-to-warning remapping (UX-016/UX-018/UX-019/UX-023).

### WF-10: Analytics (P10)

**Purpose/user/task:** both roles compare available operational data across rooms. **Current:** a room `normal` percentage is labeled standards compliance; the share of currently non-offline tracked devices is called uptime; the matrix is called correlation without a statistical calculation.

```text
S: Operational comparison                       [Scope]
Source/coverage/date and denominator disclosure
[kWh per represented room] [Rooms operationally normal]
[Tracked-device current connectivity] [Unresolved / critical alerts]
ROOM COMPARISON MATRIX
Floor / room | dated kWh | temperature | humidity | CO2 | device ratio
Definition notes and links to Energy / Environment / Devices / Incidents
```

Primary: compare rooms; secondary: open the relevant evidence module with valid scope. Rename metrics to their actual computation before offering new analysis features. No trend/causality/uptime SLA claim without suitable time-series data (UX-005).

**States:** denominator zero -> unavailable, not 100%; absent metric -> unavailable; filtered/no-data scope uses the shared recovery; T for load/error. **Desktop:** matrix with fixed row identity; **tablet:** smaller summary groups/local scroll; **mobile:** room comparison cards first, optional complete matrix below. **Accessibility:** caption states definitions and period, readable headers/units, labeled keyboard scroll and text states (UX-018/UX-019/UX-023).

### WF-11: Settings (P11)

**Purpose/user/task:** Admin understands and controls the Floor 1 simulation. **Current:** toggles and immediate global reset, success status banner, client permission matrix, and inherited floor selector even though scope label says whole system. Copy implies route/API enforcement beyond verified client checks.

```text
S: Simulation settings                 [Admin / demo mode]
Applies to Floor 1 local simulation; Floor 2 stays static
SIMULATION STATUS [Start/Pause]   affects all dashboard routes
RESET SIMULATION
What resets: alerts, telemetry, devices, maintenance-linked mock state
[Reset...] -> confirmation: consequences + [Cancel] [Reset locally]
READ-ONLY ROLE MATRIX
Client-demo permissions; production server enforcement not implemented
```

Primary: start/pause simulation. Secondary: separately confirmed reset and read-only permissions review. No floor picker; no editable RBAC controls or production authorization claims. Role change to Viewer preserves a safe read-only surface and makes running simulation ownership explicit (UX-006/UX-025).

**States:** current running/paused, reset confirmation, canceled/no mutation, success status, denied, and future failure with state retained. **Desktop:** two panels; **tablet/mobile:** simulation before role matrix; matrix local scroll with labels. **Accessibility:** pressed toggle, confirmation focus/return/Escape, success not used for a permission-denied result, 44px touch controls (UX-016/UX-019/UX-023).

### WF-12: Planned 3D Module (P12)

**Purpose/user/task:** both roles understand availability and return to a useful 2D task. **Current:** internal route says planned, while Floor 1 Overview opens an external prototype in a new tab.

```text
S: 3D model (planned)                          [Current scope]
Internal 3D integration is not available in this demo
What exists: 2D room monitoring / separate external prototype
[Return to scoped 2D overview]
[Open external prototype, new tab] only with explicit destination disclosure
No room/device synchronization or control promise
```

Primary: return to scoped 2D overview; secondary: optional existing prototype link with external label. No embedded 3D implementation or invented selected-room deep link (UX-017). **States:** planned is not loading/error; external destination unavailable cannot be fixed by a fake retry; do not claim external uptime. **Desktop/tablet/mobile:** one readable panel, no empty canvas implying a model is loading. **Accessibility:** external/new-tab announcement, descriptive link, stable return context (UX-002/UX-018/UX-021).

### WF-13: Unconfigured Floor (P13)

**Purpose/user/task:** both roles recover from a floor with no source data. **Current:** shared action says return to building Overview but changes scope only; on Energy it can remain on Energy.

```text
S: [Current module] / Floor N                   [Scope]
Floor N has no configured monitoring data
No telemetry, aggregate contribution, or health conclusion available
[View this module for the building]   scope-only action
[Go to building overview]             explicit route + scope action
[Choose Floor 1 simulation or Floor 2 static]
```

Primary/secondary labels must describe real destinations; two actions are optional if one clearly named action suffices (UX-004). **States:** unavailable configuration distinct from transient error, loading, filtered-empty, and zero readings; no healthy zero KPIs. **Desktop/tablet/mobile:** single bounded panel with selector and visible recovery; no disabled dashboards. **Accessibility:** explanatory heading, native named buttons/links, focus follows recovery; no repeated alert announcements for static absence (UX-018/UX-019/UX-023).

### WF-14: Access Restricted (P14)

**Purpose/user/task:** Viewer understands an Admin-only destination without requesting nonexistent self-service access. **Current:** guard explains role and required permission with an Overview link.

```text
S: Access restricted
This area is available to Admin in this demo
Your role: Viewer | no action was performed
[Return to building overview] [Return to a permitted previous page]
Demo role selection, if retained, explicitly means preview mode
```

Keep the present permission boundary. Primary: known permitted Overview; secondary previous-page recovery only after validating it. Do not add approval workflows or production role escalation (UX-001/UX-021/UX-024). **States:** null session vs denied role distinct; denial is not a save success, spinner, or server outage. **Desktop/tablet/mobile:** one panel with wrapped role copy. **Accessibility:** focus to title, concise alert, visible navigation, no trap outside an actual modal (UX-018/UX-023).

### WF-15: Not Found (P15)

**Purpose/user/task:** anyone recovers from an unknown route. **Current:** Phase 0/Foundation-only/Floor 1 copy is stale; nested not-found can render a second `main` inside shell main.

```text
[Shell when already inside dashboard, otherwise compact ICS brand]
Page not found
The address is not available in this demo
[Go to building overview] [Return to permitted previous page]
No account data or technical exception dump
```

Primary: Overview; secondary safe back. No automatic redirect loop or false Floor 1 context. **States:** 404 distinct from permission-denied and module-planned; future route exceptions follow T, not 404 copy. **Desktop/tablet/mobile:** bounded panel, full-width mobile actions. **Accessibility:** one main landmark, one page heading, descriptive title/recovery focus and localized copy (UX-021/UX-022/UX-023/UX-024).

## 5. Interaction Specifications

All behavior in this section is a **future contract**, except explicitly identified existing capabilities. IDs connect to the complete backlog/final notes.

### Navigation, Scope, and Filters

- UX-002/UX-024: entity drill-down retains `floorId`, compatible room/device/asset target, and a clear return. Clear one filter without resetting unrelated context. Validate stale/unknown/mismatched IDs; display no-match with a scoped reset rather than silent fallback to different data. Existing floor normalization and filter clearing on scope change are retained.
- UX-003: choose one accessible floor-selector pattern, preferably native select or a conforming button/listbox. Opening on click must not be canceled by preceding hover. Arrow/Home/End navigation, selected option announcement, Escape, focus return, outside click and touch must agree; avoid exposing duplicate proxy controls.
- UX-007/UX-025: Overview remains building home. Use explicit selected-floor return links rather than changing that established behavior invisibly. Keep running simulation status accessible across routes, distinct from global user permissions and floor data availability.

### Forms, Maintenance, and Destructive Actions

- UX-001/UX-021: in dormant credential mode, retain required fields and visibility toggle; associate validation and preserve input on error. Internal return targets are validated. Demo role choice is preview, not authentication.
- UX-014/UX-015: maintenance submission validates performed date, selected plan, result, required notes and applicable milestone. A passed result may advance the appropriate approved cycle; failed/needs-monitoring does not certify equipment recovery or automatically clear attention. Exact progression rules need product approval before development. Runtime and calendar plans are not interchangeable.
- UX-006/UX-016: reset asks for confirmation with affected state listed; Cancel/Escape is non-destructive, focus returns to Reset. Submit disables only while an actual operation is pending, never silently discards form values. Copy says local simulation, not remote save.
- UX-027: local room-control demo must disclose that it is not saved to Twin state or hardware; recommend Viewer read-only presentation using the existing control-permission meaning. Admin preview updates announce local-only effects, supported ranges and unavailable/offline reasons. No real actuation is authorized.

### Tables, Boards, Search, and Pagination

- UX-012/UX-013/UX-015/UX-026: counts specify full scope versus filtered rows versus tracked sample subset. Keep status/lifecycle/priority separate. Search/filters already present on Assets remain; no global search service is invented.
- UX-019/UX-023: use semantic headers/caption and a labeled keyboard-accessible local scroll container. Compact mobile cards expose primary actions; detailed tables remain available. Keep row identity available while exploring columns.
- UX-013: make incident order and priority rationale consistent between the header and page, preserving unresolved acknowledged work. Native item link and sibling acknowledgement button replace nested row-as-button behavior.
- UX-019: do not add pagination to a five-record sample just for visual convention. If future real inventory requires it, explicitly separate server total from page/filter count, preserve sorting/filter scope, and provide labeled previous/next plus page status. This is conditional scalability guidance under UX-019, not a new current feature.
- UX-005/UX-019: only show sorting controls when meaningful and implemented; announce direction with `aria-sort`, retain stable ordering on equal values, and expose units/definitions. No advanced analytics computation is implied by sorting a matrix.

### Charts, Dates, and Forecasts

- UX-008/UX-009: title includes metric type, unit, reference date/timezone and included floors. Cumulative kWh is not hourly kW; derived interval consumption must be separately labeled. Samples after the measurement cutoff or reconstructed histories are not observed readings. Tooltip content is also available as text/table.
- UX-008: comparison requires matching metric definition, dates, scope and compatible sources; otherwise show unavailable with explanation. Date choices come from actual supported demo data, with unsupported selections recoverable. Proposed calendar draft selection/Apply/Cancel avoids the current immediate first-click application; valid period handoff to detail or explicit reset disclosure prevents hidden context loss. Independent forecast billing period is clearly named rather than appearing to follow a daily filter that it ignores.
- UX-010: distinguish recorded meter data, baseline-filled days, projected remainder and illustrative currency. Show meter/source dates, included floors, elapsed days, formula and exclusions near the forecast. Never label an imputed sum synchronized/recorded actual. No tax/tier/billing service or confidence interval is invented.

### Panels, Menus, Tabs, and Feedback

- UX-016: true modal dialogs receive initial focus, trap focus, inert background, Escape/Cancel and invoking-control restoration. Nonmodal room panels retain page access and stable focus; do not trap or refocus on telemetry. Asset overlays must explicitly choose modal vs docked nonmodal behavior before applying these rules. Match tab roles, selected state, keyboard movement and panel labels. Calendar date-grid roles require matching row structure, focus placement, arrow/date navigation and selected-date announcements; native room-directory/table action buttons must preserve list/table semantics.
- UX-016/UX-023: header popover uses click/keyboard as reliable entry; hover is supplemental and never dismisses focused content. Native nested interactive semantics must be avoided. Account menu closes predictably on Escape/outside activation without moving focus unexpectedly.
- UX-013/UX-022/UX-023: user-triggered acknowledgement/save/reset emits one concise live status; background three-second telemetry does not repeatedly announce whole tables. Errors are actionable, permission denials are not rendered as success. Do not equate empty alert list with proven building safety.
- UX-011/UX-022: loading, filtered-empty, scope-unconfigured, missing metric, offline/last-known, failed operation and successful local operation have separate text and actions. Existing asset loading/error handling is retained; recommendations target consistency, not a claim that every page lacks states.

## 6. Design System Proposal

**Recommendation only (UX-018/UX-019/UX-020/UX-021/UX-023).** Retain ICS's cool neutral/cyan operational language, Lucide icon set, Recharts, SVG and current light/dark modes. Avoid decorative redesign, new font packages, animation frameworks, gradients for severity, or a framework migration.

### Semantic Colors and Surfaces

- Proposed `surface.canvas`: light `#F2F6F8`, dark `#07121C`; `surface.panel`: light `#FFFFFF`, dark `#0C1B29`; `surface.subtle`: light `#E8EFF3`, dark `#14283A`. These derive from existing theme values.
- Proposed `text.primary`: light `#172630`, dark `#F4F8FB`; `text.secondary`: light `#405563`, dark `#C4D2DE`; `text.muted`: light `#607581`, dark `#9CAFBF`.
- Proposed `border.default`: light `#C8D4DB`, dark `#30485D`; `action.primary`: light `#087F93`, dark `#22D3EE`; choose dark/light button foreground by measured contrast, not by hue intuition.
- Proposed semantic foregrounds derive from current tokens: normal light `#087755`/dark `#34D399`; warning `#8B5900`/`#FBBF24`; critical `#B4232E`/`#F87171`; offline `#52636E`/`#A7B5C3`. Pair every tone with text and icon. Acknowledged lifecycle uses a neutral/in-progress treatment, not normal-health green.
- Add provenance roles `data.simulated`, `data.static`, `data.estimated`, `data.unavailable` with explicit labels; they must not reuse severity as their only distinguishing channel. Chart observed/static/projected lines also differ by dash/marker/text. Exact additional colors require contrast testing, not arbitrary new hex values here.
- Acceptance target: WCAG 2.2 AA, normal text >=4.5:1, large text >=3:1, meaningful control boundaries/focus/graphics >=3:1 against adjacent surfaces. These are targets, **not measured passes**. Verify composited translucent surfaces, disabled explanatory text and both themes at real sizes.

### Typography, Spacing, and Layout

- Retain system/Inter fallback stack; do not require a font download. Use tabular figures for metrics, times, kWh and currency. Body 16px/1.5, data rows 14px/1.45, auxiliary labels 12px minimum, section headings 18-20px, page title 26-32px. Avoid the existing 8-10px primary table/status text. Use sentence case; uppercase only brief category labels.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48px. Panel padding 24 desktop/16 mobile; section separation 24-32; control gap 8-12. Preserve intentional dashboard density without shrinking text.
- Use R's 12/8/4-column content grids. Content max-width approximately 1600px for operational tables; prose <=65-75 characters. Do not impose a narrow marketing container on maps/tables.
- Radius: controls 6px, panels 10px, true dialogs 12px. Border 1px; focus outline at least 2px with offset. Elevation only for sticky shell/popovers/dialogs, not every metric. Define ordered layers: base, sticky header/sidebar, popover, backdrop, modal; prevent competing overlay focus owners.
- Control height 40px desktop, target 44px touch; satisfy at least WCAG target size/spacing requirements wherever constrained. No hover-only action or 29px mobile close target. Prefer 120-200ms opacity/color transitions and respect reduced motion; do not animate live KPI changes so strongly that reading is interrupted.

### Components and States

- Buttons: primary for one next task, secondary for exploration, text links for navigation, destructive only for reset. Include hover/focus/pressed/disabled/pending states and visible permission/unavailable reasons.
- Inputs/selects: persistent labels, help/error association, 44px mobile size, no placeholder-only identity. Do not style unsupported search/export as working controls.
- Metric cards: value, precise label, scope/date/denominator, source and optional valid drill-down. Status badges express one concept at a time.
- Tables/boards: separate scope totals from filtered results, readable identifiers, semantic row/header relationships, visible local scroll cue, mobile action parity. Board priority is not a replacement for lifecycle history.
- Navigation: retain active markers and pin controls; provide accessible names in collapsed mode; group labels localized; Settings separated from floor monitoring.
- Dialog/drawer/tab primitives follow UX-016's explicit modality and focus contract. Avoid clickable cards containing another button-as-row.
- Charts: one measured metric per clear axis; unit/source/date/legend; text/table equivalent; static/estimated styling. Cards for forecast explain formula/exclusions; no persuasive billing certainty.
- Notifications: success means local operation accepted, warning means attention required, error means operation not completed, information describes coverage. Use restrained announcements and never rely on toast alone for validation.

## 7. Evidence-Based Audit and Prioritized Backlog

This section is both the audit register and the future implementation backlog. Each record includes observed problem, impact, evidence, proposal, priority/effort, dependencies, acceptance and implementation notes. Severity is scoped to this local demonstration; **no Critical issue is asserted without evidence of an essential blocked task or production harm**. Business impact and effort estimates are inferred, not measured. All items are proposed and unimplemented.

### UX-001: Honest Demo Access and Sign-out

- **Page/component:** demo entry, Login, header account menu. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** default Admin and login bypass are enabled (`demoRoleMode.ts:16-17`, router 24-27); logout clears auth but `ProtectedRoute.tsx:12-16` restores default role. Header still says Sign out (`DashboardHeader.tsx:69-72,148-154`).
- **Impact/reason:** users may believe they ended access or authenticated securely when neither is true in demo mode.
- **Proposal:** explicitly identify preview/demo access; replace misleading sign-out behavior/copy with a defined demo-exit outcome, while retaining a distinct credential-mode flow.
- **Acceptance:** demo entry, role switch, refresh and exit labels match actual state; no signed-out success followed by silent Admin restoration; credential mode is not confused with preview mode.
- **Dependencies/risks:** product decision on demo-exit destination; do not change production auth or introduce a new role.
- **Future implementation note:** cover both flag modes and permitted return targets; never reproduce mock credentials in redesign artifacts.

### UX-002: Preserve Scope Through Navigation

- **Page/component:** Environment reset, header incident links, all entity drill-down. **Priority:** High. **Effort:** Small.
- **Observed issue/evidence:** Environment resets with `setSearchParams({})` (`EnvironmentPage.tsx:65-70`); incident popover paths omit `floorId` (`IncidentsPopover.tsx:132-138,294-301`), unlike shared `scopedPath.ts:3-13`.
- **Impact/reason:** users investigating one floor silently see whole-building data or the wrong result set.
- **Proposal:** retain compatible floor/entity context and clear only the intended filter; show explicit building-home navigation separately.
- **Acceptance:** clearing Environment room focus retains floor; every popover link opens its intended incident/asset within valid scope; browser Back restores context; changing floor clears incompatible entities.
- **Dependencies/risks:** known entity-floor relationships; do not persist invalid cross-floor targets.
- **Future implementation note:** reuse existing scoped-path conventions rather than creating a parallel navigation model.

### UX-003: Reliable Accessible Floor Picker

- **Page/component:** `BuildingFloorSelector`. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** hover opens while click toggles (`BuildingFloorSelector.tsx:103-131`); visual highlighted index changes without focus/active-descendant linkage (134-183,274-323); hidden native proxy remains exposed separately (234-252; CSS 2778-2789).
- **Impact/reason:** keyboard/screen-reader users may not know the highlighted choice; pointer click after hover can close instead of select. Browser confirmation remains necessary.
- **Proposal:** one coherent native or conforming listbox pattern, explicit focus/selected announcements, click/touch reliability and Escape recovery.
- **Acceptance:** pointer, touch, arrows, Enter/Space, Home/End, Escape and outside click agree; one accessible value; selected state announced; no hover-induced click cancellation.
- **Dependencies/risks:** screen-reader/browser verification; preserve available/static/unconfigured labels.
- **Future implementation note:** retain URL/context behavior; do not add a new building hierarchy without data.

### UX-004: Truthful No-data Recovery

- **Page/component:** no-data floor state. **Priority:** Medium. **Effort:** Small.
- **Observed issue/evidence:** action says return to building Overview (`FloorNoDataState.tsx:34-38`) but scope boundary callback only changes location (`DashboardScopeBoundary.tsx:16-18`).
- **Impact/reason:** a user on Energy remains on Energy despite the label promising Overview.
- **Proposal:** label the action as building scope for the current module, or explicitly navigate to building Overview; optionally offer both distinct paths.
- **Acceptance:** Floors 3-5 show no fabricated zeros; recovery label, resulting route and resulting floor agree on every scoped module.
- **Dependencies/risks:** shared recovery component also used by Overview.
- **Future implementation note:** preserve useful existing no-configuration explanation and floor selector.

### UX-005: Accurate Analytics Metric Names

- **Page/component:** Analytics summary and matrix. **Priority:** High. **Effort:** Small.
- **Observed issue/evidence:** `AnalyticsPage.tsx:12-20,43-54,65-77` computes instantaneous tracked-device non-offline share and operationally normal rooms, labeled uptime/compliance/correlation.
- **Impact/reason:** viewers infer historical reliability, environmental compliance or statistical causality unsupported by computation.
- **Proposal:** name instantaneous connectivity, operationally normal rooms and cross-domain comparison accurately; show denominator, source date, scope and unavailable zero denominators.
- **Acceptance:** definitions match formulas, aggregates are distinguished from tracked records, no 100% for absent denominator, no uptime/SLA/statistical claim without evidence.
- **Dependencies/risks:** product agreement on terminology, not new analytics data.
- **Future implementation note:** link to existing evidence modules; do not fabricate time-series history.

### UX-006: Safe and Honest Settings

- **Page/component:** Settings reset and role matrix. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** reset executes immediately (`SettingsPage.tsx:33-40,85-97`); permission copy claims Route/Action API enforcement (104-111) while verified enforcement is client-side; generic feedback uses success icon for all messages (52-56).
- **Impact/reason:** accidental state loss and exaggerated security assurances reduce trust.
- **Proposal:** confirm reset consequences/cancel, describe local simulation/client permissions precisely, and differentiate success/denial/error feedback.
- **Acceptance:** Cancel/Escape changes nothing; confirmation names affected mock state; Viewer remains denied; no production API-security claim; denial never uses success styling.
- **Dependencies/risks:** reset impact inventory and modality contract UX-016.
- **Future implementation note:** reuse existing permissions; no backend/RBAC changes in this proposal phase.

### UX-007: Decision-first Overview Hierarchy

- **Page/component:** building/floor Overview, room investigation. **Priority:** Medium. **Effort:** Medium.
- **Observed issue/evidence:** current Overview combines scope/date/KPIs, map, attention, energy, environment, assets and simulation (`BuildingOverviewPage.tsx`, `DashboardPage.tsx`, `Floor1MapPanel.tsx`); historical UX doc prioritizes unresolved work ahead of illustration.
- **Impact/reason:** dense competing regions can obscure the next operational task; this is an inferred hierarchy concern, not measured task-time evidence.
- **Proposal:** retain existing components but place source/coverage and unresolved work first, then floor/room exploration and supporting trends; isolate Admin simulation controls.
- **Acceptance:** primary unresolved task and scope/source are visible before decorative map content on mobile; all current detail links and room list remain available; acknowledged work remains visible.
- **Dependencies/risks:** responsive layout verification; preserve building-home behavior and floor-specific data.
- **Future implementation note:** reuse current SVG/directory and panels; no 3D replacement or new dashboard data.

### UX-008: Same-period Energy and History Truth

- **Page/component:** Overview/Energy totals, date workspace and breakdown. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** building Overview excludes out-of-date Floor 2 for today (`BuildingOverviewPage.tsx:123-147,188-218,330-335`), while Energy sums scoped rooms (`energyWorkspaceModel.ts:192-209,296-328`) and labels the KPI today (`EnergyPage.tsx:142-149`). Mixed-date comparison percentage KPI is already unavailable (model 409-427), but the enabled chart toggle still renders a reconstructed Floor 1 comparator; floor breakdown provenance exists but is not surfaced. Overview dates apply immediately and are not handed to Energy; historical room values can be scaled fixtures (`dateFilterUtils.ts:101-173,194-233`), while incidents/devices remain current. Meter-versus-area unallocated reconciliation is derived from the same room sum, not an independent meter (workspace 239-328, EnergyPage 363-365). Repeated spike replaces one fixed chart curve while incrementing room totals again (`twinStore.ts:573-599`).
- **Impact/reason:** incompatible headline totals and reconstructed-history presentation can mislead consumption decisions.
- **Proposal:** expose floor/date/source inclusion ledger, align current-day totals across modules/scenarios, label synthetic/history and same-source-reconciliation assumptions plus which panels follow dates, and offer only supported or explicitly estimated periods with deliberate Apply/Cancel and period handoff/reset disclosure.
- **Acceptance:** same floor/date/metric yields same headline across modules and after repeated spike; Floor 2 older sample is separate; unavailable comparison percentage stays unavailable and any modeled chart comparator is explicitly labeled; historical reconstruction is never presented as recorded telemetry; canceling draft dates changes no applied period and drill-down period behavior is explicit.
- **Dependencies/risks:** approved demo date/timezone semantics, no real history service.
- **Future implementation note:** surface existing workspace provenance rather than synthesizing additional observations.

### UX-009: Understandable Accessible Energy Chart

- **Page/component:** shared EnergyChart, threshold/waste explanation. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** shared chart includes cumulative energy and hourly/threshold interpretation (`EnergyChart.tsx`, Energy workspace); old UX guidance already requires cumulative kWh/reference date. Yesterday curve is a scaled current curve, not an observed prior-day series (`energyWorkspaceModel.ts:389-460`), and the toggle can remain available while mixed-date percentage is unavailable (`EnergyPage.tsx:248-255`). Visual source review cannot verify tooltip/axis readability at target sizes.
- **Impact/reason:** cumulative kWh, hourly interval energy and instantaneous power are easy to confuse; tooltip-only details exclude some users.
- **Proposal:** explicit metric/unit/date/coverage/cutoff, separate derived intervals/threshold rationale, clearly modeled comparison-curve labeling/eligibility, distinguish observed/static/estimated marks, and provide text/data equivalence while retaining exact-hour gap rules and cautious suspect ranking.
- **Acceptance:** users can determine what one point means without hover; future-time estimates are not actuals; units are dimensionally correct; keyboard/text view reveals relevant values and exceptions.
- **Dependencies/risks:** Recharts capabilities and data availability; no chart-library replacement needed.
- **Future implementation note:** preserve existing chart strengths and verify rather than assuming every existing chart label is missing.

### UX-010: Forecast Provenance and Estimate Disclosure

- **Page/component:** monthly forecast. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** forecast baseline-fills elapsed days/floor alignment (`energyWorkspaceModel.ts:568-588`, `energyForecast.ts:55-76`), while card wording describes recorded/synchronized data (`EnergyForecastCard.tsx:41,60-64,84-88`). Flat demo rate and exclusions are already disclosed.
- **Impact/reason:** imputed quantities can look like meter actuals or a utility bill.
- **Proposal:** retain existing disclaimer and distinguish observed fixture readings, baseline-filled days, month-end projection, floor date alignment and illustrative cost.
- **Acceptance:** card identifies source/meter dates, period, included floors, estimated contributions and exclusions; no imputed quantity labeled recorded actual; absent inputs yield unavailable.
- **Dependencies/risks:** product-approved explanation of baseline method, not tariff integration.
- **Future implementation note:** preserve monthly scope but explicitly explain independence from daily date filters.

### UX-011: Missing Environment Data Is Not Normal

- **Page/component:** Environment selectors, KPIs and room table. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** absent air-quality readings default to zero and normal (`environmentSelectors.ts:15-30`); this selector also ignores sensor status/age, so its path cannot distinguish offline/stale from valid current data. The page lacks a dedicated zero-row explanation. Room-panel labels claim 18-26C, 40-65% and PM2.5 <=25 (`RoomDetailDrawer.tsx:387-406`) while classifier configuration uses 18-27C, 30-70% and <=35 (`floor1Environment.mock.ts:3-12`).
- **Impact/reason:** unknown air quality can appear safe, distorting room exception counts and averages.
- **Proposal:** distinct unavailable/offline/stale/normal/exception presentations, one source for printed/classified operating and critical thresholds, explicit scope-wide summary versus filtered-room context, exclude unknowns from valid-reading denominators and explain empty room filters with scoped recovery.
- **Acceptance:** missing CO2/PM2.5 never renders healthy zero; counts disclose valid sample coverage and filtered context; no matching room provides reset; every threshold label matches the actual classifier; known threshold exceptions remain prioritized.
- **Dependencies/risks:** propagate nullable/availability semantics consistently in a later authorized phase.
- **Future implementation note:** use existing threshold definitions; do not invent regulatory compliance limits or sensor data.

### UX-012: Device Sample Coverage and Targeting

- **Page/component:** device counts/table and room drill-down. **Priority:** Medium. **Effort:** Medium.
- **Observed issue/evidence:** aggregate room totals and individually tracked records differ (`DevicesPage.tsx`, `deviceSelectors.ts`, README 152-156,173-178); context filters can leave no matching modeled record.
- **Impact/reason:** users may interpret a five-row filtered sample as the full 26-device inventory or a missing device as disconnected.
- **Proposal:** retain existing coverage notes but place aggregate/tracked denominators beside counts and filters; distinguish no match/unmodeled/offline and provide related targets only when supported.
- **Acceptance:** each KPI/filter count identifies its denominator; room/device links target matching modeled rows; aggregate-only records are not fabricated; scoped reset restores correct results.
- **Dependencies/risks:** known device-room-asset mapping and UX-024.
- **Future implementation note:** keep exact status filters; do not classify Warning as Online merely because connected.

### UX-013: Coherent Incident Triage and Feedback

- **Page/component:** Incidents, attention queue and header popover. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** unresolved already includes active+acknowledged (`alertSelectors.ts:6-17`); list sorts newest while popover has priority ranking (`IncidentsPopover.tsx:109-127`); local acknowledgement has limited explicit completion feedback.
- **Impact/reason:** different ordering obscures urgency; acknowledgement can be mistaken for resolution or durable remote processing.
- **Proposal:** shared explained ordering and lifecycle language; announce local acknowledgement, retain item in unresolved and show permission/recovery states without adding manual Resolve.
- **Acceptance:** Admin active -> acknowledged remains unresolved; Viewer cannot mutate; header/page counts agree within scope; resolved-by-simulation is distinct; repeat/failed actions do not erase work.
- **Dependencies/risks:** preserve existing lifecycle and product-approved priority definition.
- **Future implementation note:** reuse native links/buttons and UX-016 rather than adding another incident detail subsystem.

### UX-014: Result-aware Maintenance Recording

- **Page/component:** maintenance result form and state transitions. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** `AssetsPage.tsx:344-405` advances/reset linked state for failed/needs-monitoring as well as passed results; calendar save does not advance `nextMilestoneValue` (380-387; `maintenanceData.ts:275-282`).
- **Impact/reason:** failed work can look healthy; completed calendar work can remain due without an intelligible reason.
- **Proposal:** define result-aware progression/recovery and separate runtime/calendar cycles; retain unresolved attention after failure; explain whether/why next milestone advances.
- **Acceptance:** passed, failed and needs-monitoring have documented distinct outcomes; calendar/runtime next due is coherent; no failed outcome clears health warnings; invalid date/notes preserve input with a reason.
- **Dependencies/risks:** business approval for recurrence/result rules is required before implementation; no new resolution permission inferred.
- **Future implementation note:** test result-by-plan-type cases against all linked mock representations after future authorization.

### UX-015: One Maintenance Story Across Page and Drawer

- **Page/component:** asset details, maintenance plans/history. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** page updates component-local plans/history (`AssetsPage.tsx:60-66,330-414`), but drawer uses initial plans/hard-coded history (`assetDetailSelectors.ts:461-491`) and its maintenance tab describes saving as unavailable (`AssetDetailDrawer.tsx:699-750`). Leaving/remounting can discard page records while modified Twin device state remains. Displayed accumulated runtime is derived from current-cycle remaining hours and can decrease after reset (`maintenanceData.ts:340-343`, `AssetsPage.tsx:813-815`).
- **Impact/reason:** users cannot tell which history or due state reflects the record they just submitted.
- **Proposal:** consistent read model for identity/condition/plan/history, precise current-cycle versus lifetime runtime labels and honest component/session persistence copy; harmonize existing record entry points instead of adding new features.
- **Acceptance:** a recorded result appears consistently in page, detail, history and due summaries; navigation/remount does not leave contradictory device/history states; current-cycle runtime is not called lifetime accumulated usage; unavailable actions have one explanation; no fabricated staff/history entries.
- **Dependencies/risks:** UX-014 approved rules; current local state is not a durable backend.
- **Future implementation note:** source shared mock presentation from the same authorized state boundary.

### UX-016: Deliberate Overlay and Focus Behavior

- **Page/component:** floor/calendar pickers, incidents popover, room/asset panels, recording/reset dialogs, tabs/account menu and interactive lists/tables. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** recording modal declares modality without full focus lifecycle (`AssetsPage.tsx:1326-1504`); asset drawer has entry/Escape/return but lacks complete modal containment (`AssetDetailDrawer.tsx:79-98`); popover nests button inside role-button item (`IncidentsPopover.tsx:214-280`). Room focus effect depends on changing selected-room object (`Floor1MapPanel.tsx:147-157`).
- **Impact/reason:** keyboard users can lose context, trigger the wrong nested action or have active control focus interrupted during telemetry.
- **Proposal:** define modal vs nonmodal per surface; complete modal containment/return; stable nonmodal room focus; native sibling link/action/list/table semantics; keyboard-correct tabs, menus and calendar grids with appropriate focus/row structure.
- **Acceptance:** modal initial/trapped/restored focus and Escape work; nonmodal page remains accessible; three-second telemetry never steals room-control focus; acknowledgement never triggers row navigation; no inaccessible tab content.
- **Dependencies/risks:** browser/assistive-technology checks and explicit asset-drawer modality decision; current calendar grid lacks complete keyboard/row semantics (`OverviewDateFilter.tsx:224-301`) and some room/asset actions override list/table roles (`Floor1MapPanel.tsx:417-462`, `AssetExceptionTable.tsx:35-48`).
- **Future implementation note:** preserve existing mobile nav inert/trap and room focus entry/return rather than replacing them blindly.

### UX-017: Clear 3D Availability and Destination

- **Page/component:** 3D navigation, room references and Overview prototype CTA. **Priority:** Medium. **Effort:** Small.
- **Observed issue/evidence:** internal `ModulePlaceholderPage.tsx:32-38` is planned; Overview external link is a different destination (`DashboardPage.tsx:271-273`).
- **Impact/reason:** users expect integrated selected-room 3D when only a standalone external prototype exists.
- **Proposal:** label planned integration vs external prototype/new tab, provide scoped 2D return and avoid unsupported room-sync/control promises.
- **Acceptance:** every 3D affordance names availability/destination; external opening is announced; no claim that room/device state is passed to prototype; useful 2D recovery exists.
- **Dependencies/risks:** external destination outside audited repository; no availability guarantee.
- **Future implementation note:** no embed, 3D package, or model integration in this task.

### UX-018: Readable Operational Typography and Density

- **Page/component:** shell, KPIs, tables, labels, charts and panels. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** many desktop table/badge labels are 8-10px (`global.css:5507-5535,5544-5556`); mobile rules increase some text but not all surfaces. Actual visual acuity/zoom behavior was not measured.
- **Impact/reason:** small dense operational data increases reading effort and risk of misreading status/units.
- **Proposal:** proposed type/spacing scale, tabular figures, clear headings, sensible text measures and simplified hierarchy without decorative redesign.
- **Acceptance:** primary table data >=14px and support text >=12px in proposed system; essential labels do not truncate without access to full text; 200% zoom/400% reflow reviewed; no task requires tiny chart tooltip text.
- **Dependencies/risks:** layout changes may increase vertical height; UX-019 coordinates responsive presentation.
- **Future implementation note:** keep existing font stack and components; do not install fonts.

### UX-019: Responsive Tables, Touch, and Layout Consistency

- **Page/component:** all page grids, matrix/tables, map and actions. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** tables have 680/850px minimum widths (`global.css:5506-5507,5528`); mobile incident cards/44px actions already exist (5639-5688), but Analytics scroll wrapper lacks label/tab stop/hint (`AnalyticsPage.tsx:76-113`). Shell toggle is 34px (CSS 4441-4452).
- **Impact/reason:** horizontal exploration and small targets can hide task identity/actions; inconsistent breakpoints make tablet layouts unpredictable.
- **Proposal:** R grid contract, meaningful mobile summaries/card actions, labeled local scroll, retained row identity, touch target/spacing consistency and conditional sorting/pagination only when justified by actual data.
- **Acceptance:** at 320/390/768/850/1024/1440px and zoom, no unintended page-level overflow; chart/map/table scroll is local and indicated; all primary actions accessible by touch/keyboard; incident card parity retained.
- **Dependencies/risks:** real-device/browser review; CSS cascade has numerous overrides.
- **Future implementation note:** improve current CSS incrementally; no mobile-app or framework rewrite.

### UX-020: Semantic Tokens and Theme Contrast

- **Page/component:** light/dark surfaces, statuses, charts and focus. **Priority:** Medium. **Effort:** Medium.
- **Observed issue/evidence:** base tokens exist (`global.css:3-17`, `theme-light.css:1-25`) but many component colors are literal/overridden; severity, lifecycle and data provenance can visually compete. No measured contrast failure is asserted.
- **Impact/reason:** inconsistent colors and compositing make it harder to tell attention from missing/static/estimated data.
- **Proposal:** consolidate semantic roles using existing palette, separate provenance/lifecycle/health, standardize borders/radii/elevation/icons and verify contrast/focus in both themes.
- **Acceptance:** WCAG AA contrast targets measured for actual composites; states have text/icon/line-style equivalents; normal and acknowledged are not conflated; visible focus remains legible in both themes.
- **Dependencies/risks:** token migration can affect SVG/chart hard-coded styles; verify all component states.
- **Future implementation note:** no new theme library, gradient-led styling, or icon dependency.

### UX-021: Consistent Language and Recovery Copy

- **Page/component:** shell/login, Settings, placeholders, 404/denial, data notices. **Priority:** Medium. **Effort:** Small.
- **Observed issue/evidence:** document language is already Vietnamese; interface mixes Vietnamese with Sign out, English guard/placeholder/calendar text; NotFound and PhasePlaceholder retain Phase 0/Floor 1 claims (`NotFoundPage.tsx:5-9`, `PhasePlaceholder.tsx:31-40`). Login status says Platform Online without verified service connection (`LoginPage.tsx:129-135`). Some asset fixture narratives imply confirmed physical-meter/protocol/IR transmission/BMS relationships beyond verified integrations (`assetDetailSelectors.ts:229-236,332-423,508-563`).
- **Impact/reason:** inconsistent terminology and outdated capability claims confuse status and recovery.
- **Proposal:** Vietnamese-primary operational copy with deliberate technical terms, accurate demo/status wording and fixture-not-live relationship/command narratives, current 404/denial/planned explanations, and actionable destination labels.
- **Acceptance:** glossary aligns incident/lifecycle/health terms; no false platform connectivity/phase/floor claims; meaningful English phrases have language markup if retained; validation and recovery copy explain next step.
- **Dependencies/risks:** product terminology review; do not change `lang="vi"` as if absent.
- **Future implementation note:** no localization package required for copy consistency.

### UX-022: Consistent Data and Failure States

- **Page/component:** scoped monitoring, route errors and async-ready panels. **Priority:** Medium. **Effort:** Medium.
- **Observed issue/evidence:** pages predominantly read synchronous mock state; router has no product-specific `errorElement` (`router.tsx:19-79`); asset exception handling has some loading/error support, not a universal gap.
- **Impact/reason:** absent samples, unconfigured scope, invalid filters and real future transport errors need different recovery, not a generic empty card.
- **Proposal:** T state contract and a safe branded unexpected-error surface; retain useful existing asset states; add loaders/retry only when future actual async operations warrant them.
- **Acceptance:** each state has correct reason/action, no fake latency/retry, known values retained only with stale label, errors never expose stack/secrets, no success claim on failed local action.
- **Dependencies/risks:** future adapter semantics and error boundary coverage; do not introduce backend behavior now.
- **Future implementation note:** document deterministic state examples first; safe read-only review here does not validate network errors.

### UX-023: Keyboard Landmarks and Meaningful Announcements

- **Page/component:** global shell, route headings, status updates and chart/table alternatives. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** shell main ID exists without skip link (`DashboardLayout.tsx:227`); nested NotFound renders another main (`PhasePlaceholder.tsx:18`); telemetry updates frequently; Analytics table wrapper has no keyboard scroll affordance.
- **Impact/reason:** repeated navigation and unclear focus/landmark transitions make keyboard/screen-reader task completion harder.
- **Proposal:** skip-to-main, one main per rendered route, deliberate page-title focus after navigation, restrained live summaries, native semantics and non-visual chart/table equivalents.
- **Acceptance:** complete main journeys without pointer; route changes announce title/context once; telemetry does not flood announcements; all meanings available without color/hover; no nested main landmarks.
- **Dependencies/risks:** preserve mobile navigation focus controls and coordinate UX-016; assistive-technology verification required.
- **Future implementation note:** do not impose modal focus traps on docked room panels.

### UX-024: Validate and Recover Entity/Date URLs

- **Page/component:** scoped links, Devices/Assets/Environment filters and date workspace. **Priority:** Medium. **Effort:** Medium.
- **Observed issue/evidence:** invalid floor already has a banner/reset (`DashboardLayout.tsx:132-143,228-239`); entity/date query handling is distributed across detail pages/workspace rather than a single user-facing validation contract.
- **Impact/reason:** shared/stale links can show empty or partially matched content without explaining what was invalid.
- **Proposal:** consistent unknown/mismatched/unsupported target feedback; preserve valid scope and recover only invalid parameters; validate previous-page/credential return destinations.
- **Acceptance:** malformed floor, room/device/asset mismatch and unsupported date each have explicit recovery; clear-one-filter retains others; no silent cross-floor data substitution or external return redirect.
- **Dependencies/risks:** entity/date availability contracts; maintain existing valid floor persistence.
- **Future implementation note:** reuse current URL model, do not introduce route aliases or unsupported pages.

### UX-025: Explicit Simulation Scope and Role Changes

- **Page/component:** Settings, Overview simulator, shell role switch/freshness. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** simulation interval persists in layout (`DashboardLayout.tsx:67-71`); Settings inherits floor selector despite global controls (`ModulePageHeader.tsx:29-35`, `SettingsPage.tsx:45-50`); role switch does not itself stop telemetry (`DemoRoleSwitcher.tsx:19-22`). Return System To Normal resets conditions/alerts across both floors (`twinStore.ts:110-142,604-605`) despite Floor 1 control context and Floor 2 static-data messaging.
- **Impact/reason:** Viewer may observe ongoing changes and users on Floor 2 may think its static data is being controlled.
- **Proposal:** no floor selector on global Settings, explicit authorized effect scope for auto/scenarios/normalization/reset and cross-route running status, defined safe behavior when changing role with controls/dialogs open; keep Viewer unable to run privileged actions. Prefer limiting Floor 1 controls to Floor 1; if normalization remains global, disclose its Floor 2 mutation and obtain explicit confirmation instead of claiming unchanged static data.
- **Acceptance:** Floor 2 static samples are not silently normalized by a Floor-1-only-labeled action; every action's changed floors agree with its disclosure; Settings does not imply selected-floor commands; Viewer transition removes privileged actions without accidental submission and explains whether existing simulation continues.
- **Dependencies/risks:** product decision on continuing vs pausing existing demo simulation; no new authorization role.
- **Future implementation note:** preserve current interval cleanup on layout unmount; do not add background services.

### UX-026: Accurate Asset Condition in Detail

- **Page/component:** asset list-to-drawer status mapping/attention. **Priority:** High. **Effort:** Small.
- **Observed issue/evidence:** asset drawer preparation maps normal into warning (`AssetsPage.tsx:256-280`), which can lead to sensor-check attention (`assetDetailSelectors.ts:317-322`). Related historical/resolved alerts can be called open issues (`assetDetailSelectors.ts:426-429`, drawer overview). Due-plus-overdue KPI is labeled overdue (`maintenanceData.ts:402-409`, `AssetsPage.tsx:483-544`).
- **Impact/reason:** a healthy listed asset may appear to require intervention when opened, undermining priority triage.
- **Proposal:** preserve actual operational state and derive attention only from supported reasons; separate maintenance due/overdue, sensor offline, equipment health and unresolved/historical issues; match KPI names to counted lifecycle/due states.
- **Acceptance:** normal asset stays normal unless an evidenced exception applies; drawer/list/Overview exceptions explain the same condition; unknown status is unavailable, not automatic warning; resolved history is not called open work; overdue counts exclude merely due items or are renamed accurately.
- **Dependencies/risks:** fixture mappings and shared status vocabulary UX-020/UX-021.
- **Future implementation note:** small future mapping correction plus cross-view acceptance check; no invented telemetry.

### UX-027: Room UI-demo Controls and Persistence

- **Page/component:** room lighting/AC controls. **Priority:** High. **Effort:** Medium.
- **Observed issue/evidence:** local handlers are component state, available to both roles, disabled primarily for offline (`RoomDetailDrawer.tsx:267-274,302-344,531-685`); UI-demo disclaimer exists (531-535), but close/unmount discards settings; temperature/modes can remain enabled while power is off.
- **Impact/reason:** Viewer read-only expectations and apparent control persistence differ from actual effects; changing a local setpoint can be mistaken for saved operation.
- **Proposal:** retain clear local/no-hardware disclaimer, explicitly state reset-on-close, recommend Viewer read-only presentation under existing control-permission meaning, and define off/offline/range behavior for Admin preview.
- **Acceptance:** Viewer has no misleading actionable device controls; Admin preview is explicitly local/not saved, supported min/max/modes explained; close/reopen and power-off behavior match documented state; no equipment actuation claim.
- **Dependencies/risks:** product approval of local-preview role behavior; must not accidentally wire to hardware/backend.
- **Future implementation note:** distinguish these preview controls from current Twin Store simulation events and maintenance actions.

### UX-028: Capability Documentation and Review Evidence

- **Page/component:** README/demo guidance and future UX validation. **Priority:** Low. **Effort:** Small.
- **Observed issue/evidence:** historical docs mix Floor-1-only/1-of-5 coverage with newer 2-of-5 data and login assumptions; older wireframes mention proposed features not universally implemented.
- **Impact/reason:** reviewers may evaluate the wrong feature set or regard wireframes as shipped behavior.
- **Proposal:** in a separately approved documentation phase reconcile capability/role/source-date guidance, retain history with explicit supersession, and record browser/keyboard/contrast/user-task evidence before claiming validation.
- **Acceptance:** current vs historical vs proposed is explicit; credentials/private identities are not replicated; evidence names version/date/device and measured result; no claimed browser pass without execution.
- **Dependencies/risks:** concurrent development may change scope; historical approval is not authorization for new work.
- **Future implementation note:** this audit preserves existing docs; no source implementation, commit or publication is included.

## 8. Review Sequence and Validation Plan

1. Approve data semantics first: UX-005/UX-008/UX-010/UX-011/UX-014/UX-015/UX-026. Resolve maintenance recurrence/outcome rules before future implementation.
2. Approve access/scope/overlay contracts: UX-001/UX-002/UX-003/UX-006/UX-016/UX-024/UX-025/UX-027. Decide demo exit, asset-drawer modality and role-switch simulation behavior.
3. Review WF-01 through WF-15 and F01-F12 in `UIUX_USER_FLOWS.md`; then refine visual/responsive tokens and interaction copy, not before data meaning is trustworthy.
4. In a future authorized validation phase, use both roles, building/Floor 1/Floor 2/Floors 3-5, supported/unsupported dates, stale/unknown entity URLs, failed/passed/monitoring maintenance and offline/missing readings. Test Back/refresh, pointer/touch, keyboard-only, screen reader, contrast and the viewport/zoom matrix in UX-019.

Current deliverable checks are documentation-only: balanced fences, local links, diagram structural checks where possible, recommendation-ID parity, final-section completeness and protected-file fingerprints. Mermaid renderer availability and exact check results are recorded in the final report; a structural check is not rendered syntax or visual validation. No usability metrics or accessibility conformance certification is claimed.

### Documentation Check Results

- Read-only structural checks passed for three Markdown deliverables, 15 wireframes, 12 user-flow sections/diagrams and 28 backlog/final-note records. Required final-note fields, matching priorities/efforts, known recommendation references, balanced code fences, local deliverable links, Mermaid target declarations and node-delimiter balance were checked.
- All 28 backlog records include source evidence, user impact, proposal, priority, effort, dependencies/risks, acceptance criteria and future implementation notes. Documentation whitespace/final-newline checks passed.
- Neither `mermaid` nor `@mermaid-js/mermaid-cli` is installed. No package was installed. Full Mermaid parsing/rendering and visual flow readability in a renderer remain unverified; structural checks are not a substitute.
- Read-only before/after hashes matched for the same 151 protected tracked/non-ignored working files using the baseline in section 1. Git status showed only the three authorized new Markdown files added by this task; all original dirty entries remained.
- Repository-wide `git diff --check` reports pre-existing blank lines at EOF in existing application changes and line-ending warnings. Those application files were not modified to silence unrelated diagnostics. The three new deliverables passed their separate whitespace check.
- An independent read-only consistency review identified two wording/flow issues: an assetId URL filters the Assets page rather than auto-opening its drawer, and the unavailable mixed-date percentage KPI does not disable the reconstructed chart-comparison curve. Both descriptions were corrected; no application behavior was changed.

## 9. Figma Reconstruction Addendum — 2026-10-19

### Scope, evidence and current-version reconciliation

This pass follows the supplied reverse-engineering brief and is limited to building Overview, Floor 1 and Floor 2. The live repository is \D:\Khung_Wideframe; the synced ChatGPT project mirror is an incomplete read-only reference. The running page at http://localhost:5173/dashboard/overview was inspected through the connected browser, alongside route, layout, scope/date selectors, room drawer, SVG map geometry, fixture data, stores, CSS tokens and permissions. This is a design review, not a production-readiness certification.

While the design was being prepared, **17 protected files changed outside this task's writes** and the browser showed additional camera support. Those changes were preserved. The final source snapshot represented by the designs is dated **19/10/2026**: building coverage 2/5 floors; **48/52 devices online**, including **16 individual records + 36 room aggregates**; eight unresolved incidents; six configured camera fixtures of a twelve-camera building quota. Floor 1 has eight areas and 28/30 online including four cameras; Floor 2 has six areas, including Corridor 02, and 20/22 online including two cameras. These are fictional demo counts, not a verified real-building inventory. Source/static data and in-memory runtime state can differ during concurrent development.

Retain these already-present capabilities: both schematic maps; room directory; roomId/floorId deep links and invalid-room recovery; layer controls including cameras; zoom; separate device/environment context; dated Floor 2 fixtures; CO2 readings; current unresolved-incident queue; excluding unconfigured floors from aggregate operation totals. Do not report them as missing features. Today’s 125.6 kWh remains Floor-1-only; Floor 2 uses its 08/10/2026 static sample of 141.0 kWh. A current incident list is not a historical incident replay.

### Created Figma file and navigation

**ICS Digital Twin — UI/UX Reverse Engineering:** [Open editable file](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD). The connector confirmed successful creation and native-node editing.

The Starter workspace allows three pages. The six requested logical sections are therefore grouped as follows, without a plan upgrade:

| Figma page | Logical sections |
| --- | --- |
| 01 — Project Overview + Current UI Audit | Project Overview; Current UI Audit |
| 02 — Current Wireframes + User Flows | Current-State Wireframes; User Flows |
| 03 — Proposed Redesign + Design System | Proposed UX/UI Redesign; Design System |

| Frame | Direct reference |
| --- | --- |
| Project Overview + Current UI Audit | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=7-2) |
| Current UI / Overview desktop | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=7-39) |
| Current UI / Floor 1 room selected | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=7-221) |
| Current UI / Floor 2 room selected | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=7-497) |
| Current Wireframe / Overview desktop | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=13-250) |
| Current Wireframe / Floor 1 default | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=13-430) |
| Current Wireframe / Floor 2 default | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=13-712) |
| Current Wireframe / Floor 1 room detail | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=13-946) |
| Current Wireframe / Overview tablet 834 | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=13-1222) |
| Current Wireframe / Overview mobile 390 | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=13-1316) |
| Current Wireframe / Calendar | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=13-1417) |
| Current Wireframe / Mobile navigation expanded | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=13-1490) |
| Proposed / Overview decision first | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272) |
| Proposed / Floor 1 investigation | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455) |
| Proposed / Floor 2 static sample | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723) |
| Proposed / Overview mobile 390 | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-949) |
| Proposed / Overview tablet 834 | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-1022) |
| Proposed / Redesign backlog UX-029–UX-036 | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-1088) |
| Design System | [Open frame](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=6-148) |

Four native branching flow diagrams (Figma-F01–Figma-F04) are linked in UIUX_USER_FLOWS.md. They show actions, decisions, labeled yes/no branches and recovery. They are editable diagrams, not a running click-through prototype.

### Editability and design-system deliverables

- Native text, frames, auto-layout, rectangles, SVG vectors and component instances; no flattened full-screen image fills in the inspected deliverable frames.
- Twelve reusable main components: primary/secondary buttons; Normal/Warning/Critical/Offline/Static badges; KPI; alert card; metric row; Floor 1/Floor 2 schematic map. Map geometry and six camera positions/FOV are derived from the source fixtures. Camera FOV is schematic, not a calibrated security-coverage assessment.
- 103 local primitive/semantic/spacing/radius variables and fourteen ICS Inter text styles. Light, dark and low-fidelity values are represented as token families in a single collection mode, respecting Starter limits; they are not three verified theme-mode implementations.
- Current-state screens and wireframes are separate from frames prefixed **PROPOSED — NOT IMPLEMENTED**. Proposed screens preserve existing scope/data distinctions and are not changes to the running app.

### Scoped proposed backlog and acceptance

UX-029–UX-036 refine the historical register for these three views; they do not silently replace UX-001–UX-028. Overlapping historical proposals remain traceable. Prioritize shared thresholds (UX-036), source/time context (UX-029/UX-035), then supported date behavior (UX-032). Refine hierarchy, detail readability and responsive validation afterward. No new permissions, production backend, IoT transport or camera-stream service is implied.

#### UX-029 — Overview / floor scope and time context

- **Current issue:** Several cards use different time semantics: dated energy, current incidents and Floor 2 static fixtures. Existing labels help but are distributed.
- **Proposed change:** Group scope, source and as-of time into a short contextual strip; retain independent time labels on energy and current-state sections.
- **Reason:** Reduce accidental cross-date or cross-source comparisons.
- **Priority / effort:** High / Small.
- **Dependencies / risks:** Depends on existing date/scope selectors; avoid implying a shared timestamp.
- **Acceptance:** Building, Floor 1 and Floor 2 each disclose their source; selecting a historical energy date never relabels current incidents as historical.
- **Figma reference:** [Overview / floor scope and time context](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272).
- **Status:** Proposed — Not Implemented.

#### UX-030 — Floor 1 overview hierarchy / Admin simulation tools

- **Current issue:** The large Admin simulation panel precedes the main investigation content.
- **Proposed change:** Collapse the existing demo tools by default and prioritize KPI, map and unresolved exceptions; keep them available to the existing authorized role.
- **Reason:** Bring operational investigation earlier in the page.
- **Priority / effort:** Medium / Medium.
- **Dependencies / risks:** Preserve current role guards and existing simulation semantics; no extra permission or backend action.
- **Acceptance:** Admin can deliberately expand the same tools; Viewer remains read-only; maps and exceptions retain scope.
- **Figma reference:** [Floor 1 overview hierarchy / Admin simulation tools](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455).
- **Status:** Proposed — Not Implemented.

#### UX-031 — Room detail panel on both floors

- **Current issue:** Source, explanation, environment, connectivity and demo controls compete for attention in a long panel.
- **Proposed change:** Group measurements with configured thresholds and their source; shorten repeated explanations; keep device health separate from environment health and demote demo controls.
- **Reason:** Make it quicker to understand why a room needs attention.
- **Priority / effort:** Medium / Medium.
- **Dependencies / risks:** Keep roomId/floorId behavior and source disclosure. This supplements UX-011/UX-016/UX-027.
- **Acceptance:** Opening a room shows the correct entity, source, period and two independent health states; closing returns to its map/directory trigger.
- **Figma reference:** [Room detail panel on both floors](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723).
- **Status:** Proposed — Not Implemented.

#### UX-032 — Overview date picker and supported history

- **Current issue:** Current first-day selection applies immediately, with a later click extending a range; unsupported days and reconstructed demo periods need explicit interpretation.
- **Proposed change:** Clarify supported dates and no-data recovery. Consider a draft date selection with Apply/Cancel before committing a range.
- **Reason:** Make selection predictable without inventing historical telemetry.
- **Priority / effort:** High / Medium.
- **Dependencies / risks:** Apply/Cancel is an interaction proposal documented in Figma-F02; not a completed interactive prototype. Date selector and aggregation behavior must stay aligned.
- **Acceptance:** Unsupported periods show no data rather than zero; cancel keeps the previous committed selection; incident snapshots remain explicitly current.
- **Figma reference:** [Overview date picker and supported history](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=13-1417).
- **Status:** Proposed — Not Implemented.

#### UX-033 — Overview responsive layouts, map directory and keyboard access

- **Current issue:** Dense maps and long incident cards require a deliberate priority order at narrow widths; an image review does not validate keyboard or assistive-technology behavior.
- **Proposed change:** Prioritize actionable exceptions on small screens, keep a room directory as an equivalent map entry, and validate focus, touch, contrast and zoom.
- **Reason:** Support investigation without precise map pointing.
- **Priority / effort:** Medium / Medium.
- **Dependencies / risks:** Retain existing mobile navigation/drawer focus behavior. New keyboard/contrast checks require future runtime validation.
- **Acceptance:** At 390/834/1440 widths and 200% zoom, text/actions remain usable; room selection is possible without pointer precision; focus returns predictably.
- **Figma reference:** [Overview responsive layouts, map directory and keyboard access](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-949).
- **Status:** Proposed — Not Implemented.

#### UX-034 — Overview, map and room labels

- **Current issue:** Vietnamese and English operational labels are mixed; some names are entity identifiers and should remain stable.
- **Proposed change:** Use consistent Vietnamese interface labels for scope, status and actions while preserving device codes and proper room/entity names.
- **Reason:** Reduce interpretation effort without breaking references.
- **Priority / effort:** Low / Small.
- **Dependencies / risks:** Agree a small product glossary; preserve IDs and URLs.
- **Acceptance:** Equivalent controls use the same terms across Overview and both floors; codes and links remain stable.
- **Figma reference:** [Overview, map and room labels](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272).
- **Status:** Proposed — Not Implemented.

#### UX-035 — Fixture provenance, current readings and last-known values

- **Current issue:** Floor 2 static data, paused simulation and old readings can appear equally current. Camera fixtures additionally use live/static scene labels without proving an actual camera connection.
- **Proposed change:** Keep source and as-of context attached to values and camera context, distinguish unavailable/stale/paused states, and avoid claiming observed real telemetry or real video.
- **Reason:** Make evidence quality visible during investigation.
- **Priority / effort:** High / Medium.
- **Dependencies / risks:** Source freshness policy and shared selectors must be defined; no new history, hardware integration or video service is assumed.
- **Acceptance:** Floor 2 remains visibly dated 08/10/2026; paused/old data is not described as newly measured; fixture camera FOV does not imply calibrated coverage or a real stream.
- **Figma reference:** [Fixture provenance, current readings and last-known values](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723).
- **Status:** Proposed — Not Implemented.

#### UX-036 — RoomDetailDrawer thresholds

- **Current issue:** The drawer displays 18–26°C, 40–65% humidity and PM2.5 ≤25, while the shared configuration uses 18–27°C, 30–70% and PM2.5 ≤35.
- **Proposed change:** Read threshold labels from the same configuration used by the environment selectors; keep CO2 ≤1000 ppm aligned too.
- **Reason:** Prevent contradictory status interpretation within the same room.
- **Priority / effort:** High / Small.
- **Dependencies / risks:** Verified in src/components/floor/RoomDetailDrawer.tsx and src/data/mock/floor1Environment.mock.ts. Reuse existing configuration rather than invent a new operating policy.
- **Acceptance:** All displayed limits equal the values used to calculate status; a configuration change updates both status and labels; missing readings remain unknown.
- **Figma reference:** [RoomDetailDrawer thresholds](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455).
- **Status:** Proposed — Not Implemented.


### Verification and limitations of this pass

Native Figma creation, frame names, page grouping, reuse, Inter text, image-fill absence and representative rendered screenshots were checked. Three current desktop screens, eight low-fidelity states, five proposed desktop/responsive screens and four branching flows were created. Mobile/tablet frames are simplified structural studies focused on the primary investigation journey; they do not reproduce every lower-page card or every floor-specific responsive state. Calendar and expanded navigation are standalone studies. The proposed Apply/Cancel calendar interaction is described in Figma-F02/backlog, not delivered as a separate high-fidelity calendar modal.

The application was not instrumented with a Figma capture script because that would require editing a protected application file. Layouts are curated native reconstructions from source and observed UI, **not pixel-perfect automated captures**. Navigation icons and some details are simplified. Live animations, camera preview scenes, all layer/zoom combinations, dark-theme screens, complete tablet/mobile room detail, loading/network failures and every browser/role permutation are not reconstructed or certified. Camera positions, FOV and quota are included; a real stream and hardware state are not verified.

ACK, reset, simulation events and device demo controls were not exercised by this review. Keyboard/screen-reader behavior, measured contrast, real-device behavior, usability outcomes and production authorization remain future validation. Mermaid text is structurally checked; no Mermaid package was installed and renderer validation is not claimed. No app build, package install, source edit, commit or push was performed.

Initial protected hashes cover 152 existing tracked/non-ignored files excluding the two authorized Markdown deliverables. 17 changed during concurrent work, so an initial/final all-files-match claim would be false. A fresh pre-document fingerprint was taken after the observed updates; the final check compares against that snapshot. Only the two requested Markdown documents are written by this pass. Earlier section-8 hash results remain historical.

## Final Notes — Proposed Changes Only (Not Implemented)

This is the complete preserved recommendation register, UX-001 through UX-036. UX-001–UX-028 belong to the earlier source-only pass; UX-029–UX-036 belong to the scoped Figma follow-up. Each item is specified with evidence, dependencies, acceptance criteria and future implementation notes in section 7. Cross-cutting specifications and flow variants refine these IDs rather than introduce untracked recommendations. Existing historical documents remain preserved; already-implemented earlier ideas are acknowledged in section 1 and are not silently relabeled new work. No prior recommendation in these newly created deliverables has been removed or superseded.

### UX-001
- **ID:** UX-001
- **Page/Component:** Demo entry, Login, account menu.
- **Current issue:** Demo bypass auto-restores Admin after misleading Sign out.
- **Proposed change:** Explicit preview-mode entry/exit and separate credential-mode behavior.
- **Reason:** Honest access expectations and no false signed-out claim.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-002
- **ID:** UX-002
- **Page/Component:** Scoped links, Environment reset, incidents popover.
- **Current issue:** Clearing/navigating can discard valid floor/entity context.
- **Proposed change:** Preserve compatible scope and clear only intended filters.
- **Reason:** Investigations remain attached to the correct floor and entity.
- **Priority:** High.
- **Effort:** Small.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-003
- **ID:** UX-003
- **Page/Component:** Floor selector.
- **Current issue:** Hover/click and visual keyboard highlight semantics can conflict.
- **Proposed change:** One conforming native/listbox pattern with reliable touch and focus.
- **Reason:** Predictable scope selection for pointer and assistive technology.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-004
- **ID:** UX-004
- **Page/Component:** Unconfigured-floor recovery.
- **Current issue:** Overview label can lead only to current-module building scope.
- **Proposed change:** Match action labels to actual scope/route destinations.
- **Reason:** Clear recovery without unexpected navigation.
- **Priority:** Medium.
- **Effort:** Small.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-005
- **ID:** UX-005
- **Page/Component:** Analytics cards/matrix.
- **Current issue:** Connectivity/room state are overstated as uptime/compliance/correlation.
- **Proposed change:** Accurate names, definitions, denominators, dates and unavailable values.
- **Reason:** Prevent unsupported operational conclusions.
- **Priority:** High.
- **Effort:** Small.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-006
- **ID:** UX-006
- **Page/Component:** Settings/reset and permission feedback.
- **Current issue:** Immediate reset and overstated API enforcement/success styling.
- **Proposed change:** Confirm destructive reset and describe client-demo permissions honestly.
- **Reason:** Avoid accidental state loss and false security assurances.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-007
- **ID:** UX-007
- **Page/Component:** Building/floor Overview layout.
- **Current issue:** Competing panels can obscure primary investigation tasks.
- **Proposed change:** Coverage and unresolved work before map and supporting summaries.
- **Reason:** Clearer operational hierarchy and faster task discovery.
- **Priority:** Medium.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-008
- **ID:** UX-008
- **Page/Component:** Energy/Overview totals, date controls and history.
- **Current issue:** Mixed source dates and reconstructed history can look like current actuals.
- **Proposed change:** Same-period/scenario totals, source/date applicability, honest history and deliberate date Apply/Cancel/handoff.
- **Reason:** Comparable cross-page energy decisions without fabricated observations.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-009
- **ID:** UX-009
- **Page/Component:** Energy chart and threshold/waste interpretation.
- **Current issue:** Cumulative/interval meaning and tooltip-only exploration risk ambiguity.
- **Proposed change:** Explicit units/date/coverage/cutoff, modeled comparison-curve labels and text/data alternatives.
- **Reason:** Understandable and accessible energy interpretation.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-010
- **ID:** UX-010
- **Page/Component:** Monthly energy/cost forecast.
- **Current issue:** Baseline-filled values can be described as synchronized recorded actuals.
- **Proposed change:** Separate recorded, imputed and projected values with period/method notes.
- **Reason:** Honest illustrative estimates, not apparent utility bills.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-011
- **ID:** UX-011
- **Page/Component:** Environment readings and empty states.
- **Current issue:** Missing air-quality records default to healthy zero/normal.
- **Proposed change:** Availability-aware metrics, consistent threshold definitions, denominators and scoped empty recovery.
- **Reason:** Unknown environmental conditions must not appear safe.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-012
- **ID:** UX-012
- **Page/Component:** Devices and contextual room/device links.
- **Current issue:** Aggregate totals and modeled-record samples can be misread as equivalent.
- **Proposed change:** Nearby denominator/coverage labels and distinct unmodeled/no-match states.
- **Reason:** Accurate inventory interpretation and reliable drill-down.
- **Priority:** Medium.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-013
- **ID:** UX-013
- **Page/Component:** Incidents, attention queue and header preview.
- **Current issue:** Ordering/feedback differs and acknowledgement can imply resolution.
- **Proposed change:** Explained consistent triage and local lifecycle feedback without manual Resolve.
- **Reason:** Maintain visibility of unresolved work and clear role boundaries.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-014
- **ID:** UX-014
- **Page/Component:** Maintenance recording and recurrence.
- **Current issue:** Failed outcomes can reset health; calendar milestones can remain unchanged.
- **Proposed change:** Approved result-aware transitions and calendar/runtime progression.
- **Reason:** Reliable maintenance follow-up rather than misleading completion.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-015
- **ID:** UX-015
- **Page/Component:** Assets page/drawer/history/plan projections.
- **Current issue:** Page records and drawer initial/hard-coded data can disagree.
- **Proposed change:** Coherent read model, cycle/lifetime runtime labels and honest navigation/session persistence semantics.
- **Reason:** Trustworthy maintenance history and next-due information.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-016
- **ID:** UX-016
- **Page/Component:** Dialogs, drawers, calendars, menus, tabs and interactive list/table actions.
- **Current issue:** Incomplete modality/focus behavior, nested actions and telemetry refocusing.
- **Proposed change:** Modal/nonmodal contracts, native actions, complete calendar/tab semantics and stable focus.
- **Reason:** Predictable keyboard operation without lost context.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-017
- **ID:** UX-017
- **Page/Component:** Internal 3D placeholder and external prototype links.
- **Current issue:** Different destinations can imply integrated room-aware 3D.
- **Proposed change:** Planned/external/new-tab labels and scoped 2D recovery.
- **Reason:** Realistic availability expectations and no dead-end journey.
- **Priority:** Medium.
- **Effort:** Small.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-018
- **ID:** UX-018
- **Page/Component:** Global typography, spacing and hierarchy.
- **Current issue:** Dense 8-10px data labels compromise readability.
- **Proposed change:** Readable type/spacing scale, tabular figures and bounded prose.
- **Reason:** Easier scanning and fewer operational reading errors.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-019
- **ID:** UX-019
- **Page/Component:** Responsive grids, tables, maps, touch actions and data navigation.
- **Current issue:** Wide tables and inconsistent targets/scroll cues create mobile/tablet friction.
- **Proposed change:** Defined breakpoints, mobile task parity, labeled local scroll and justified sorting/pagination.
- **Reason:** Usable desktop, tablet and mobile without hidden actions.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-020
- **ID:** UX-020
- **Page/Component:** Light/dark tokens, statuses, charts, icons and elevation.
- **Current issue:** Literal overrides and competing state semantics reduce consistency.
- **Proposed change:** Semantic tokens and verified contrast with non-color meaning.
- **Reason:** Legible, consistent health/lifecycle/provenance distinctions.
- **Priority:** Medium.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-021
- **ID:** UX-021
- **Page/Component:** Operational language, login/status and recovery copy.
- **Current issue:** Mixed language and unsupported phase/floor/connectivity/physical-integration claims.
- **Proposed change:** Vietnamese-primary glossary and honest current/demo/fixture narratives and recovery copy.
- **Reason:** Better comprehension and fewer false capability assumptions.
- **Priority:** Medium.
- **Effort:** Small.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-022
- **ID:** UX-022
- **Page/Component:** Data/loading/empty/error/success states and route exceptions.
- **Current issue:** Different failure/absence states lack one consistent user-facing contract.
- **Proposed change:** Distinct state/recovery patterns and safe error surface without fake async behavior.
- **Reason:** Clear system feedback and recoverable failures.
- **Priority:** Medium.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-023
- **ID:** UX-023
- **Page/Component:** Landmarks, route focus, live regions and data alternatives.
- **Current issue:** Missing skip link, nested main risk and unclear announcement strategy.
- **Proposed change:** One main, skip navigation, intentional title focus and restrained accessible feedback.
- **Reason:** Efficient keyboard/screen-reader journeys.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-024
- **ID:** UX-024
- **Page/Component:** Entity/date URLs and return destinations.
- **Current issue:** Distributed parameter handling can leave stale/mismatched context unexplained.
- **Proposed change:** Consistent validation, scoped reset and permitted internal returns.
- **Reason:** Shareable, recoverable journeys without silent data substitution.
- **Priority:** Medium.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-025
- **ID:** UX-025
- **Page/Component:** Global simulation, Settings scope and demo role switch.
- **Current issue:** Floor 1-context normalization changes Floor 2; role/global control scope is unclear.
- **Proposed change:** Scope-safe or explicitly confirmed global effects, no Settings floor picker and safe role changes.
- **Reason:** Clear ownership, permission and data-source expectations.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-026
- **ID:** UX-026
- **Page/Component:** Asset list/board/drawer condition mapping.
- **Current issue:** Artificial warnings, historical-as-open issues and due-as-overdue counts mislead triage.
- **Proposed change:** Accurate condition/reason, unresolved/history and due/overdue mappings across views.
- **Reason:** Consistent and credible asset triage.
- **Priority:** High.
- **Effort:** Small.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-027
- **ID:** UX-027
- **Page/Component:** Room lighting/AC UI-demo controls.
- **Current issue:** Both roles can change ephemeral local controls with ambiguous persistence/off behavior.
- **Proposed change:** Explicit local/reset-on-close semantics, Viewer read-only recommendation and defined Admin preview states.
- **Reason:** Avoid apparent saved/device operations and permission confusion.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-028
- **ID:** UX-028
- **Page/Component:** Capability documentation and later review evidence.
- **Current issue:** Historical guidance conflicts with current coverage/access and implementation status.
- **Proposed change:** Authorized reconciliation with preserved history and versioned validation evidence.
- **Reason:** Review the actual product without claiming unperformed validation.
- **Priority:** Low.
- **Effort:** Small.
- **Figma reference:** Historical cross-module proposal; scope and evidence remain in sections 1–8. Related scoped designs: [Overview](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272), [Floor 1](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455), [Floor 2](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723). Modules outside these views are not reconstructed in this file.
- **Status:** Proposed — Not Implemented.

### UX-029
- **ID:** UX-029
- **Page/Component:** Overview / floor scope and time context.
- **Current issue:** Several cards use different time semantics: dated energy, current incidents and Floor 2 static fixtures. Existing labels help but are distributed.
- **Proposed change:** Group scope, source and as-of time into a short contextual strip; retain independent time labels on energy and current-state sections.
- **Reason:** Reduce accidental cross-date or cross-source comparisons.
- **Priority:** High.
- **Effort:** Small.
- **Figma reference:** [Overview / floor scope and time context](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272); page 03, PROPOSED — NOT IMPLEMENTED.
- **Status:** Proposed — Not Implemented.

### UX-030
- **ID:** UX-030
- **Page/Component:** Floor 1 overview hierarchy / Admin simulation tools.
- **Current issue:** The large Admin simulation panel precedes the main investigation content.
- **Proposed change:** Collapse the existing demo tools by default and prioritize KPI, map and unresolved exceptions; keep them available to the existing authorized role.
- **Reason:** Bring operational investigation earlier in the page.
- **Priority:** Medium.
- **Effort:** Medium.
- **Figma reference:** [Floor 1 overview hierarchy / Admin simulation tools](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455); page 03, PROPOSED — NOT IMPLEMENTED.
- **Status:** Proposed — Not Implemented.

### UX-031
- **ID:** UX-031
- **Page/Component:** Room detail panel on both floors.
- **Current issue:** Source, explanation, environment, connectivity and demo controls compete for attention in a long panel.
- **Proposed change:** Group measurements with configured thresholds and their source; shorten repeated explanations; keep device health separate from environment health and demote demo controls.
- **Reason:** Make it quicker to understand why a room needs attention.
- **Priority:** Medium.
- **Effort:** Medium.
- **Figma reference:** [Room detail panel on both floors](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723); page 03, PROPOSED — NOT IMPLEMENTED.
- **Status:** Proposed — Not Implemented.

### UX-032
- **ID:** UX-032
- **Page/Component:** Overview date picker and supported history.
- **Current issue:** Current first-day selection applies immediately, with a later click extending a range; unsupported days and reconstructed demo periods need explicit interpretation.
- **Proposed change:** Clarify supported dates and no-data recovery. Consider a draft date selection with Apply/Cancel before committing a range.
- **Reason:** Make selection predictable without inventing historical telemetry.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** [Overview date picker and supported history](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=13-1417); page 02, current calendar plus proposed interaction in Figma-F02.
- **Status:** Proposed — Not Implemented.

### UX-033
- **ID:** UX-033
- **Page/Component:** Overview responsive layouts, map directory and keyboard access.
- **Current issue:** Dense maps and long incident cards require a deliberate priority order at narrow widths; an image review does not validate keyboard or assistive-technology behavior.
- **Proposed change:** Prioritize actionable exceptions on small screens, keep a room directory as an equivalent map entry, and validate focus, touch, contrast and zoom.
- **Reason:** Support investigation without precise map pointing.
- **Priority:** Medium.
- **Effort:** Medium.
- **Figma reference:** [Overview responsive layouts, map directory and keyboard access](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-949); page 03, PROPOSED — NOT IMPLEMENTED.
- **Status:** Proposed — Not Implemented.

### UX-034
- **ID:** UX-034
- **Page/Component:** Overview, map and room labels.
- **Current issue:** Vietnamese and English operational labels are mixed; some names are entity identifiers and should remain stable.
- **Proposed change:** Use consistent Vietnamese interface labels for scope, status and actions while preserving device codes and proper room/entity names.
- **Reason:** Reduce interpretation effort without breaking references.
- **Priority:** Low.
- **Effort:** Small.
- **Figma reference:** [Overview, map and room labels](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-272); page 03, PROPOSED — NOT IMPLEMENTED.
- **Status:** Proposed — Not Implemented.

### UX-035
- **ID:** UX-035
- **Page/Component:** Fixture provenance, current readings and last-known values.
- **Current issue:** Floor 2 static data, paused simulation and old readings can appear equally current. Camera fixtures additionally use live/static scene labels without proving an actual camera connection.
- **Proposed change:** Keep source and as-of context attached to values and camera context, distinguish unavailable/stale/paused states, and avoid claiming observed real telemetry or real video.
- **Reason:** Make evidence quality visible during investigation.
- **Priority:** High.
- **Effort:** Medium.
- **Figma reference:** [Fixture provenance, current readings and last-known values](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-723); page 03, PROPOSED — NOT IMPLEMENTED.
- **Status:** Proposed — Not Implemented.

### UX-036
- **ID:** UX-036
- **Page/Component:** RoomDetailDrawer thresholds.
- **Current issue:** The drawer displays 18–26°C, 40–65% humidity and PM2.5 ≤25, while the shared configuration uses 18–27°C, 30–70% and PM2.5 ≤35.
- **Proposed change:** Read threshold labels from the same configuration used by the environment selectors; keep CO2 ≤1000 ppm aligned too.
- **Reason:** Prevent contradictory status interpretation within the same room.
- **Priority:** High.
- **Effort:** Small.
- **Figma reference:** [RoomDetailDrawer thresholds](https://www.figma.com/design/uXR8OCbVLsUSUpYAf7rggD?node-id=14-455); page 03, PROPOSED — NOT IMPLEMENTED.
- **Status:** Proposed — Not Implemented.
