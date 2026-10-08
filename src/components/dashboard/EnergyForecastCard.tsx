import { Gauge, TrendingDown, TrendingUp } from "lucide-react";
import type { MonthlyEnergyForecast } from "../../features/energy/types";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

function formatReadingDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function EnergyForecastCard({ forecast }: { forecast: MonthlyEnergyForecast }) {
  const isLower = forecast.changeVnd < 0;
  const DirectionIcon = isLower ? TrendingDown : TrendingUp;
  const comparisonLabel = isLower ? "Thấp hơn tháng trước" : "Cao hơn tháng trước";

  return (
    <section className="energy-forecast-card" aria-labelledby="energy-forecast-title">
      <header className="energy-forecast-header">
        <div>
          <p className="section-eyebrow">METER FORECAST · {forecast.meterId}</p>
          <h2 id="energy-forecast-title">Dự báo tiền điện tháng này</h2>
        </div>
        <span className="energy-forecast-demo-tag">ƯỚC TÍNH DEMO</span>
      </header>

      <div className="energy-forecast-content">
        <div className="energy-forecast-primary">
          <span className="energy-forecast-caption">Dự kiến đến cuối kỳ · {forecast.currentPeriodLabel}</span>
          <strong>{currency.format(forecast.projectedCostVnd)}</strong>
          <span className={`energy-forecast-comparison${isLower ? " is-lower" : " is-higher"}`}>
            <DirectionIcon aria-hidden="true" size={15} />
            {comparisonLabel} {Math.abs(forecast.changePercent).toFixed(1)}% ({currency.format(Math.abs(forecast.changeVnd))})
          </span>
        </div>

        <dl className="energy-forecast-breakdown">
          <div>
            <dt>{forecast.previousMonthLabel} · thực tế mẫu</dt>
            <dd>{currency.format(forecast.previousMonthActualCostVnd)}</dd>
            <span>{number.format(forecast.previousMonthActualKwh)} kWh</span>
          </div>
          <div>
            <dt>Sản lượng dự báo</dt>
            <dd>{number.format(forecast.projectedKwh)} kWh</dd>
            <span>Đã ghi nhận {number.format(forecast.adjustedMonthToDateKwh)} kWh</span>
          </div>
        </dl>
      </div>

      <p className="energy-forecast-disclosure">
        <Gauge aria-hidden="true" size={14} />
        {forecast.meterId} · chỉ số mock đến {formatReadingDate(forecast.readingDate)} · đơn giá bình quân minh họa {currency.format(forecast.averageRateVndPerKwh)}/kWh. Chưa áp dụng biểu giá bậc thang, thuế hoặc điều chỉnh hóa đơn.
      </p>
    </section>
  );
}
