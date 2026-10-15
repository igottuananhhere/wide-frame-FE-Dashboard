import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BuildingFloorSelector from "./BuildingFloorSelector";
import {
  ACTIVE_BUILDING_ID,
  ACTIVE_FLOOR_ID,
  ALL_BUILDING_SCOPE_ID,
  BUILDING_LOCATIONS,
  DEMO_FLOOR_2_ID,
} from "../../data/mock/buildingLocations";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("BuildingFloorSelector hover-to-open dropdown", () => {
  it("automatically opens the floor dropdown on mouseEnter and closes after 180ms on mouseLeave", () => {
    vi.useFakeTimers();
    const onLocationChange = vi.fn();

    render(
      <BuildingFloorSelector
        buildingId={ACTIVE_BUILDING_ID}
        floorId={ALL_BUILDING_SCOPE_ID}
        locations={BUILDING_LOCATIONS}
        onLocationChange={onLocationChange}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Chọn tầng hiển thị" });
    const container = trigger.closest(".selector-dropdown-container") as HTMLElement;
    expect(container).toBeTruthy();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    // 1. Hover into the floor selector container -> opens immediately without clicking
    fireEvent.mouseEnter(container);
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");

    // 2. Move mouse from trigger to dropdown menu within the 180ms grace period -> stays open
    const listbox = screen.getByRole("listbox");
    fireEvent.mouseLeave(container);
    act(() => {
      vi.advanceTimersByTime(90);
    });
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.mouseEnter(listbox);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByRole("listbox")).toBeTruthy();

    // 3. Leave the entire container -> closes after 180ms delay
    fireEvent.mouseLeave(container);
    act(() => {
      vi.advanceTimersByTime(140);
    });
    expect(screen.getByRole("listbox")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("highlights hovered options and updates the selected floor on click then closes the menu", () => {
    const onLocationChange = vi.fn();

    render(
      <BuildingFloorSelector
        buildingId={ACTIVE_BUILDING_ID}
        floorId={ALL_BUILDING_SCOPE_ID}
        locations={BUILDING_LOCATIONS}
        onLocationChange={onLocationChange}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Chọn tầng hiển thị" });
    const container = trigger.closest(".selector-dropdown-container") as HTMLElement;

    fireEvent.mouseEnter(container);
    const listbox = screen.getByRole("listbox");
    const floor2Option = within(listbox).getByRole("option", { name: /Floor 2/i });

    fireEvent.mouseEnter(floor2Option);
    expect(floor2Option.classList.contains("is-highlighted")).toBe(true);

    fireEvent.click(floor2Option);
    expect(onLocationChange).toHaveBeenCalledTimes(1);
    expect(onLocationChange).toHaveBeenCalledWith(ACTIVE_BUILDING_ID, DEMO_FLOOR_2_ID);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("supports keyboard navigation (ArrowDown, Enter, Escape) and click-to-open for touch devices", () => {
    const onLocationChange = vi.fn();

    render(
      <BuildingFloorSelector
        buildingId={ACTIVE_BUILDING_ID}
        floorId={ALL_BUILDING_SCOPE_ID}
        locations={BUILDING_LOCATIONS}
        onLocationChange={onLocationChange}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Chọn tầng hiển thị" });
    trigger.focus();

    // Click to open (touch / mobile fallback)
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeTruthy();

    // Press Escape to close and keep focus on trigger
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    // Open with ArrowDown, then ArrowDown again to highlight Floor 1, then Enter to select
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeTruthy();

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(onLocationChange).toHaveBeenCalledWith(ACTIVE_BUILDING_ID, ACTIVE_FLOOR_ID);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});

