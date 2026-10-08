# Building Overview and Monthly Energy Forecast

## Approved scope

The authenticated dashboard opens at **ICS Headquarters · Toàn tòa nhà**. The location selector offers Toàn tòa nhà and Floor 1 through Floor 5. Floor 1 is the only floor with mock operational data. Floors 2–5 appear as selectable locations marked **Chưa có dữ liệu** and must not display invented live readings.

## Building overview

- Keep the current Floor 1 overview and SVG map intact when Floor 1 is selected.
- Add a building-level overview as the default selection, with a five-floor directory and building coverage of **1/5 tầng có dữ liệu**.
- Building totals must be labeled as values currently reported by Floor 1; do not imply they cover all five floors.
- Selecting the Floor 1 directory entry switches the shared location selector to Floor 1 and reveals the existing Floor 1 overview.
- Selecting Floors 2–5 shows an explicit no-data state with the floor name and the explanation that monitoring for that floor has not been configured.
- The selector state is shared through DashboardLayout outlet context so the header, Overview, and detail routes stay consistent.
- When a detail route is viewed in Toàn tòa nhà scope, show a clear coverage note: data currently includes Floor 1 only. When a no-data floor is selected, show the no-data state instead of Floor 1 values.

## Monthly energy forecast

Add a prominent forecast card to the Energy page, below its four existing summary cards. It shows forecasted electricity cost for the current mock billing period; previous month's recorded demo cost and kWh; difference in VND and percentage with higher/lower wording; meter ID and reading date; and a visible ƯỚC TÍNH DEMO label with mock average unit rate.

Calculation:
1. Adjust mock month-to-date kWh by the change in today's Floor 1 energy since the seeded baseline.
2. Project month-end kWh as `monthToDateKwh / elapsedDays * daysInBillingPeriod`.
3. Project cost using a configurable mock average price per kWh.
4. Compare the result to the previous month's mock actual cost.

Seed for the first demo: meter METER-01, mock read date 2026-10-08, 982.4 kWh through day 8 of a 31-day period, 125.6 kWh baseline for today, average rate 2,500 VND/kWh, and previous month 4,050 kWh / 10,125,000 VND. The forecast is approximately 3,806.8 kWh / 9,517,000 VND, about 6% below the previous month's demo amount. The card explains that the rate is a flat mock average and excludes real tariff tiers, taxes, and adjustments.

## Data and boundaries

- Keep floor availability and meter forecast fixtures outside presentation components.
- Add a small pure forecast selector with typed inputs and output.
- No real meter, utility tariff, API, billing system, or WebSocket is integrated.
- Keep the active operational POC limited to Floor 1; Floors 2–5 are visible only as no-data locations.

## Acceptance criteria

- Dashboard opens in Toàn tòa nhà scope and clearly reports data coverage as 1/5 floors.
- Header selector offers Toàn tòa nhà and Tầng 1–5.
- Floor 1 opens the existing Floor 1 management overview; Floors 2–5 never show Floor 1's values as if they belonged to those floors.
- Detail pages show partial coverage in building scope and no-data state for unconfigured floors.
- Energy page has a separate forecast card with meter, period, forecast, last-month comparison, and mock-rate disclosure.
- Forecast value responds to the shared Floor 1 energy simulation.
- TypeScript build and lint pass.