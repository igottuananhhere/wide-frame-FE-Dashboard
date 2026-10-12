export type DashboardTheme = "dark" | "light";

export const DASHBOARD_THEME_STORAGE_KEY = "ics-digital-twin-theme";

export function readDashboardTheme(): DashboardTheme {
  try {
    return window.localStorage.getItem(DASHBOARD_THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function persistDashboardTheme(theme: DashboardTheme): void {
  try {
    window.localStorage.setItem(DASHBOARD_THEME_STORAGE_KEY, theme);
  } catch {
    // Keep the theme usable when browser storage is disabled.
  }
}
