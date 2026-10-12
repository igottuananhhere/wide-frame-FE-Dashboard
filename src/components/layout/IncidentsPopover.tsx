import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Info,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { TwinAlert } from "../../features/twin/types";
import type { EntityId } from "../../types/models";

function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diffMinutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (diffMinutes === 0) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${Math.floor(diffHours / 24)} ngày trước`;
}

export type IncidentsPopoverProps = {
  unresolvedAlertCount: number;
  noFloorData: boolean;
  scopeLabel: string;
  alerts: readonly TwinAlert[];
  canAcknowledge: boolean;
  onAcknowledge: (alertId: EntityId) => void;
};

export default function IncidentsPopover({
  unresolvedAlertCount,
  noFloorData,
  scopeLabel,
  alerts,
  canAcknowledge,
  onAcknowledge,
}: IncidentsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const clearCloseTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearCloseTimeout();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimeout();
    // 250ms debounce grace period so user can smoothly move mouse into the tooltip
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  const handleToggleClick = () => {
    clearCloseTimeout();
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    clearCloseTimeout();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  // Sort alerts: critical first, then active before acknowledged, then newest
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((first, second) => {
      const getPriorityRank = (alert: TwinAlert) => {
        const isCritical = alert.severity === "critical" || alert.kind === "critical";
        const isMaintenance = alert.kind === "maintenance";
        const isActive = alert.status === "active";
        if (isCritical) return isActive ? 0 : 1;
        if (isMaintenance) return isActive ? 4 : 5;
        return isActive ? 2 : 3;
      };
      const rankDiff = getPriorityRank(first) - getPriorityRank(second);
      return rankDiff || second.occurredAt - first.occurredAt;
    });
  }, [alerts]);

  const unacknowledgedCount = alerts.filter((alert) => alert.status === "active").length;
  const acknowledgedCount = alerts.filter((alert) => alert.status === "acknowledged").length;

  const handleItemClick = (alert: TwinAlert) => {
    handleClose();
    if (alert.kind === "maintenance" && alert.assetId) {
      navigate(`/dashboard/assets?assetId=${alert.assetId}`);
    } else {
      navigate("/dashboard/incidents");
    }
  };

  return (
    <div
      ref={containerRef}
      className="alerts-popover-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`alerts-summary alerts-summary--interactive ${isOpen ? "is-active" : ""}`}
        onClick={handleToggleClick}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls="alerts-popover-panel"
        aria-label={noFloorData ? `Alert data unavailable for ${scopeLabel}` : `${unresolvedAlertCount} unresolved alerts`}
        id="alerts-header-trigger"
      >
        <Bell aria-hidden="true" size={17} />
        <span>Sự cố</span>
        <span className="alerts-count">{noFloorData ? "—" : unresolvedAlertCount}</span>
      </button>

      {isOpen && (
        <div
          id="alerts-popover-panel"
          className="alerts-popover-panel"
          role="dialog"
          aria-label="Danh sách sự cố cần giải quyết"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <header className="alerts-popover-header">
            <div className="alerts-popover-title-row">
              <div className="alerts-popover-title">
                <Bell size={16} aria-hidden="true" />
                <span>Sự cố cần giải quyết</span>
              </div>
              <span className="alerts-popover-scope-pill">{scopeLabel}</span>
            </div>
            <p className="alerts-popover-subtitle">
              {noFloorData
                ? "Chưa có luồng dữ liệu sự cố trực tiếp"
                : unresolvedAlertCount > 0
                  ? `${unresolvedAlertCount} sự cố (${unacknowledgedCount} chưa tiếp nhận · ${acknowledgedCount} đang xử lý)`
                  : "Hệ thống hoạt động bình thường, không có sự cố"}
            </p>
          </header>

          <div className="alerts-popover-body">
            {noFloorData ? (
              <div className="alerts-popover-empty">
                <Info size={28} aria-hidden="true" />
                <p>Tầng này chưa có dữ liệu sự cố trực tiếp.</p>
                <span>Vui lòng chuyển sang Tầng 1 hoặc xem Toàn tòa nhà.</span>
              </div>
            ) : sortedAlerts.length === 0 ? (
              <div className="alerts-popover-empty alerts-popover-empty--clean">
                <CheckCircle2 size={28} aria-hidden="true" />
                <p>Không có sự cố nào cần giải quyết!</p>
                <span>Tất cả thiết bị và khu vực trong {scopeLabel} đang hoạt động ổn định.</span>
              </div>
            ) : (
              <ul className="alerts-popover-list" aria-label="Danh sách sự cố cần xử lý">
                {sortedAlerts.map((alert) => {
                  const isCritical = alert.severity === "critical" || alert.kind === "critical";
                  const isMaintenance = alert.kind === "maintenance";
                  const itemModifier = isCritical
                    ? "alerts-popover-item--critical"
                    : isMaintenance
                      ? "alerts-popover-item--maintenance"
                      : "alerts-popover-item--warning";

                  return (
                    <li
                      key={alert.id}
                      className={`alerts-popover-item ${itemModifier}`}
                      onClick={() => handleItemClick(alert)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleItemClick(alert);
                        }
                      }}
                      aria-label={`Xem sự cố ${alert.title}`}
                    >
                      <div className="alerts-popover-item-top">
                        <div className="alerts-popover-item-badges">
                          {isCritical ? (
                            <span className="alerts-popover-severity-tag alerts-popover-severity-tag--critical">
                              <CircleAlert size={12} aria-hidden="true" />
                              Critical
                            </span>
                          ) : isMaintenance ? (
                            <span className="alerts-popover-severity-tag alerts-popover-severity-tag--maintenance">
                              <CalendarClock size={12} aria-hidden="true" />
                              Bảo trì
                            </span>
                          ) : (
                            <span className="alerts-popover-severity-tag alerts-popover-severity-tag--warning">
                              <AlertTriangle size={12} aria-hidden="true" />
                              Cảnh báo
                            </span>
                          )}

                          <span
                            className={`alerts-popover-status-tag alerts-popover-status-tag--${alert.status}`}
                          >
                            {alert.status === "active" ? "Chưa tiếp nhận" : "Đang xử lý"}
                          </span>
                        </div>

                        <time className="alerts-popover-item-time" dateTime={new Date(alert.occurredAt).toISOString()}>
                          {formatRelativeTime(alert.occurredAt)}
                        </time>
                      </div>

                      <h4 className="alerts-popover-item-title">{alert.title}</h4>

                      <div className="alerts-popover-item-location">
                        <span>{alert.location}</span>
                        {alert.reading && (
                          <span className="alerts-popover-item-reading">· {alert.reading}</span>
                        )}
                      </div>

                      <div className="alerts-popover-item-actions">
                        {canAcknowledge && alert.status === "active" && (
                          <button
                            type="button"
                            className="alerts-popover-ack-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAcknowledge(alert.id);
                            }}
                            aria-label={`Tiếp nhận sự cố ${alert.title}`}
                          >
                            Tiếp nhận
                          </button>
                        )}
                        <span className="alerts-popover-view-btn">
                          {alert.kind === "maintenance" && alert.assetId ? "Xem tài sản" : "Xem sự cố"}
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="alerts-popover-footer">
            <Link
              to="/dashboard/incidents"
              className="alerts-popover-footer-link"
              onClick={handleClose}
            >
              Xem tất cả nhật ký sự cố ({unresolvedAlertCount})
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
}

