import { ArrowRight, CalendarDays, Clock3, Cpu, Hash, MapPin, Wrench } from "lucide-react";
import ModulePageHeader from "../../components/common/ModulePageHeader";
import StatusBadge from "../../components/dashboard/StatusBadge";
import { floor1AssetIdentities } from "../../data/mock/floor1AssetIdentities.mock";
import { floor2AssetIdentities } from "../../data/mock/floor2AssetIdentities.mock";
import { getAssetMaintenanceStatus } from "../../features/assets/assetSelectors";
import { useDashboardScopeData } from "../../features/building/useDashboardScope";

const maintenancePresentation = {
  normal: { label: "Đúng lịch", tone: "normal" as const },
  "due-soon": { label: "Sắp đến hạn bảo trì", tone: "warning" as const },
  due: { label: "Đến hạn bảo trì", tone: "critical" as const },
};

export default function AssetsPage() {
  const scope = useDashboardScopeData();
  const { devices, rooms } = scope;
  const roomIds = new Set(rooms.map((room) => room.id));
  const assetIdentities = [...floor1AssetIdentities, ...floor2AssetIdentities]
    .filter((asset) => roomIds.has(asset.roomId));

  return (
    <section className="dashboard-page detail-module-page" aria-labelledby="module-page-title">
      <ModulePageHeader
        section="OPERATION / ASSETS"
        title={`Tài sản & bảo trì · ${scope.scopeLabel}`}
        description={`Digital Identity tập hợp thông tin nhận dạng, vị trí và lịch bảo trì của tài sản trong ${scope.scopeLabel}.`}
        scopeLabel={scope.scopeLabel}
      />

      <section className="asset-identity-section" aria-labelledby="asset-identity-title">
        <header className="detail-panel-header asset-section-heading">
          <div>
            <p className="section-eyebrow">DIGITAL IDENTITY</p>
            <h2 id="asset-identity-title">Hồ sơ tài sản</h2>
          </div>
          <span className="detail-panel-tag">{assetIdentities.length} TÀI SẢN MẪU</span>
        </header>

        {assetIdentities.map((asset) => {
          const device = devices.find((item) => item.id === asset.deviceId);
          const room = rooms.find((item) => item.id === asset.roomId);
          const maintenance = maintenancePresentation[getAssetMaintenanceStatus(device)];
          const runtimeHours = device?.maintenanceHoursRemaining === undefined
            ? asset.runtimeHours
            : asset.maintenanceIntervalHours - device.maintenanceHoursRemaining;
          return (
            <article className="asset-identity-card" key={asset.id}>
              <div className="asset-identity-topline">
                <div className="asset-identity-mark"><Cpu aria-hidden="true" size={21} /></div>
                <div className="asset-identity-name">
                  <p className="section-eyebrow">HVAC · {scope.floors.find((floor) => floor.id === room?.floorId)?.name ?? scope.scopeLabel}</p>
                  <h3>{asset.name}</h3>
                  <span>{asset.manufacturer} · {asset.model}</span>
                </div>
                <StatusBadge status={maintenance.tone} label={maintenance.label} />
              </div>

              <div className="asset-identity-id-row">
                <span>ASSET ID</span>
                <strong>{asset.id}</strong>
                <span className="asset-identity-serial">SERIAL · {asset.serialNumber}</span>
              </div>

              <dl className="asset-identity-fields">
                <div><dt><Hash aria-hidden="true" size={14} /> Manufacturer</dt><dd>{asset.manufacturer}</dd></div>
                <div><dt><Cpu aria-hidden="true" size={14} /> Model</dt><dd>{asset.model}</dd></div>
                <div><dt><MapPin aria-hidden="true" size={14} /> Room</dt><dd>{room?.name ?? "—"}</dd></div>
                <div><dt><CalendarDays aria-hidden="true" size={14} /> Installation date</dt><dd><time dateTime={asset.installationDate}>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(`${asset.installationDate}T00:00:00`))}</time></dd></div>
                <div><dt><Clock3 aria-hidden="true" size={14} /> Runtime hours</dt><dd>{runtimeHours.toLocaleString("en-US")} giờ</dd></div>
                <div><dt><Wrench aria-hidden="true" size={14} /> Maintenance interval</dt><dd>{asset.maintenanceIntervalHours.toLocaleString("en-US")} giờ</dd></div>
              </dl>

              <div className="asset-identity-footer">
                <div className="asset-relationship-chain" aria-label="Asset relationship">
                  <span>{room?.name ?? scope.scopeLabel}</span><ArrowRight aria-hidden="true" size={14} /><span>{asset.name}</span><ArrowRight aria-hidden="true" size={14} /><span>{device?.name ?? asset.deviceId}</span>
                </div>
                <span className="asset-identity-status">Device status: {device?.status ?? "unknown"}</span>
              </div>
            </article>
          );
        })}
      </section>
    </section>
  );
}
