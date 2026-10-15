import type { DashboardTheme } from "./themePreferences";

export interface ThemeTokenPalette {
  sidebarBg: string;
  sidebarBorder: string;
  sidebarText: string;
  sidebarTextMuted: string;
  sidebarHoverBg: string;
  sidebarHoverText: string;
  sidebarActiveBg: string;
  sidebarActiveBorder: string;
  sidebarActiveText: string;
  sidebarActiveIcon: string;
  sidebarActiveMarker: string;
  sidebarBadgeBg: string;
  sidebarBadgeText: string;
  sidebarBadgeCriticalBg: string;
  sidebarBadgeCriticalText: string;
  sidebarFocusRing: string;
  surfaceBg: string;
  backgroundBg: string;
}

export const SIDEBAR_LAYOUT_TOKENS = {
  expandedWidth: "304px",
  collapsedWidth: "72px",
  mobileMaxWidth: "304px",
  transitionDuration: "250ms",
  transitionEasing: "ease-in-out",
} as const;

export const THEME_TOKENS: Record<DashboardTheme, ThemeTokenPalette> = {
  dark: {
    sidebarBg: "#091721",
    sidebarBorder: "#263a4a",
    sidebarText: "#c3d0da",
    sidebarTextMuted: "#93a8b8",
    sidebarHoverBg: "#102431",
    sidebarHoverText: "#f5f8fb",
    sidebarActiveBg: "linear-gradient(90deg, rgba(34, 211, 238, 0.16), rgba(34, 211, 238, 0.04))",
    sidebarActiveBorder: "rgba(34, 211, 238, 0.22)",
    sidebarActiveText: "#b9f3fb",
    sidebarActiveIcon: "#5be2f3",
    sidebarActiveMarker: "#39dced",
    sidebarBadgeBg: "#4c3617",
    sidebarBadgeText: "#ffd083",
    sidebarBadgeCriticalBg: "rgba(239, 68, 68, 0.22)",
    sidebarBadgeCriticalText: "#fca5a5",
    sidebarFocusRing: "#22d3ee",
    surfaceBg: "#0c1b29",
    backgroundBg: "#07111a",
  },
  light: {
    sidebarBg: "#ffffff",
    sidebarBorder: "#c8d4db",
    sidebarText: "#405563",
    sidebarTextMuted: "#607581",
    sidebarHoverBg: "#edf4f6",
    sidebarHoverText: "#172630",
    sidebarActiveBg: "#e6f3f6",
    sidebarActiveBorder: "#b6dbe3",
    sidebarActiveText: "#075f70",
    sidebarActiveIcon: "#087f93",
    sidebarActiveMarker: "#087f93",
    sidebarBadgeBg: "#fff0d2",
    sidebarBadgeText: "#805000",
    sidebarBadgeCriticalBg: "#fee2e2",
    sidebarBadgeCriticalText: "#991b1b",
    sidebarFocusRing: "#087f93",
    surfaceBg: "#ffffff",
    backgroundBg: "#f2f6f8",
  },
};

export function getThemeTokens(theme: DashboardTheme): ThemeTokenPalette {
  return THEME_TOKENS[theme];
}

