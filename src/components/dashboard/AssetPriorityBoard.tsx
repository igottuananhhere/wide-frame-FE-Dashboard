import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type { AssetException } from "../../features/dashboard/types";
import {
  type AssetPriority,
  type GroupedAssets,
  PRIORITY_CONFIGS,
} from "../../features/assets/priorityRules";
import AssetExceptionCard from "./AssetExceptionCard";

const MAX_VISIBLE_PER_GROUP = 3;

interface PriorityColumnProps {
  priority: AssetPriority;
  items: readonly AssetException[];
  onSelect?: (item: AssetException) => void;
}

function PriorityColumn({ priority, items, onSelect }: PriorityColumnProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = PRIORITY_CONFIGS[priority];

  const totalCount = items.length;
  const hasMore = totalCount > MAX_VISIBLE_PER_GROUP;
  const visibleItems = isExpanded || !hasMore ? items : items.slice(0, MAX_VISIBLE_PER_GROUP);
  const hiddenCount = totalCount - MAX_VISIBLE_PER_GROUP;

  return (
    <div
      className={`priority-column priority-column--${config.tone}`}
      data-priority={priority}
      role="region"
      aria-label={`${config.label} (${totalCount} tài sản)`}
    >
      <div className="priority-column-accent-bar" style={{ backgroundColor: config.barColor }} />

      <header className="priority-column-header">
        <div className="priority-column-title-group">
          <span
            className="priority-column-dot"
            style={{ backgroundColor: config.dotColor }}
            aria-hidden="true"
          />
          <h3 className="priority-column-heading">{config.label}</h3>
        </div>
        <span
          className="priority-column-count"
          aria-label={`${totalCount} tài sản`}
        >
          {totalCount}
        </span>
      </header>

      <div className="priority-column-body">
        {totalCount === 0 ? (
          <div className="priority-column-empty">
            <CheckCircle2 size={24} className="priority-empty-icon" aria-hidden="true" />
            <p className="priority-empty-text">Không có tài sản trong nhóm này</p>
          </div>
        ) : (
          <div className="priority-column-card-list">
            {visibleItems.map((item) => (
              <AssetExceptionCard key={item.id} item={item} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="priority-column-footer">
          <button
            type="button"
            className="priority-column-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? "Thu gọn" : `Xem thêm (${hiddenCount})`}</span>
            {isExpanded ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface AssetPriorityBoardProps {
  grouped: GroupedAssets;
  onSelect?: (item: AssetException) => void;
}

export default function AssetPriorityBoard({ grouped, onSelect }: AssetPriorityBoardProps) {
  const mainPriorities: AssetPriority[] = ["high", "medium", "low"];
  const unclassifiedItems = grouped.unclassified;

  return (
    <div className="facility-priority-board">
      <div className="facility-priority-grid">
        {mainPriorities.map((priority) => (
          <PriorityColumn
            key={priority}
            priority={priority}
            items={grouped[priority]}
            onSelect={onSelect}
          />
        ))}
      </div>

      {unclassifiedItems.length > 0 && (
        <div className="facility-unclassified-section">
          <PriorityColumn
            priority="unclassified"
            items={unclassifiedItems}
            onSelect={onSelect}
          />
        </div>
      )}
    </div>
  );
}

export function AssetPriorityBoardSkeleton() {
  return (
    <div className="facility-priority-board facility-priority-board--skeleton" aria-busy="true" aria-label="Đang tải danh sách tài sản…">
      <div className="facility-priority-grid">
        {(["high", "medium", "low"] as const).map((priority) => (
          <div key={priority} className={`priority-column priority-column--${priority} skeleton-column`}>
            <div className="priority-column-accent-bar" />
            <div className="priority-column-header">
              <div className="skeleton-line skeleton-title" style={{ width: "110px", height: "16px" }} />
              <div className="skeleton-line skeleton-count" style={{ width: "24px", height: "16px" }} />
            </div>
            <div className="priority-column-card-list">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

