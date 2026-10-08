# ICS Digital Twin — Master Prompt

You are working on the "ICS Digital Twin" project.

## Project context

- Product: ICS Digital Twin Platform.
- Current POC: ICS Headquarters, Floor 1 ONLY.
- Do NOT build monitoring for Floors 2–5 yet.
- Architecture must be scalable for future floors.
- Primary user experience: management-level 2D dashboard.
- 3D Digital Twin is a separate module and will be integrated later.
- Current hierarchy:

  ```text
  Building
  → Floor
  → Room / Area
  → Asset
  → Sensor
  ```

## Core product principles

- This is not a generic admin dashboard.
- The UI should feel like a modern technology / Digital Twin command center.
- Use a dark enterprise technology visual direction.
- High contrast typography.
- Avoid text that is too dim or low-contrast.
- Use cyan / electric blue as primary technology accents.
- Use green, amber, red and gray for operational status.
- Management users should understand system health within 10–20 seconds.
- Progressive disclosure: Overview → Area → Room → Asset / Device.
- Do not force managers to inspect individual sensors from the overview.

## Tech stack

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Lucide React
- Recharts
- Zustand
- SVG for Floor 1 2D visualization

## Development principles

- Use reusable components.
- Use strict TypeScript.
- Keep mock data separated from UI.
- Keep business logic separated from components.
- Prepare the architecture for replacing mock data with APIs/WebSocket later.
- Do not put the whole application inside App.tsx.
- Do not unnecessarily rewrite working code from previous phases.
- Before modifying the project, inspect the existing implementation first.
- Maintain responsive behavior, but desktop 1440px is the primary target.

## Important

Always distinguish:

**PLAN != ACTUALLY IMPLEMENTED.**

At the end of your work:

1. State exactly what files were created or modified.
2. State what is actually working.
3. State what remains mocked.
4. State anything intentionally deferred to later phases.
5. Do not claim functionality that has not been implemented.

Do NOT proceed to future phases unless explicitly requested.
