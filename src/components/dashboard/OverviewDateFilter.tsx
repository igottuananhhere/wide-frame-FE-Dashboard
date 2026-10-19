import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  type DateFilterRange,
  enumerateDateRange,
  formatDateRangeLabel,
  formatIsoDateVi,
  normalizeDateRange,
} from "../../features/dashboard/dateFilterUtils";

export interface OverviewDateFilterProps {
  selectedRange: DateFilterRange;
  todayIso: string;
  onRangeChange: (range: DateFilterRange) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

interface CalendarCell {
  iso: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}

function toIsoDate(year: number, monthZeroIndexed: number, day: number): string {
  const dt = new Date(year, monthZeroIndexed, day);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildMonthGrid(year: number, monthZeroIndexed: number): CalendarCell[] {
  const firstOfMonth = new Date(year, monthZeroIndexed, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 (Su) .. 6 (Sa)
  const daysInMonth = new Date(year, monthZeroIndexed + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthZeroIndexed, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i -= 1) {
    const dayNum = daysInPrevMonth - i;
    cells.push({
      iso: toIsoDate(year, monthZeroIndexed - 1, dayNum),
      dayNumber: dayNum,
      isCurrentMonth: false,
    });
  }

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum += 1) {
    cells.push({
      iso: toIsoDate(year, monthZeroIndexed, dayNum),
      dayNumber: dayNum,
      isCurrentMonth: true,
    });
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const trailingCount = 7 - remainder;
    for (let dayNum = 1; dayNum <= trailingCount; dayNum += 1) {
      cells.push({
        iso: toIsoDate(year, monthZeroIndexed + 1, dayNum),
        dayNumber: dayNum,
        isCurrentMonth: false,
      });
    }
  }

  return cells;
}

export default function OverviewDateFilter({
  selectedRange,
  todayIso,
  onRangeChange,
}: OverviewDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [anchorStartIso, setAnchorStartIso] = useState<string | null>(null);
  const [hoveredIso, setHoveredIso] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const normalized = useMemo(() => normalizeDateRange(selectedRange), [selectedRange]);
  const isToday = normalized.startDate === todayIso && normalized.endDate === todayIso;

  const initialYearMonth = useMemo(() => {
    const [y, m] = normalized.endDate.split("-").map(Number);
    return {
      year: y ?? 2026,
      month: (m ?? 10) - 1,
    };
  }, [normalized.endDate]);

  const [viewYear, setViewYear] = useState(initialYearMonth.year);
  const [viewMonth, setViewMonth] = useState(initialYearMonth.month);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setAnchorStartIso(null);
        setHoveredIso(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setAnchorStartIso(null);
        setHoveredIso(null);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const previewRange = useMemo(() => {
    if (anchorStartIso && hoveredIso) {
      return normalizeDateRange({ startDate: anchorStartIso, endDate: hoveredIso });
    }
    return normalized;
  }, [anchorStartIso, hoveredIso, normalized]);

  const selectedDayCount = useMemo(
    () => enumerateDateRange(previewRange).length,
    [previewRange],
  );

  const activeLabel = formatDateRangeLabel(normalized, todayIso);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (cell: CalendarCell) => {
    if (!cell.isCurrentMonth) {
      const [cy, cm] = cell.iso.split("-").map(Number);
      if (cy && cm) {
        setViewYear(cy);
        setViewMonth(cm - 1);
      }
    }

    if (!anchorStartIso) {
      setAnchorStartIso(cell.iso);
      setHoveredIso(cell.iso);
      onRangeChange({ startDate: cell.iso, endDate: cell.iso });
    } else {
      const nextRange = normalizeDateRange({
        startDate: anchorStartIso,
        endDate: cell.iso,
      });
      onRangeChange(nextRange);
      setAnchorStartIso(null);
      setHoveredIso(null);
    }
  };

  return (
    <div className="overview-period-filter" ref={containerRef}>
      <button
        type="button"
        className={`overview-period overview-period-btn${!isToday ? " is-filtered" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Lọc theo ngày: ${activeLabel}`}
        onClick={() => {
          setOpen((prev) => {
            const nextOpen = !prev;
            if (nextOpen) {
              const [y, m] = normalized.endDate.split("-").map(Number);
              if (y && m) {
                setViewYear(y);
                setViewMonth(m - 1);
              }
            } else {
              setAnchorStartIso(null);
              setHoveredIso(null);
            }
            return nextOpen;
          });
        }}
      >
        <CalendarDays aria-hidden="true" size={15} />
        <span>{activeLabel}</span>
        <ChevronDown aria-hidden="true" size={13} className="overview-period-chevron" />
      </button>

      {open && (
        <div className="overview-calendar-popover" role="dialog" aria-label="Lịch chọn ngày lọc dữ liệu">
          <div className="overview-calendar-header">
            <button
              type="button"
              className="overview-calendar-nav-btn"
              aria-label="Tháng trước"
              onClick={handlePrevMonth}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <strong className="overview-calendar-title">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </strong>
            <button
              type="button"
              className="overview-calendar-nav-btn"
              aria-label="Tháng sau"
              onClick={handleNextMonth}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="overview-calendar-weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((dayName) => (
              <span key={dayName}>{dayName}</span>
            ))}
          </div>

          <div
            className="overview-calendar-grid"
            role="grid"
            aria-label={`${MONTH_NAMES[viewMonth]} ${viewYear}`}
            onMouseLeave={() => {
              if (anchorStartIso) {
                setHoveredIso(anchorStartIso);
              }
            }}
          >
            {cells.map((cell) => {
              const isStart = cell.iso === previewRange.startDate;
              const isEnd = cell.iso === previewRange.endDate;
              const isSelectedEdge = isStart || isEnd;
              const isInRange =
                cell.iso > previewRange.startDate && cell.iso < previewRange.endDate;
              const isTodayCell = cell.iso === todayIso;

              const classNames = [
                "overview-calendar-day",
                !cell.isCurrentMonth ? "is-outside" : "",
                isTodayCell ? "is-today" : "",
                isSelectedEdge ? "is-selected" : "",
                isInRange ? "is-in-range" : "",
                isStart && !isEnd ? "is-range-start" : "",
                isEnd && !isStart ? "is-range-end" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={cell.iso}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelectedEdge || isInRange}
                  aria-label={`Ngày ${formatIsoDateVi(cell.iso)}`}
                  className={classNames}
                  onMouseEnter={() => {
                    if (anchorStartIso) {
                      setHoveredIso(cell.iso);
                    }
                  }}
                  onClick={() => handleDayClick(cell)}
                >
                  <span>{cell.dayNumber}</span>
                  {isTodayCell && <i className="overview-calendar-today-bar" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="overview-calendar-footer">
            <span className="overview-calendar-range-hint">
              {anchorStartIso
                ? `Chọn ngày kết thúc (${selectedDayCount} ngày)`
                : selectedDayCount > 1
                  ? `${formatIsoDateVi(previewRange.startDate)} – ${formatIsoDateVi(previewRange.endDate)} (${selectedDayCount} ngày)`
                  : `Ngày chọn: ${formatIsoDateVi(previewRange.startDate)}`}
            </span>
            {!isToday && (
              <button
                type="button"
                className="overview-calendar-reset-btn"
                onClick={() => {
                  onRangeChange({ startDate: todayIso, endDate: todayIso });
                  setAnchorStartIso(null);
                  setHoveredIso(null);
                  const [ty, tm] = todayIso.split("-").map(Number);
                  if (ty && tm) {
                    setViewYear(ty);
                    setViewMonth(tm - 1);
                  }
                }}
              >
                Hôm nay
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
