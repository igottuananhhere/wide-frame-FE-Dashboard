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

  it("switches between light and dark and persists the selected mode", async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText(/user menu for/i));
    fireEvent.click(screen.getByRole("button", { name: "Sáng" }));

    expect(document.querySelector(".dashboard-shell")?.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(screen.getByRole("button", { name: "Sáng" }).getAttribute("aria-pressed")).toBe("true");

    cleanup();
    await act(async () => {
      await router.navigate("/dashboard/overview");
    });
    render(<App />);
    expect(document.querySelector(".dashboard-shell")?.getAttribute("data-theme")).toBe("light");

    fireEvent.click(screen.getByLabelText(/user menu for/i));
    fireEvent.click(screen.getByRole("button", { name: "Tối" }));
    expect(document.querySelector(".dashboard-shell")?.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
