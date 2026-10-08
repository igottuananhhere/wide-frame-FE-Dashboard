import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import viteConfig from "../../../vite.config";
import { useAuthStore } from "../auth/authStore";
import { useLoginTransitionStore } from "../auth/loginTransitionStore";

beforeEach(async () => {
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
});

async function openFloor(floorId: string, title: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), { target: { value: floorId } });
  return screen.findByRole("heading", { name: title });
}

describe("building and floor management overview", () => {
  it("aggregates the configured floors and returns to the building scope from Overview", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành tòa nhà" })).toBeTruthy();
    expect(screen.getAllByText("266.6 kWh").length).toBeGreaterThan(0);

    const floorSelector = screen.getByRole("combobox", { name: "Floor" }) as HTMLSelectElement;
    fireEvent.change(floorSelector, { target: { value: "ics-headquarters-floor-2" } });
    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành Floor 2" })).toBeTruthy();
    expect(screen.getByText("141.0 kWh")).toBeTruthy();
    expect(screen.getByText("Khu làm việc 2A")).toBeTruthy();

    fireEvent.click(screen.getByRole("link", { name: "Tổng quan" }));
    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành tòa nhà" })).toBeTruthy();
    expect(floorSelector.value).toBe("ics-headquarters-all-floors");
  });

  it("prebundles Recharts before the lazy energy chart is requested", () => {
    expect(viteConfig.optimizeDeps?.include).toContain("recharts");
  });

  it("shows the executive health summary and mock attention queue", async () => {
    render(<App />);

    await openFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");
    expect(screen.getByText("Tổng quan vận hành Floor 1")).toBeTruthy();
    expect(screen.getAllByText("125.6 kWh").length).toBeGreaterThan(0);
    expect(screen.getByText("24 / 26")).toBeTruthy();
    expect(screen.getByText("4", { selector: ".kpi-card-value" })).toBeTruthy();
    expect(screen.getAllByText("Bình thường").length).toBeGreaterThan(0);
    expect(screen.getByText("Sensor WS-08 mất kết nối")).toBeTruthy();
    expect(screen.getByText("Bộ điều khiển Utility Room mất kết nối")).toBeTruthy();
    expect(screen.getByText("AC-03 sắp đến hạn bảo trì")).toBeTruthy();
  });

  it("shows energy and environment summaries and a chart", async () => {
    render(<App />);

    await openFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");
    expect(await screen.findByRole(
      "img",
      { name: /energy consumption today/i },
      { timeout: 5000 },
    )).toBeTruthy();
    expect(screen.getAllByText("Khu làm việc").length).toBeGreaterThan(0);
    expect(screen.getByText("25.5°C")).toBeTruthy();
    expect(screen.getByText("58%")).toBeTruthy();
    expect(screen.getByText("620 ppm")).toBeTruthy();
    expect(screen.getByText("18 µg/m³")).toBeTruthy();
  });

  it("shows asset exceptions and links the 3D action to the external twin", async () => {
    render(<App />);

    await openFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");
    const table = screen.getByRole("table", { name: /asset exceptions/i });
    expect(within(table).getByText("AC-03")).toBeTruthy();
    expect(within(table).getByText("WS-08")).toBeTruthy();
    expect(within(table).getByText("UT-01")).toBeTruthy();
    const digitalTwinLink = screen.getByRole("link", { name: /mở digital twin 3d/i });
    expect(digitalTwinLink.getAttribute("href")).toBe("https://warm-dodol-8b85a2.netlify.app/index.html");
    expect(digitalTwinLink.getAttribute("target")).toBe("_blank");
    expect(digitalTwinLink.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
