import { ArrowUpRight, Clock3 } from "lucide-react";
import ScopedDashboardLink from "../common/ScopedDashboardLink";
import type { AssetException } from "../../features/dashboard/types";
import { getAssetTimeInfo } from "../../features/assets/priorityRules";
import StatusBadge from "./StatusBadge";

interface AssetExceptionCardProps {
  item: AssetException;
  onSelect?: (item: AssetException) => void;
}

export default function AssetExceptionCard({ item, onSelect }: AssetExceptionCardProps) {
  const targetUrl = item.assetId
    ? `/dashboard/assets?assetId=${encodeURIComponent(item.assetId)}`
    : `/dashboard/devices?deviceId=${encodeURIComponent(item.deviceId)}`;

  const timeInfo = getAssetTimeInfo(item);

  const handleLinkClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(item);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && onSelect) {
      e.preventDefault();
      onSelect(item);
    }
  };

  return (
    <article
      className="facility-asset-card"
      tabIndex={0}
      role={onSelect ? "button" : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`${item.id} - ${item.issue}. Nhấn để mở chi tiết vận hành`}
    >
      <div className="facility-asset-card-top">
        <div className="facility-asset-card-title-line">
          <span className="facility-asset-card-code">{item.id}</span>
          <span className="facility-asset-card-dot" aria-hidden="true">·</span>
          <span className="facility-asset-card-type">{item.type}</span>
        </div>
        <ScopedDashboardLink
          className="facility-asset-card-quick-link"
          to={targetUrl}
          aria-label={`Chi tiết ${item.id}`}
          onClick={handleLinkClick}
        >
          <ArrowUpRight aria-hidden="true" size={14} />
        </ScopedDashboardLink>
      </div>

      <div className="facility-asset-card-area">
        {item.area}
      </div>

      <div className="facility-asset-card-issue-row">
        <span className="facility-asset-card-issue">{item.issue}</span>
      </div>

      {item.priorityReason && (
        <p className="facility-asset-card-reason">{item.priorityReason}</p>
      )}

      {timeInfo && (
        <div className="facility-asset-card-time">
          <Clock3 aria-hidden="true" size={12} />
          <span>{timeInfo}</span>
        </div>
      )}

      <div className="facility-asset-card-footer">
        <StatusBadge status={item.status} />
        <ScopedDashboardLink
          className="facility-asset-card-action-link"
          to={targetUrl}
          aria-label={`${item.actionLabel}: ${item.id}`}
          onClick={handleLinkClick}
        >
          <span>{item.actionLabel}</span>
          <ArrowUpRight aria-hidden="true" size={13} />
        </ScopedDashboardLink>
      </div>
    </article>
  );
}

