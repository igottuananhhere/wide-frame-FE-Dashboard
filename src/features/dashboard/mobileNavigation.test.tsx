import { act, cleanup, createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import { useAuthStore } from "../auth/authStore";
import { useLoginTransitionStore } from "../auth/loginTransitionStore";

const originalMatchMedia = window.matchMedia;

beforeEach(async () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 850px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  });
  sessionStorage.clear();
  useAuthStore.setState({
    user: { username: "admin", displayName: "ICS Platform Administrator", role: "Admin" },
    role: "Admin",
    isAuthenticated: true,
  });
  useLoginTransitionStore.setState({ isTransitioning: false });
  await act(async () => {
    await router.navigate("/dashboard/overview");
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  useLoginTransitionStore.setState({ isTransitioning: false });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: originalMatchMedia,
  });
});

describe("mobile navigation accessibility", () => {
  it("removes a closed sidebar from focus and restores focus after Escape or navigation", async () => {
    render(<App />);

    const menuButton = screen.getByRole("button", { name: "Open navigation" });
    const sidebar = screen.getByLabelText("Application sidebar");
    menuButton.focus();

    expect(sidebar.getAttribute("aria-hidden")).toBe("true");
    expect(sidebar.hasAttribute("inert")).toBe(true);

    fireEvent.click(menuButton);
    const closeButton = within(sidebar).getByRole("button", { name: "Close sidebar" });
    expect(document.activeElement).toBe(closeButton);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menuButton);
    expect(sidebar.hasAttribute("inert")).toBe(true);

    fireEvent.click(menuButton);
    fireEvent.click(within(sidebar).getByRole("link", { name: "Năng lượng" }));
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menuButton);
  }, 15000);

  it("wraps keyboard focus inside the open sidebar", () => {
    render(<App />);

    const menuButton = screen.getByRole("button", { name: "Open navigation" });
    fireEvent.click(menuButton);
    const sidebar = screen.getByLabelText("Application sidebar");
    const closeButton = within(sidebar).getByRole("button", { name: "Close sidebar" });
    const lastFocusable = within(sidebar).getByRole("button", { name: "Chế độ tối" });

    lastFocusable.focus();
    const tabForward = createEvent.keyDown(lastFocusable, { key: "Tab" });
    fireEvent(lastFocusable, tabForward);
    expect(tabForward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeButton);

    closeButton.focus();
    const tabBackward = createEvent.keyDown(closeButton, { key: "Tab", shiftKey: true });
    fireEvent(closeButton, tabBackward);
    expect(tabBackward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(lastFocusable);
  });
});
