import { ArrowUpRight } from "lucide-react";
import TableScrollHint from "../common/TableScrollHint";
import ScopedDashboardLink from "../common/ScopedDashboardLink";
import type { AssetException } from "../../features/dashboard/types";
import StatusBadge from "./StatusBadge";

type AssetExceptionTableProps = {
  items: readonly AssetException[];
  onSelect?: (item: AssetException) => void;
};

export default function AssetExceptionTable({ items, onSelect }: AssetExceptionTableProps) {
  const handleLinkClick = (e: React.MouseEvent, item: AssetException) => {
    if (onSelect) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(item);
    }
  };

  return (
    <div className="asset-table-scroll" role="region" aria-label="Asset exceptions table; horizontal scroll to see all columns" tabIndex={0}>
      <table className="asset-exception-table" aria-label="Asset exceptions">
        <thead>
          <tr>
            <th scope="col">Device</th>
            <th scope="col">Type</th>
            <th scope="col">Area</th>
            <th scope="col">Status</th>
            <th scope="col">Issue</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className={onSelect ? "asset-table-row-selectable" : undefined}
              onClick={() => onSelect?.(item)}
              tabIndex={onSelect ? 0 : undefined}
              role={onSelect ? "button" : undefined}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && onSelect) {
                  e.preventDefault();
                  onSelect(item);
                }
              }}
              aria-label={onSelect ? `${item.id}: Nhấn để mở chi tiết` : undefined}
            >
              <th scope="row"><span className="asset-id">{item.id}</span></th>
              <td>{item.type}</td>
              <td>{item.area}</td>
              <td><StatusBadge status={item.status} /></td>
              <td>{item.issue}</td>
              <td>
                <ScopedDashboardLink
                  className="asset-action-link"
                  to={item.assetId
                    ? `/dashboard/assets?assetId=${encodeURIComponent(item.assetId)}`
                    : `/dashboard/devices?deviceId=${encodeURIComponent(item.deviceId)}`}
                  aria-label={`${item.actionLabel}: ${item.id}`}
                  onClick={(e) => handleLinkClick(e, item)}
                >
                  {item.actionLabel}<ArrowUpRight aria-hidden="true" size={14} />
                </ScopedDashboardLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TableScrollHint />
    </div>
  );
}
