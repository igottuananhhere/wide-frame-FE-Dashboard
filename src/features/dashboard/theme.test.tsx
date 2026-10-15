import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import { useAuthStore } from "../auth/authStore";
import { useLoginTransitionStore } from "../auth/loginTransitionStore";
import { useTwinStore } from "../twin/twinStore";

const THEME_STORAGE_KEY = "ics-digital-twin-theme";

beforeEach(async () => {
  sessionStorage.clear();
  localStorage.removeItem(THEME_STORAGE_KEY);
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
  localStorage.removeItem(THEME_STORAGE_KEY);
  useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  useLoginTransitionStore.setState({ isTransitioning: false });
  useTwinStore.getState().resetSimulation();
});

describe("dashboard color theme", () => {
  it("keeps the existing dark appearance as the default", () => {
    render(<App />);
    expect(document.querySelector(".dashboard-shell")?.getAttribute("data-theme")).toBe("dark");
  });

  it("renders the compact icon theme switcher at the bottom of the sidebar (removed from topbar) and persists the selected mode", async () => {
    render(<App />);

    const themeGroup = screen.getByRole("group", { name: "Chế độ giao diện" });
    expect(themeGroup).toBeTruthy();
    expect(document.querySelector(".dashboard-header-live .theme-switcher")).toBeNull();
    expect(document.querySelector(".dashboard-user-menu .theme-switcher")).toBeNull();
    expect(document.querySelector(".dashboard-sidebar .sidebar-theme-section .theme-switcher--sidebar")).toBeTruthy();

    const lightButton = screen.getByRole("button", { name: "Chế độ sáng" });
    const darkButton = screen.getByRole("button", { name: "Chế độ tối" });
    expect(lightButton.getAttribute("title")).toBe("Chế độ sáng");
    expect(darkButton.getAttribute("title")).toBe("Chế độ tối");
    expect(lightButton.textContent).toBe("");
    expect(darkButton.textContent).toBe("");
    expect(darkButton.getAttribute("aria-pressed")).toBe("true");
    expect(lightButton.getAttribute("aria-pressed")).toBe("false");

    // Switch to Light Mode while sidebar is collapsed
    fireEvent.click(lightButton);
    expect(document.querySelector(".dashboard-shell")?.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(lightButton.getAttribute("aria-pressed")).toBe("true");
    expect(darkButton.getAttribute("aria-pressed")).toBe("false");

    // Hover-expand sidebar and verify theme switcher state is preserved without flicker
    const sidebar = screen.getByLabelText("Application sidebar");
    fireEvent.mouseEnter(sidebar);
    expect(sidebar.getAttribute("data-collapsed")).toBe("false");
    expect(screen.getByRole("button", { name: "Chế độ sáng" }).getAttribute("aria-pressed")).toBe("true");

    cleanup();
    await act(async () => {
      await router.navigate("/dashboard/overview");
    });
    render(<App />);
    expect(document.querySelector(".dashboard-shell")?.getAttribute("data-theme")).toBe("light");

    fireEvent.click(screen.getByRole("button", { name: "Chế độ tối" }));
    expect(document.querySelector(".dashboard-shell")?.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Chế độ tối" }).getAttribute("aria-pressed")).toBe("true");
  }, 15000);

  it("provides light theme styling for environment attention areas, building stack and chart", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Chế độ sáng" }));
    expect(document.querySelector(".dashboard-shell")?.getAttribute("data-theme")).toBe("light");

    // Verify building overview elements are rendered and accessible
    expect(screen.getByText("Khu vực cần chú ý")).toBeTruthy();
    expect(screen.getByText("Trạng thái khu vực")).toBeTruthy();
    expect(document.querySelector(".building-environment-areas .environment-attention-link")).toBeTruthy();
    expect(await screen.findByRole("img", { name: /cumulative energy/i })).toBeTruthy();
  });
});
