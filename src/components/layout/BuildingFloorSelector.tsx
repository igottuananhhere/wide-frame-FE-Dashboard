import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown, Layers } from "lucide-react";
import type { EntityId } from "../../types/models";
import type { BuildingLocationOption } from "../../data/mock/buildingLocations";
import {
  ACTIVE_FLOOR_ID,
  ALL_BUILDING_SCOPE_ID,
  DEMO_FLOOR_2_ID,
} from "../../data/mock/buildingLocations";

type BuildingFloorSelectorProps = {
  locations: readonly BuildingLocationOption[];
  buildingId: EntityId;
  floorId: EntityId;
  onLocationChange: (buildingId: EntityId, floorId: EntityId) => void;
};

type FloorDropdownOption = {
  id: EntityId;
  name: string;
  metaLabel: string;
  fullLabel: string;
  badgeTone: "scope" | "live" | "static" | "empty";
};

const HOVER_CLOSE_DELAY_MS = 180;

export default function BuildingFloorSelector({
  locations,
  buildingId,
  floorId,
  onLocationChange,
}: BuildingFloorSelectorProps) {
  const [isFloorOpen, setIsFloorOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const floorContainerRef = useRef<HTMLDivElement | null>(null);
  const floorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedLocation = locations.find((location) => location.building.id === buildingId)
    ?? locations[0];

  const isBuildingScope = floorId === ALL_BUILDING_SCOPE_ID;
  const selectedFloor = selectedLocation?.floors.find((floor) => floor.id === floorId);
  const activeFloorId = isBuildingScope
    ? ALL_BUILDING_SCOPE_ID
    : selectedFloor?.id ?? ALL_BUILDING_SCOPE_ID;

  const floorOptions = useMemo<FloorDropdownOption[]>(() => {
    if (!selectedLocation) return [];

    const items: FloorDropdownOption[] = [
      {
        id: ALL_BUILDING_SCOPE_ID,
        name: "Toàn tòa nhà",
        metaLabel: "Tổng hợp các tầng",
        fullLabel: "Toàn tòa nhà",
        badgeTone: "scope",
      },
    ];

    for (const floor of selectedLocation.floors) {
      const metaLabel = floor.dataAvailability === "not-configured"
        ? "Chưa có dữ liệu"
        : floor.id === DEMO_FLOOR_2_ID
          ? "Dữ liệu mẫu tĩnh"
          : floor.id === ACTIVE_FLOOR_ID
            ? "Telemetry mô phỏng"
            : "Dữ liệu mô phỏng";

      const badgeTone = floor.dataAvailability === "not-configured"
        ? "empty"
        : floor.id === DEMO_FLOOR_2_ID
          ? "static"
          : "live";

      items.push({
        id: floor.id,
        name: floor.name,
        metaLabel,
        fullLabel: `${floor.name} · ${metaLabel}`,
        badgeTone,
      });
    }

    return items;
  }, [selectedLocation]);

  const selectedOptionIndex = useMemo(
    () => floorOptions.findIndex((option) => option.id === activeFloorId),
    [floorOptions, activeFloorId],
  );

  const activeOption = floorOptions[selectedOptionIndex] ?? floorOptions[0];

  const clearCloseTimer = () => {
    if (closeTimeoutRef.current !== null) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleFloorMouseEnter = () => {
    clearCloseTimer();
    setIsFloorOpen(true);
    setHighlightedIndex((prev) => (prev >= 0 ? prev : Math.max(0, selectedOptionIndex)));
  };

  const handleFloorMouseLeave = () => {
    clearCloseTimer();
    closeTimeoutRef.current = setTimeout(() => {
      setIsFloorOpen(false);
      setHighlightedIndex(-1);
    }, HOVER_CLOSE_DELAY_MS);
  };

  const handleSelectFloor = (nextFloorId: EntityId) => {
    if (!selectedLocation) return;
    clearCloseTimer();
    onLocationChange(selectedLocation.building.id, nextFloorId);
    setIsFloorOpen(false);
    setHighlightedIndex(-1);
  };

  const handleTriggerClick = () => {
    clearCloseTimer();
    setIsFloorOpen((prev) => {
      const next = !prev;
      setHighlightedIndex(next ? Math.max(0, selectedOptionIndex) : -1);
      return next;
    });
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (floorOptions.length === 0) return;

    if (event.key === "Escape") {
      if (isFloorOpen) {
        event.preventDefault();
        clearCloseTimer();
        setIsFloorOpen(false);
        setHighlightedIndex(-1);
        floorTriggerRef.current?.focus();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      clearCloseTimer();
      if (!isFloorOpen) {
        setIsFloorOpen(true);
        setHighlightedIndex(Math.max(0, selectedOptionIndex));
      } else {
        setHighlightedIndex((prev) => (prev < 0 ? 0 : (prev + 1) % floorOptions.length));
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      clearCloseTimer();
      if (!isFloorOpen) {
        setIsFloorOpen(true);
        setHighlightedIndex(selectedOptionIndex >= 0 ? selectedOptionIndex : floorOptions.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev <= 0 ? floorOptions.length - 1 : prev - 1));
      }
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      clearCloseTimer();
      if (!isFloorOpen) {
        setIsFloorOpen(true);
        setHighlightedIndex(Math.max(0, selectedOptionIndex));
      } else if (highlightedIndex >= 0 && floorOptions[highlightedIndex]) {
        handleSelectFloor(floorOptions[highlightedIndex].id);
      } else {
        setIsFloorOpen(false);
      }
    }
  };

  useEffect(() => {
    if (!isFloorOpen) return;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (floorContainerRef.current && !floorContainerRef.current.contains(event.target as Node)) {
        clearCloseTimer();
        setIsFloorOpen(false);
        setHighlightedIndex(-1);
      }
    };

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        clearCloseTimer();
        setIsFloorOpen(false);
        setHighlightedIndex(-1);
        floorTriggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutsideMouseDown);
    document.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideMouseDown);
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isFloorOpen]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  if (!selectedLocation) return null;

  return (
    <div className="building-floor-selector" aria-label="Floor selector">
      <div
        ref={floorContainerRef}
        className={`selector-field selector-field--floor selector-dropdown-container ${isFloorOpen ? "is-open" : ""}`}
        onMouseEnter={handleFloorMouseEnter}
        onMouseLeave={handleFloorMouseLeave}
        onKeyDown={handleKeyDown}
      >
        <span className="selector-label" id="floor-selector-heading">Floor</span>

        {/* Synchronized native select preserved for accessibility & existing integration tests */}
        <select
          aria-label="Floor"
          className="selector-native-proxy"
          tabIndex={-1}
          onChange={(event) => handleSelectFloor(event.target.value)}
          value={activeFloorId}
        >
          <option value={ALL_BUILDING_SCOPE_ID}>Toàn tòa nhà</option>
          {selectedLocation.floors.map((floor) => (
            <option key={floor.id} value={floor.id}>
              {floor.name}{floor.dataAvailability === "not-configured"
                ? " · Chưa có dữ liệu"
                : floor.id === DEMO_FLOOR_2_ID
                  ? " · Dữ liệu mẫu tĩnh"
                  : floor.id === ACTIVE_FLOOR_ID ? " · Telemetry mô phỏng" : " · Dữ liệu mô phỏng"}
            </option>
          ))}
        </select>

        <button
          ref={floorTriggerRef}
          type="button"
          className={`selector-trigger-btn ${isFloorOpen ? "is-open" : ""}`}
          aria-haspopup="listbox"
          aria-expanded={isFloorOpen}
          aria-controls="floor-selector-listbox"
          aria-label="Chọn tầng hiển thị"
          onClick={handleTriggerClick}
        >
          <span className="selector-trigger-value">
            {activeOption?.fullLabel ?? "Toàn tòa nhà"}
          </span>
          <ChevronDown
            aria-hidden="true"
            size={14}
            className={`selector-trigger-chevron ${isFloorOpen ? "is-open" : ""}`}
          />
        </button>

        {isFloorOpen && (
          <div
            id="floor-selector-listbox"
            role="listbox"
            aria-labelledby="floor-selector-heading"
            className="selector-dropdown-menu"
            style={{ right: -10, left: "auto" }}
            onMouseEnter={handleFloorMouseEnter}
            onMouseLeave={handleFloorMouseLeave}
          >
            <div className="selector-dropdown-header">
              <Layers aria-hidden="true" size={12} />
              <span>Chọn phạm vi tầng</span>
            </div>
            <div className="selector-dropdown-list">
              {floorOptions.map((option, index) => {
                const isSelected = option.id === activeFloorId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      "selector-dropdown-option",
                      isSelected ? "is-selected" : "",
                      isHighlighted ? "is-highlighted" : "",
                    ].filter(Boolean).join(" ")}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelectFloor(option.id)}
                  >
                    <span className="selector-option-main">
                      <span
                        aria-hidden="true"
                        className={`selector-option-dot selector-option-dot--${option.badgeTone}`}
                      />
                      <span className="selector-option-name">{option.name}</span>
                    </span>
                    <span className="selector-option-meta">
                      <span className={`selector-option-tag selector-option-tag--${option.badgeTone}`}>
                        {option.metaLabel}
                      </span>
                      {isSelected && (
                        <Check aria-hidden="true" size={13} className="selector-option-check" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

