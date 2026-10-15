import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import LoginPage from "../../pages/auth/LoginPage";
import { AUTH_SESSION_STORAGE_KEY, useAuthStore } from "./authStore";
import { canControlDevice, canViewAssets, canViewDashboard } from "./permissions";
import { useLoginTransitionStore } from "./loginTransitionStore";

async function openRoute(path: string) {
  await act(async () => {
    await router.navigate(path);
  });
  render(<App />);
}

async function submitCredentials(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: username },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

function waitForOverview() {
  return screen.findByRole(
    "heading",
    { name: /tổng quan vận hành (?:floor 1|tòa nhà)/i },
    { timeout: 10000 },
  );
}

beforeEach(async () => {
  sessionStorage.clear();
  useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  useLoginTransitionStore.setState({ isTransitioning: false });
  await act(async () => {
    await router.navigate("/login");
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  useLoginTransitionStore.setState({ isTransitioning: false });
});

describe("direct dashboard access and header role switching (Demo Mode)", () => {
  it("bypasses the login screen on /login and enters the Dashboard directly", async () => {
    await openRoute("/login");

    expect(await waitForOverview()).toBeTruthy();
    expect(screen.queryByLabelText(/username/i)).toBeNull();
    expect(screen.queryByLabelText(/^password$/i)).toBeNull();
    expect(useAuthStore.getState().role).toBe("Admin");

    const headerSwitcher = screen.getByRole("group", { name: /chuyển đổi nhanh vai trò admin và viewer/i });
    expect(within(headerSwitcher).getByRole("button", { name: "Admin" })).toBeTruthy();
    expect(within(headerSwitcher).getByRole("button", { name: "Viewer" })).toBeTruthy();
  });

  it("opens /dashboard/overview directly without requiring authentication", async () => {
    await openRoute("/dashboard/overview");

    expect(await waitForOverview()).toBeTruthy();
    expect(useAuthStore.getState().role).toBe("Admin");
  });

  it("opens /dashboard root directly into the overview dashboard", async () => {
    await openRoute("/dashboard");

    expect(await waitForOverview()).toBeTruthy();
    expect(useAuthStore.getState().role).toBe("Admin");
  });

  it("renders the reusable dashboard shell with the signed-in user and header role switcher", async () => {
    useAuthStore.setState({
      user: { username: "admin", displayName: "ICS Platform Administrator", role: "Admin" },
      role: "Admin",
      isAuthenticated: true,
    });
    await openRoute("/dashboard/overview");

    expect(await waitForOverview()).toBeTruthy();
    expect(screen.getAllByText("ICS Platform Administrator").length).toBeGreaterThan(0);
    expect(screen.getByText("Admin", { exact: true })).toBeTruthy();
    expect(document.querySelector(".dashboard-header .live-indicator")).toBeNull();
    expect(document.querySelector(".overview-heading-actions .building-floor-selector")).toBeTruthy();
    expect(document.querySelector(".dashboard-header-live .building-floor-selector")).toBeNull();
    expect(document.querySelector(".dashboard-header-location")).toBeNull();
    expect(document.querySelector(".dashboard-header .last-sync time")?.getAttribute("aria-label"))
      .toBe("Floor 1 telemetry last updated");
    expect(screen.queryByRole("combobox", { name: "Building" })).toBeNull();
    expect((screen.getByRole("combobox", { name: "Floor" }) as HTMLSelectElement).value)
      .toBe("ics-headquarters-all-floors");
    expect(screen.getByRole("navigation", { name: "Dashboard navigation" })
      .querySelector('a[aria-current="page"]')?.textContent).toContain("Tổng quan");
    for (const label of ["Năng lượng", "Môi trường", "Thiết bị", "Sự cố", "Tài sản & bảo trì", "Mô hình 3D"]) {
      expect(screen.getByRole("link", { name: label })).toBeTruthy();
    }

    const sidebar = screen.getByLabelText("Application sidebar");
    expect(sidebar.className).toContain("dashboard-sidebar--collapsed");
    fireEvent.click(screen.getByRole("button", { name: /expand sidebar/i }));
    expect(sidebar.className).toContain("dashboard-sidebar--pinned");
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(sidebar.className).toContain("dashboard-sidebar--collapsed");
  }, 15000);

  it("switches roles immediately via the Header Admin/Viewer buttons", async () => {
    await openRoute("/dashboard/overview");
    expect(await waitForOverview()).toBeTruthy();

    const headerSwitcher = screen.getByRole("group", { name: /chuyển đổi nhanh vai trò admin và viewer/i });
    const adminBtn = within(headerSwitcher).getByRole("button", { name: "Admin" });
    const viewerBtn = within(headerSwitcher).getByRole("button", { name: "Viewer" });

    expect(adminBtn.getAttribute("aria-pressed")).toBe("true");
    expect(viewerBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(viewerBtn);
    expect(useAuthStore.getState().role).toBe("Viewer");
    expect(viewerBtn.getAttribute("aria-pressed")).toBe("true");
    expect(adminBtn.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getAllByText("ICS Dashboard Viewer").length).toBeGreaterThan(0);

    fireEvent.click(adminBtn);
    expect(useAuthStore.getState().role).toBe("Admin");
    expect(adminBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getAllByText("ICS Platform Administrator").length).toBeGreaterThan(0);
  }, 15000);

  it("keeps the Digital Twin 3D route as a placeholder inside the dashboard shell", async () => {
    useAuthStore.setState({
      user: { username: "viewer", displayName: "ICS Platform Viewer", role: "Viewer" },
      role: "Viewer",
      isAuthenticated: true,
    });
    await openRoute("/dashboard/overview");

    fireEvent.click(screen.getByRole("link", { name: "Mô hình 3D" }));
    expect(await screen.findByRole("heading", { name: /mô hình 3d/i })).toBeTruthy();
    expect(screen.getByText(/module planned for a later phase/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mô hình 3D" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("banner")).toBeTruthy();
  }, 15000);

  it("rehydrates selected role from session storage after refresh", async () => {
    await openRoute("/dashboard/overview");
    await waitForOverview();

    const headerSwitcher = screen.getByRole("group", { name: /chuyển đổi nhanh vai trò admin và viewer/i });
    fireEvent.click(within(headerSwitcher).getByRole("button", { name: "Viewer" }));

    const savedSession = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    expect(savedSession).toContain("Viewer");

    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
    sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, savedSession ?? "");
    await act(async () => {
      await useAuthStore.persist.rehydrate();
      await router.navigate("/dashboard/overview");
    });

    expect(await waitForOverview()).toBeTruthy();
    expect(useAuthStore.getState().role).toBe("Viewer");
  });

  it("preserves the formal LoginPage component for future authentication rollout", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput.getAttribute("type")).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(passwordInput.getAttribute("type")).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput.getAttribute("type")).toBe("password");

    await submitCredentials("admin", "wrong-password");
    const errorMessage = await screen.findByRole("alert");
    expect(errorMessage.textContent).toMatch(/invalid username or password/i);
  });

  it("applies the Admin and Viewer permission matrix", () => {
    expect(canViewDashboard("Admin")).toBe(true);
    expect(canViewAssets("Admin")).toBe(true);
    expect(canControlDevice("Admin")).toBe(true);
    expect(canViewDashboard("Viewer")).toBe(true);
    expect(canViewAssets("Viewer")).toBe(true);
    expect(canControlDevice("Viewer")).toBe(false);
    expect(canViewDashboard(null)).toBe(false);
    expect(canViewAssets(null)).toBe(false);
    expect(canControlDevice(null)).toBe(false);
  });
});

