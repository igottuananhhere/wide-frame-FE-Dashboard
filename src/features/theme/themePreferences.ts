export type DashboardTheme = "dark" | "light";

export const DASHBOARD_THEME_STORAGE_KEY = "ics-digital-twin-theme";
export const SIDEBAR_COLLAPSED_STORAGE_KEY = "ics-digital-twin-sidebar-collapsed";
export const SIDEBAR_PINNED_STORAGE_KEY = "ics-digital-twin-sidebar-pinned";

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

export function readSidebarPinned(): boolean {
  try {
    const pinned = window.sessionStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY);
    if (pinned !== null) return pinned === "true";
    const collapsed = window.sessionStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (collapsed !== null) return collapsed === "false";
    return false;
  } catch {
    return false;
  }
}

export function persistSidebarPinned(pinned: boolean): void {
  try {
    window.sessionStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, String(pinned));
    window.sessionStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(!pinned));
  } catch {
    // Keep the sidebar usable when browser storage is disabled.
  }
}

export function readSidebarCollapsed(): boolean {
  return !readSidebarPinned();
}

export function persistSidebarCollapsed(collapsed: boolean): void {
  persistSidebarPinned(!collapsed);
}
