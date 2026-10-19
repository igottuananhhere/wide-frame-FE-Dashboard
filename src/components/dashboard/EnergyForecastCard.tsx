import { Gauge, Layers, TrendingDown, TrendingUp } from "lucide-react";
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
  const readingDateFormatted = formatReadingDate(forecast.readingDate);

  return (
    <section className="energy-forecast-card" aria-labelledby="energy-forecast-title">
      <header className="energy-forecast-header">
        <div>
          <p className="section-eyebrow">METER FORECAST · {forecast.meterId}</p>
          <h2 id="energy-forecast-title">Chi phí điện ước tính tháng này</h2>
        </div>
        <div className="energy-forecast-header-badges">
          {forecast.scopeSummaryLabel && (
            <span className="energy-forecast-scope-pill">
              <Layers aria-hidden="true" size={13} />
              {forecast.scopeSummaryLabel}
            </span>
          )}
          <span className="energy-forecast-demo-tag">ƯỚC TÍNH DEMO · DỮ LIỆU ĐỒNG BỘ</span>
        </div>
      </header>

      <div className="energy-forecast-content">
        <div className="energy-forecast-primary">
          <span className="energy-forecast-caption">
            Chi phí điện ước tính đến cuối kỳ · {forecast.currentPeriodLabel}
          </span>
          <strong>{currency.format(forecast.projectedCostVnd)}</strong>
          <span className="energy-forecast-trace">
            = {number.format(forecast.projectedKwh)} kWh dự báo × {currency.format(forecast.averageRateVndPerKwh)}/kWh
          </span>
          <span className={`energy-forecast-comparison${isLower ? " is-lower" : " is-higher"}`}>
            <DirectionIcon aria-hidden="true" size={15} />
            {comparisonLabel} {Math.abs(forecast.changePercent).toFixed(1)}% ({currency.format(Math.abs(forecast.changeVnd))})
          </span>
        </div>

        <dl className="energy-forecast-breakdown">
          <div>
            <dt>Điện năng đã ghi nhận ({forecast.elapsedDays}/{forecast.daysInBillingPeriod} ngày)</dt>
            <dd>{number.format(forecast.adjustedMonthToDateKwh)} kWh</dd>
            <span>Trung bình {number.format(forecast.dailyAverageKwh)} kWh/ngày · đến {readingDateFormatted}</span>
          </div>
          <div>
            <dt>Điện năng dự báo cả kỳ</dt>
            <dd>{number.format(forecast.projectedKwh)} kWh</dd>
            <span>Đơn giá áp dụng: {currency.format(forecast.averageRateVndPerKwh)}/kWh</span>
          </div>
          <div>
            <dt>{forecast.previousMonthLabel} · thực tế mẫu</dt>
            <dd>{currency.format(forecast.previousMonthActualCostVnd)}</dd>
            <span>{number.format(forecast.previousMonthActualKwh)} kWh</span>
          </div>
          <div>
            <dt>Mốc dữ liệu cuối & Phạm vi</dt>
            <dd>{readingDateFormatted}</dd>
            <span>{forecast.lastUpdatedTimeLabel ?? `Đồng bộ đến ${readingDateFormatted}`}</span>
          </div>
        </dl>
      </div>

      <p className="energy-forecast-disclosure">
        <Gauge aria-hidden="true" size={14} />
        <span>
          <strong>{forecast.meterId}</strong> · Tính từ cùng nguồn dữ liệu điện năng tổng hợp của các tầng có dữ liệu trong phạm vi chọn đến ngày <strong>{readingDateFormatted}</strong>.
          Đơn giá {currency.format(forecast.averageRateVndPerKwh)}/kWh là đơn giá minh họa cố định; đây <strong>không phải hóa đơn thực tế</strong> và chưa bao gồm biểu giá bậc thang, phụ phí công suất hay thuế GTGT.
        </span>
      </p>
    </section>
  );
}
