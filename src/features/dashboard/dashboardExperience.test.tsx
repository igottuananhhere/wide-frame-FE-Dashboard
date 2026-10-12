import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../app/App";
import { router } from "../../app/router";
import { useAuthStore } from "../auth/authStore";
import { useLoginTransitionStore } from "../auth/loginTransitionStore";
import { useTwinStore } from "../twin/twinStore";

beforeEach(async () => {
  sessionStorage.clear();
  useAuthStore.setState({
    user: { username: "admin", displayName: "ICS Platform Administrator", role: "Admin" },
    role: "Admin",
    isAuthenticated: true,
  });
  useLoginTransitionStore.setState({ isTransitioning: false });
  useTwinStore.getState().resetSimulation();
  useTwinStore.getState().selectRoom(null);
  await act(async () => {
    await router.navigate("/dashboard/overview");
  });
});

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  useAuthStore.setState({ user: null, role: null, isAuthenticated: false });
  useLoginTransitionStore.setState({ isTransitioning: false });
  useTwinStore.getState().resetSimulation();
  useTwinStore.getState().selectRoom(null);
});

async function selectFloor(floorId: string, heading: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), { target: { value: floorId } });
  expect(await screen.findByRole("heading", { name: heading })).toBeTruthy();
}

describe("dashboard wireframe acceptance", () => {
  it("places unresolved incidents before floor diagrams on building and Floor 1 views", async () => {
    render(<App />);

    const buildingGrid = document.querySelector(".building-command-grid");
    const buildingQueue = screen.getByRole("heading", { name: "Sự cố chưa giải quyết" });
    const buildingStack = screen.getByRole("heading", { name: "Sơ đồ giám sát các tầng" });
    expect(buildingGrid?.classList.contains("building-command-grid--map-first")).toBe(true);
    expect(buildingQueue.compareDocumentPosition(buildingStack) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    await selectFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");
    const floorGrid = document.querySelector(".overview-primary-grid");
    const floorQueue = screen.getByRole("heading", { name: "Sự cố chưa giải quyết" });
    const floorMap = screen.getByRole("heading", { name: "Sơ đồ vận hành Floor 1" });
    expect(floorGrid?.classList.contains("overview-primary-grid--map-first")).toBe(true);
    expect(floorQueue.compareDocumentPosition(floorMap) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  }, 15000);

  it("persists a selected floor in the URL across detail navigation and direct reloads", async () => {
    render(<App />);
    await selectFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");
    expect(window.location.search).toBe("?floorId=ics-headquarters-floor-1");

    fireEvent.click(screen.getByRole("link", { name: "Năng lượng" }));
    expect(await screen.findByRole("heading", { name: /năng lượng.*floor 1/i })).toBeTruthy();
    expect(window.location.search).toContain("floorId=ics-headquarters-floor-1");

    await act(async () => {
      await router.navigate("/dashboard/overview?floorId=ics-headquarters-floor-2");
    });
    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành Floor 2" })).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Floor" }) as HTMLSelectElement).value)
      .toBe("ics-headquarters-floor-2");

    fireEvent.click(screen.getByRole("link", { name: "Tổng quan" }));
    expect(await screen.findByRole("heading", { name: "Tổng quan vận hành tòa nhà" })).toBeTruthy();
    expect(window.location.search).toBe("");
  }, 15000);

  it("clears a room filter when changing the selected floor", async () => {
    render(<App />);
    await act(async () => {
      await router.navigate("/dashboard/devices?floorId=ics-headquarters-floor-1&roomId=room-server-01");
    });
    expect(await screen.findByRole("status", { name: /devices filtered by server room/i })).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-2" },
    });
    expect(await screen.findByRole("heading", { name: /thiết bị.*floor 2/i })).toBeTruthy();
    expect(window.location.search).toBe("?floorId=ics-headquarters-floor-2");
    expect(screen.queryByRole("status", { name: /devices filtered by/i })).toBeNull();
  });

  it("clears a room filter when changing the selected floor", async () => {
    render(<App />);
    await act(async () => {
      await router.navigate("/dashboard/devices?floorId=ics-headquarters-floor-1&roomId=room-server-01");
    });
    expect(await screen.findByRole("status", { name: /devices filtered by server room/i })).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-2" },
    });
    expect(await screen.findByRole("heading", { name: /thiết bị.*floor 2/i })).toBeTruthy();
    expect(window.location.search).toBe("?floorId=ics-headquarters-floor-2");
    expect(screen.queryByRole("status", { name: /devices filtered by/i })).toBeNull();
  });

  it("clears a room-only filter when the floor scope changes", async () => {
    render(<App />);
    await act(async () => {
      await router.navigate("/dashboard/devices?floorId=ics-headquarters-floor-1&roomId=room-server-01");
    });
    expect(await screen.findByRole("heading", { name: /thiết bị.*floor 1/i })).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Floor" }), {
      target: { value: "ics-headquarters-floor-2" },
    });
    expect(await screen.findByRole("heading", { name: /thiết bị.*floor 2/i })).toBeTruthy();
    expect(window.location.search).toBe("?floorId=ics-headquarters-floor-2");
    expect(screen.queryByRole("status", { name: /devices filtered by/i })).toBeNull();
  });

  it("renders action-forward incident cards for narrow-screen layouts", async () => {
    render(<App />);
    await selectFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");
    fireEvent.click(screen.getByRole("link", { name: "Sự cố" }));
    expect(await screen.findByRole("heading", { name: /sự cố vận hành.*floor 1/i })).toBeTruthy();

    const mobileCards = document.querySelector(".incident-mobile-card-list");
    expect(mobileCards).toBeTruthy();
    const offlineIncident = Array.from(mobileCards!.querySelectorAll<HTMLElement>(".incident-mobile-card"))
      .find((card) => card.textContent?.includes("WS-08"));
    expect(offlineIncident).toBeTruthy();
    expect(within(offlineIncident!).getByRole("button", { name: /tiếp nhận.*ws-08/i })).toBeTruthy();
  });

  it("keeps the Floor 1 overview queue ahead of the map in source and screen-reader order", async () => {
    render(<App />);
    await selectFloor("ics-headquarters-floor-1", "Tổng quan vận hành Floor 1");

    const queueHeading = screen.getByRole("heading", { name: "Sự cố chưa giải quyết" });
    const mapHeading = screen.getByRole("heading", { name: "Sơ đồ vận hành Floor 1" });
    expect(queueHeading.compareDocumentPosition(mapHeading) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

});
