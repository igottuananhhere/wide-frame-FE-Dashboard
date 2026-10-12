import { useMemo, useState } from "react";
import { AlertCircle, ArrowUpRight, LayoutGrid, Table as TableIcon } from "lucide-react";
import ScopedDashboardLink from "../common/ScopedDashboardLink";
import type { AssetException } from "../../features/dashboard/types";
import type { TwinAlert, TwinDevice, TwinSensor, TwinSimulationEvent } from "../../features/twin/types";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import type { Floor } from "../../types/models";
import type { DeviceEnergyReading } from "../../features/energy/types";
import { groupAssetsByPriority } from "../../features/assets/priorityRules";
import AssetExceptionTable from "./AssetExceptionTable";
import AssetPriorityBoard, { AssetPriorityBoardSkeleton } from "./AssetPriorityBoard";
import AssetDetailDrawer from "./AssetDetailDrawer";

export type AssetViewMode = "cards" | "table";

export interface AssetExceptionsSectionProps {
  items: readonly AssetException[];
  alerts?: readonly TwinAlert[];
  devices?: readonly TwinDevice[];
  sensors?: readonly TwinSensor[];
  rooms?: readonly FloorRoomSnapshot[];
  floors?: readonly Floor[];
  energyReadings?: readonly DeviceEnergyReading[];
  events?: readonly TwinSimulationEvent[];
  buildingName?: string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  eyebrow?: string;
  title?: string;
  allAssetsLink?: string;
  initialViewMode?: AssetViewMode;
  onSelectAsset?: (item: AssetException) => void;
  selectedAsset?: AssetException | null;
}

export default function AssetExceptionsSection({
  items,
  alerts,
  devices = [],
  sensors = [],
  rooms = [],
  floors = [],
  energyReadings = [],
  events = [],
  buildingName = "ICS Headquarters",
  isLoading = false,
  error = null,
  onRetry,
  eyebrow = "THIẾT BỊ & BẢO TRÌ · TẤT CẢ TẦNG CÓ DỮ LIỆU",
  title = "Tài sản cần xử lý",
  allAssetsLink = "/dashboard/assets",
  initialViewMode = "cards",
  onSelectAsset,
  selectedAsset: controlledSelectedAsset,
}: AssetExceptionsSectionProps) {
  const [viewMode, setViewMode] = useState<AssetViewMode>(initialViewMode);
  const [internalSelectedAsset, setInternalSelectedAsset] = useState<AssetException | null>(null);

  const selectedAsset = controlledSelectedAsset !== undefined
    ? controlledSelectedAsset
    : internalSelectedAsset;

  const handleSelectAsset = (item: AssetException) => {
    if (onSelectAsset) {
      onSelectAsset(item);
    }
    if (controlledSelectedAsset === undefined) {
      setInternalSelectedAsset(item);
    }
  };

  const handleCloseDrawer = () => {
    if (controlledSelectedAsset === undefined) {
      setInternalSelectedAsset(null);
    }
  };

  const priorityContext = useMemo(
    () => ({ alerts, devices }),
    [alerts, devices],
  );

  const grouped = useMemo(
    () => groupAssetsByPriority(items, priorityContext),
    [items, priorityContext],
  );

  return (
    <section className="overview-panel asset-exceptions-panel" aria-labelledby="building-assets-title">
      <header className="overview-panel-heading asset-exceptions-heading">
        <div className="asset-exceptions-heading-title">
          <p className="section-eyebrow">{eyebrow}</p>
          <h2 id="building-assets-title">{title}</h2>
        </div>

        <div className="asset-exceptions-heading-actions">
          <div
            className="asset-view-switcher"
            role="group"
            aria-label="Chế độ xem tài sản"
          >
            <button
              type="button"
              className={`asset-view-toggle-btn ${viewMode === "cards" ? "is-active" : ""}`}
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
              aria-label="Chế độ Thẻ"
            >
              <LayoutGrid size={13} aria-hidden="true" />
              <span>Thẻ</span>
            </button>
            <button
              type="button"
              className={`asset-view-toggle-btn ${viewMode === "table" ? "is-active" : ""}`}
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
              aria-label="Chế độ Bảng"
            >
              <TableIcon size={13} aria-hidden="true" />
              <span>Bảng</span>
            </button>
          </div>

          <ScopedDashboardLink className="panel-text-link" to={allAssetsLink}>
            <span>Tất cả tài sản</span>
            <ArrowUpRight aria-hidden="true" size={14} />
          </ScopedDashboardLink>
        </div>
      </header>

      {isLoading ? (
        <AssetPriorityBoardSkeleton />
      ) : error ? (
        <div className="asset-exceptions-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div className="asset-exceptions-error-content">
            <p><strong>Lỗi tải dữ liệu:</strong> {error}</p>
            {onRetry && (
              <button
                type="button"
                className="asset-exceptions-retry-btn"
                onClick={onRetry}
              >
                Thử lại
              </button>
            )}
          </div>
        </div>
      ) : items.length === 0 ? (
        <p className="building-empty-state">Hiện không có tài sản cần xử lý.</p>
      ) : viewMode === "cards" ? (
        <AssetPriorityBoard grouped={grouped} onSelect={handleSelectAsset} />
      ) : (
        <AssetExceptionTable items={items} onSelect={handleSelectAsset} />
      )}

      <p className="detail-panel-footnote">
        Danh sách lấy từ thiết bị có trạng thái bất thường hoặc cần bảo trì ở các tầng đã cấu hình.
      </p>

      {selectedAsset && (
        <AssetDetailDrawer
          item={selectedAsset}
          devices={devices}
          sensors={sensors}
          rooms={rooms}
          floors={floors}
          alerts={alerts}
          energyReadings={energyReadings}
          events={events}
          buildingName={buildingName}
          onClose={handleCloseDrawer}
        />
      )}
    </section>
  );
}

