import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
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
    { timeout: 3000 },
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
  const userMenu = screen.queryByLabelText(/user menu for/i);
  const userMenuDetails = userMenu?.closest("details");
  if (userMenuDetails) userMenuDetails.open = true;
  const signOutButton = screen.queryByRole("button", { name: /sign out/i });
  if (signOutButton) {
    fireEvent.click(signOutButton);
  }
  cleanup();
  sessionStorage.clear();
  useLoginTransitionStore.setState({ isTransitioning: false });
});

describe("mock authentication flows", () => {
  it("shows the ICS branded login experience", async () => {
    await openRoute("/login");

    const icsLogo = await screen.findByRole("img", { name: /ics digital twin logo/i });
    expect(icsLogo.textContent).toContain("ICS");
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/platform online/i);
  });

  it("redirects unauthenticated dashboard access to login", async () => {
    await openRoute("/dashboard/overview");

    expect(await screen.findByLabelText(/username/i)).toBeTruthy();
  });

  it("redirects the dashboard root to login when unauthenticated", async () => {
    await openRoute("/dashboard");

    expect(await screen.findByLabelText(/username/i)).toBeTruthy();
  });

  it("renders the reusable dashboard shell with the signed-in user", async () => {
    await openRoute("/login");
    await submitCredentials("admin", "admin123");

    expect(await waitForOverview()).toBeTruthy();
    expect(screen.getAllByText("ICS Platform Administrator").length).toBeGreaterThan(0);
    expect(screen.getByText("Admin", { exact: true })).toBeTruthy();
    expect(screen.getAllByText(/simulation/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("time", { name: /last updated/i })).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Building" }) as HTMLSelectElement).value).toBe("ics-headquarters");
    expect((screen.getByRole("combobox", { name: "Floor" }) as HTMLSelectElement).value)
      .toBe("ics-headquarters-all-floors");
    expect(screen.getByRole("link", { name: /tổng quan/i })).toBeTruthy();
    for (const label of ["Năng lượng", "Môi trường", "Thiết bị", "Sự cố", "Tài sản & bảo trì", "Mô hình 3D"]) {
      expect(screen.getByRole("link", { name: label })).toBeTruthy();
    }

    const sidebar = screen.getByLabelText("Application sidebar");
    fireEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(sidebar.className).toContain("dashboard-sidebar--collapsed");
  });

  it("keeps the Digital Twin 3D route as a placeholder inside the dashboard shell", async () => {
    await openRoute("/login");
    await submitCredentials("viewer", "viewer123");
    await waitForOverview();

    fireEvent.click(screen.getByRole("link", { name: "Mô hình 3D" }));
    expect(await screen.findByRole("heading", { name: /mô hình 3d/i })).toBeTruthy();
    expect(screen.getByText(/module planned for a later phase/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mô hình 3D" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("banner")).toBeTruthy();
  });

  it.each([
    ["admin", "admin123", "Admin"],
    ["viewer", "viewer123", "Viewer"],
  ])("allows %s to access the dashboard", async (username, password, role) => {
    await openRoute("/login");
    await submitCredentials(username, password);

    expect(
      await waitForOverview(),
    ).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/user menu for/i));
    expect(screen.getByText(role, { exact: true })).toBeTruthy();
    expect(useLoginTransitionStore.getState().isTransitioning).toBe(true);
  });

  it("allows keyboard users to reveal and hide the password", async () => {
    await openRoute("/login");
    const passwordInput = screen.getByLabelText(/^password$/i);

    expect(passwordInput.getAttribute("type")).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(passwordInput.getAttribute("type")).toBe("text");
    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(passwordInput.getAttribute("type")).toBe("password");
  });

  it("submits the login form and exposes its loading state", async () => {
    await openRoute("/login");
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "admin123" },
    });
    const form = screen.getByLabelText(/username/i).closest("form");

    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(screen.getByText(/signing in/i)).toBeTruthy();
    expect(
      await waitForOverview(),
    ).toBeTruthy();
    expect(useLoginTransitionStore.getState().isTransitioning).toBe(true);
  });

  it("shows an error for invalid credentials", async () => {
    await openRoute("/login");
    await submitCredentials("admin", "wrong-password");

    const errorMessage = await screen.findByRole("alert");
    expect(errorMessage.textContent).toMatch(/invalid username or password/i);
    expect(useLoginTransitionStore.getState().isTransitioning).toBe(false);
  });

  it("returns to login after logout", async () => {
    await openRoute("/login");
    await submitCredentials("viewer", "viewer123");
    fireEvent.click(await screen.findByLabelText(/user menu for/i));
    fireEvent.click(await screen.findByRole("button", { name: /sign out/i }));

    expect(await screen.findByLabelText(/username/i)).toBeTruthy();
    expect(sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it("redirects an authenticated user away from login", async () => {
    await openRoute("/login");
    await submitCredentials("admin", "admin123");
    await waitForOverview();
    await act(async () => {
      await router.navigate("/login");
    });

    expect(
      await waitForOverview(),
    ).toBeTruthy();
  });

  it("rehydrates mock authentication from session storage after refresh", async () => {
    await openRoute("/login");
    await submitCredentials("viewer", "viewer123");
    await waitForOverview();

    const savedSession = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    expect(savedSession).toContain("Viewer");

    useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
    sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, savedSession ?? "");
    await act(async () => {
      await useAuthStore.persist.rehydrate();
      await router.navigate("/dashboard/overview");
    });

    expect(
      await waitForOverview(),
    ).toBeTruthy();
    expect(screen.getByText("Viewer", { exact: true })).toBeTruthy();
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
