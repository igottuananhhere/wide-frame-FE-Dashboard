import { ArrowLeft, Layers3 } from "lucide-react";

type FloorNoDataStateProps = {
  floorName: string;
  onBackToBuilding: () => void;
};

export default function FloorNoDataState({ floorName, onBackToBuilding }: FloorNoDataStateProps) {
  return (
    <section className="dashboard-page floor-no-data-page" aria-labelledby="floor-no-data-title">
      <article className="floor-no-data-card">
        <span className="floor-no-data-icon" aria-hidden="true"><Layers3 size={24} /></span>
        <p className="section-eyebrow">ICS HEADQUARTERS / FLOOR STATUS</p>
        <h1 id="floor-no-data-title">{floorName} chưa có dữ liệu</h1>
        <p>Tầng này chưa được cấu hình nguồn dữ liệu, nên chưa có chỉ số vận hành để hiển thị hoặc cộng vào tổng tòa nhà.</p>
        <button className="floor-no-data-back" onClick={onBackToBuilding} type="button">
          <ArrowLeft aria-hidden="true" size={15} /> Về tổng quan tòa nhà
        </button>
      </article>
    </section>
  );
}
