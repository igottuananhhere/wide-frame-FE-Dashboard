import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import { useAuthStore } from "../../features/auth/authStore";
import { useLoginTransitionStore } from "../../features/auth/loginTransitionStore";
import { authorizeAction, canManageSettings } from "../../features/auth/permissions";
import {
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  SIDEBAR_PINNED_STORAGE_KEY,
} from "../../features/theme/themePreferences";
import { getThemeTokens, SIDEBAR_LAYOUT_TOKENS } from "../../features/theme/themeTokens";
import { useTwinStore } from "../../features/twin/twinStore";
import { getNavigationGroupsForRole } from "./navigationConfig";

beforeEach(async () => {
  sessionStorage.clear();
  localStorage.clear();
  useAuthStore.setState({
    user: { username: "admin", displayName: "ICS Platform Administrator", role: "Admin" },
    role: "Admin",
    isAuthenticated: true,
  });
  useLoginTransitionStore.setState({ isTransitioning: false });
  useTwinStore.getState().resetSimulation();
  await act(async () => {
    await router.navigate("/dashboard/overview");
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  useLoginTransitionStore.setState({ isTransitioning: false });
  useTwinStore.getState().resetSimulation();
});

describe("Sidebar navigation, hover-to-expand, pin/unpin, alert badge, and RBAC enforcement", () => {
  it("provides separated navigation config and theme tokens for 72px collapsed / 304px expanded / 250ms transition", () => {
    const adminGroups = getNavigationGroupsForRole("Admin");
    const adminIds = adminGroups.flatMap((group) => group.items.map((item) => item.id));
    expect(adminIds).toEqual([
      "overview",
      "energy",
      "environment",
      "analytics",
      "iot-devices",
      "alerts",
      "assets",
      "settings",
    ]);

    const viewerGroups = getNavigationGroupsForRole("Viewer");
    const viewerIds = viewerGroups.flatMap((group) => group.items.map((item) => item.id));
    expect(viewerIds).not.toContain("settings");
    expect(viewerIds).not.toContain("digital-twin-3d");
    expect(viewerIds.at(-1)).toBe("assets");

    expect(SIDEBAR_LAYOUT_TOKENS.expandedWidth).toBe("304px");
    expect(SIDEBAR_LAYOUT_TOKENS.collapsedWidth).toBe("72px");
    expect(SIDEBAR_LAYOUT_TOKENS.transitionDuration).toBe("250ms");
    expect(SIDEBAR_LAYOUT_TOKENS.transitionEasing).toBe("ease-in-out");
    expect(getThemeTokens("dark").sidebarBg).toBe("#091721");
    expect(getThemeTokens("light").sidebarBg).toBe("#ffffff");
  });

  it("renders navigation items for Overview, Energy, Environment, Analytics, IoT Devices, Alerts, Assets, and Settings with 3D hidden", async () => {
    render(<App />);

    const nav = screen.getByRole("navigation", { name: "Dashboard navigation" });
    expect(within(nav).getByRole("link", { name: "Tổng quan" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByText("Overview")).toBeTruthy();
    expect(within(nav).getByText("Analytics")).toBeTruthy();
    expect(within(nav).getByText("IoT Devices")).toBeTruthy();
    expect(within(nav).getByText("Alerts")).toBeTruthy();
    expect(within(nav).getByText("Assets")).toBeTruthy();
    expect(within(nav).getByText("Settings")).toBeTruthy();
    expect(within(nav).queryByText("Digital Twin 3D")).toBeNull();

    fireEvent.click(within(nav).getByRole("link", { name: "Phân tích" }));
    expect(await screen.findByRole("heading", { name: /phân tích vận hành/i })).toBeTruthy();
    expect(within(nav).getByRole("link", { name: "Phân tích" }).getAttribute("aria-current")).toBe("page");
  });

  it("displays live alert count badge on Alerts item for the Floor 1 demo scope and updates when new incidents occur", () => {
    render(<App />);

    const badge = screen.getByTestId("sidebar-alert-badge");
    expect(badge.textContent).toBe("4");

    act(() => {
      useTwinStore.getState().simulateScenario("server-temperature-high");
    });

    expect(screen.getByTestId("sidebar-alert-badge").textContent).toBe("5");
    expect(screen.getByTestId("sidebar-alert-badge").className).toContain("navigation-link-badge--critical");
  });

  it("starts collapsed by default, expands on mouse hover, and collapses when mouse leaves", () => {
    render(<App />);

    const sidebar = screen.getByLabelText("Application sidebar");
    expect(sidebar.getAttribute("data-collapsed")).toBe("true");
    expect(sidebar.getAttribute("data-expanded")).toBe("false");
    expect(sidebar.getAttribute("data-pinned")).toBe("false");
    expect(sidebar.getAttribute("data-hovered")).toBe("false");
    expect(sidebar.className).toContain("dashboard-sidebar--collapsed");

    fireEvent.mouseEnter(sidebar);
    expect(sidebar.getAttribute("data-collapsed")).toBe("false");
    expect(sidebar.getAttribute("data-expanded")).toBe("true");
    expect(sidebar.getAttribute("data-hovered")).toBe("true");
    expect(sidebar.className).toContain("dashboard-sidebar--expanded");
    expect(sidebar.className).toContain("dashboard-sidebar--hovered");
    expect(within(sidebar).getByText("ACTIVE SCOPE")).toBeTruthy();
    expect(within(sidebar).getByText("Toàn tòa nhà")).toBeTruthy();

    fireEvent.mouseLeave(sidebar);
    expect(sidebar.getAttribute("data-collapsed")).toBe("true");
    expect(sidebar.getAttribute("data-expanded")).toBe("false");
    expect(sidebar.getAttribute("data-hovered")).toBe("false");
    expect(sidebar.className).toContain("dashboard-sidebar--collapsed");
  });

  it("supports pinning/unpinning via the arrow button and stays expanded on mouse leave when pinned", () => {
    render(<App />);

    const sidebar = screen.getByLabelText("Application sidebar");
    fireEvent.mouseEnter(sidebar);

    const pinButton = screen.getByRole("button", { name: /pin and expand sidebar/i });
    expect(pinButton.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(pinButton);

    expect(sidebar.getAttribute("data-pinned")).toBe("true");
    expect(sidebar.getAttribute("data-collapsed")).toBe("false");
    expect(sidebar.className).toContain("dashboard-sidebar--pinned");
    expect(sessionStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY)).toBe("true");
    expect(sessionStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("false");

    fireEvent.mouseLeave(sidebar);
    expect(sidebar.getAttribute("data-hovered")).toBe("false");
    expect(sidebar.getAttribute("data-pinned")).toBe("true");
    expect(sidebar.getAttribute("data-collapsed")).toBe("false");
    expect(sidebar.className).toContain("dashboard-sidebar--expanded");

    const unpinButton = screen.getByRole("button", { name: /unpin and collapse sidebar/i });
    expect(unpinButton.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(unpinButton);

    expect(sidebar.getAttribute("data-pinned")).toBe("false");
    expect(sidebar.getAttribute("data-collapsed")).toBe("true");
    expect(sidebar.className).toContain("dashboard-sidebar--collapsed");
    expect(sessionStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY)).toBe("false");
    expect(sessionStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("true");
  });

  it("allows touch devices without hover to open and close the sidebar via the toggle button", () => {
    render(<App />);

    const sidebar = screen.getByLabelText("Application sidebar");
    fireEvent.pointerDown(sidebar, { pointerType: "touch" });
    fireEvent.mouseEnter(sidebar);

    expect(sidebar.getAttribute("data-hovered")).toBe("false");
    expect(sidebar.getAttribute("data-collapsed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /pin and expand sidebar/i }));
    expect(sidebar.getAttribute("data-collapsed")).toBe("false");
    expect(sidebar.getAttribute("data-pinned")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /unpin and collapse sidebar/i }));
    expect(sidebar.getAttribute("data-collapsed")).toBe("true");
    expect(sidebar.getAttribute("data-pinned")).toBe("false");
  });

  it("supports ArrowDown, ArrowUp, Home, End, and Escape keyboard navigation across sidebar links", () => {
    render(<App />);

    const sidebar = screen.getByLabelText("Application sidebar");
    const nav = screen.getByRole("navigation", { name: "Dashboard navigation" });
    const overviewLink = within(nav).getByRole("link", { name: "Tổng quan" });
    const energyLink = within(nav).getByRole("link", { name: "Năng lượng" });
    const settingsLink = within(nav).getByRole("link", { name: "Cài đặt" });

    overviewLink.focus();
    fireEvent.keyDown(nav, { key: "ArrowDown" });
    expect(document.activeElement).toBe(energyLink);

    fireEvent.keyDown(nav, { key: "End" });
    expect(document.activeElement).toBe(settingsLink);

    fireEvent.keyDown(nav, { key: "Home" });
    expect(document.activeElement).toBe(overviewLink);

    fireEvent.keyDown(nav, { key: "ArrowUp" });
    expect(document.activeElement).toBe(settingsLink);

    fireEvent.mouseEnter(sidebar);
    expect(sidebar.getAttribute("data-hovered")).toBe("true");
    fireEvent.keyDown(nav, { key: "Escape" });
    expect(sidebar.getAttribute("data-hovered")).toBe("false");
    expect(sidebar.getAttribute("data-collapsed")).toBe("true");
  });

  it("enforces route and action permissions for Viewer (blocks /dashboard/settings and store mutations)", async () => {
    useAuthStore.setState({
      user: { username: "viewer", displayName: "ICS Platform Viewer", role: "Viewer" },
      role: "Viewer",
      isAuthenticated: true,
    });

    await act(async () => {
      await router.navigate("/dashboard/settings");
    });
    render(<App />);

    const nav = screen.getByRole("navigation", { name: "Dashboard navigation" });
    expect(within(nav).queryByRole("link", { name: "Cài đặt" })).toBeNull();

    expect(await screen.findByRole("heading", { name: /access restricted/i })).toBeTruthy();
    expect(screen.getByText(/canManageSettings/i)).toBeTruthy();

    expect(canManageSettings("Viewer")).toBe(false);
    expect(authorizeAction("Viewer", "canManageSettings").allowed).toBe(false);

    const activeAlert = useTwinStore.getState().alerts.find((alert) => alert.status === "active");
    expect(activeAlert).toBeTruthy();
    act(() => {
      useTwinStore.getState().acknowledgeAlert(activeAlert!.id);
    });
    expect(useTwinStore.getState().alerts.find((alert) => alert.id === activeAlert!.id)?.status).toBe("active");
  });
});
