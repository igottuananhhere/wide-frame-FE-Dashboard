import { useState } from "react";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ScopedDashboardLink from "../common/ScopedDashboardLink";
import { floor1HourlyEnergyThresholdConfig } from "../../data/mock/floor1EnergyDetail.mock";
import type { EnergyPoint } from "../../features/dashboard/types";
import type { FloorRoomSnapshot } from "../../features/floor/types";
import type { TwinDevice } from "../../features/twin/types";
import type {
  DeviceHourlyEnergyReading,
  HourlyEnergyThresholdConfig,
} from "../../features/energy/types";
import {
  buildSuspectDevicesForInterval,
  findExceededHourlyIntervals,
  findPeakEnergyInterval,
  findPeakExceededHourlyInterval,
  selectEnergyChartPoints,
  selectHourlyEnergyIntervals,
  type EnergyChartSource,
} from "../../features/energy/energySelectors";

type EnergyChartProps = {
  data: readonly EnergyPoint[];
  source: EnergyChartSource;
  scopeLabel: string;
  mode?: "hourly" | "cumulative";
  sampleDate?: string;
  scopeNote?: string;
  snapshotTotalKwh?: number;
  lastUpdatedAt?: number;
  isPaused?: boolean;
  currentTimeOverride?: string;
  thresholdConfig?: HourlyEnergyThresholdConfig;
  hourlyDeviceReadings?: readonly DeviceHourlyEnergyReading[];
  devices?: readonly TwinDevice[];
  rooms?: readonly FloorRoomSnapshot[];
  yesterdayData?: readonly EnergyPoint[];
  compareYesterday?: boolean;
  showCaptionInHourlyMode?: boolean;
  includeCumulativeInAriaLabel?: boolean;
};

function formatHourMinute(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatSampleDate(date?: string): string {
  if (!date) return "ngày mẫu không xác định";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function EnergyChart({
  data,
  source,
  scopeLabel,
  mode = "cumulative",
  sampleDate,
  scopeNote,
  snapshotTotalKwh,
  lastUpdatedAt,
  currentTimeOverride,
  thresholdConfig = floor1HourlyEnergyThresholdConfig,
  hourlyDeviceReadings = [],
  devices = [],
  rooms = [],
  yesterdayData = [],
  compareYesterday = false,
  showCaptionInHourlyMode = false,
  includeCumulativeInAriaLabel = false,
}: EnergyChartProps) {
  const [selectedExceededIntervalKey, setSelectedExceededIntervalKey] = useState<string | null>(null);
  const referenceDate = lastUpdatedAt !== undefined ? new Date(lastUpdatedAt) : new Date();
  const currentTime = currentTimeOverride ?? data.at(-1)?.time ?? formatHourMinute(referenceDate);
  const today = new Intl.DateTimeFormat("en-GB", { dateStyle: "short" }).format(referenceDate);
  const sampleDateLabel = formatSampleDate(sampleDate);
  const chartData = selectEnergyChartPoints(data, source, currentTime);

  if (mode === "hourly") {
    const thresholdKwh = thresholdConfig.thresholdKwh;
    const thresholdLabel = thresholdConfig.label;
    const baseHourlyIntervals = selectHourlyEnergyIntervals(data, source, currentTime);
    const yesterdayIntervals = compareYesterday && yesterdayData.length >= 2
      ? selectHourlyEnergyIntervals(yesterdayData, "dated-sample", currentTime)
      : [];
    const yesterdayByInterval = new Map(
      yesterdayIntervals.map((item) => [item.interval, item.kwh]),
    );
    const hourlyIntervals = baseHourlyIntervals.map((item) => ({
      ...item,
      yesterdayKwh: yesterdayByInterval.get(item.interval) ?? null,
    }));
    const peakInterval = findPeakEnergyInterval(baseHourlyIntervals);
    const exceededIntervals = findExceededHourlyIntervals(baseHourlyIntervals, thresholdKwh);
    const peakExceededInterval = findPeakExceededHourlyInterval(baseHourlyIntervals, thresholdKwh);
    const activeExceededInterval = exceededIntervals.find(
      (item) => item.interval === selectedExceededIntervalKey,
    ) ?? peakExceededInterval;

    const hasEnoughTrendData = hourlyIntervals.length >= 2;
    const isSparseTrend = hasEnoughTrendData && hourlyIntervals.length <= 4;
    const firstInterval = hourlyIntervals[0];
    const lastInterval = hourlyIntervals.at(-1);
    const rangeLabel = firstInterval && lastInterval
      ? `${firstInterval.startTime}–${lastInterval.endTime}`
      : "chưa đủ khoảng giờ";

    const suspectDevices = activeExceededInterval
      ? buildSuspectDevicesForInterval(
          activeExceededInterval.interval,
          hourlyDeviceReadings,
          devices,
          rooms,
        )
      : [];
    const totalFloorDeviceCount = rooms.reduce((sum, room) => sum + room.deviceCount, 0) || devices.length;
    const monitoredDeviceCount = new Set(hourlyDeviceReadings.map((item) => item.deviceId)).size || devices.length;

    const ariaLabel = includeCumulativeInAriaLabel
      ? source === "current-day"
        ? `${scopeLabel} cumulative energy (kWh) and hourly consumption (kWh per hour) today ${today} (${rangeLabel})${scopeNote ? `; ${scopeNote}` : ""}`
        : `${scopeLabel} cumulative energy (kWh) and hourly consumption; static sample from ${sampleDateLabel} (${rangeLabel})`
      : source === "current-day"
        ? `${scopeLabel} hourly energy consumption (kWh per hour) today ${today} (${rangeLabel})${scopeNote ? `; ${scopeNote}` : ""}`
        : `${scopeLabel} hourly energy consumption (kWh per hour); static sample from ${sampleDateLabel} (${rangeLabel})`;

    const fullDayEnd = data.at(-1)?.time ?? "17:00";
    const fullDayKwh = snapshotTotalKwh ?? data.at(-1)?.kwh;
    const hourlyCaption = source === "current-day"
      ? `${scopeLabel} · Dữ liệu đã ghi nhận ngày ${today} (khung ${rangeLabel}, đơn vị: kWh trong mỗi giờ) · Tổng đã ghi nhận (00:00–${fullDayEnd}): ${(fullDayKwh ?? 0).toFixed(1)} kWh${scopeNote ? ` · ${scopeNote}` : ""}.`
      : `${scopeLabel} · Dữ liệu mẫu tĩnh ngày ${sampleDateLabel} (khung ${rangeLabel}, đơn vị: kWh trong mỗi giờ) · không phải số đo hôm nay.`;

    return (
      <div className="energy-chart-frame">
        <div className="energy-chart-threshold-bar" aria-label="Ngưỡng cảnh báo tiêu thụ theo giờ">
          <span className="energy-chart-threshold-swatch" aria-hidden="true" />
          <span className="energy-chart-threshold-text">{thresholdLabel}</span>
          {peakExceededInterval ? (
            <span className="energy-chart-threshold-state energy-chart-threshold-state--alert">
              Đỉnh {peakExceededInterval.interval}: {peakExceededInterval.kwh.toFixed(1)} kWh (vượt +{peakExceededInterval.excessKwh.toFixed(1)} kWh)
            </span>
          ) : (
            <span className="energy-chart-threshold-state">
              {hasEnoughTrendData && peakInterval
                ? `Trong ngưỡng (đỉnh ${peakInterval.kwh.toFixed(1)} / ${thresholdKwh.toFixed(1)} kWh)`
                : "Chưa vượt ngưỡng"}
            </span>
          )}
        </div>

        {hasEnoughTrendData ? (
          <div
            className={`energy-chart${isSparseTrend ? " energy-chart--sparse" : ""}`}
            role="img"
            aria-label={ariaLabel}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyIntervals} margin={{ top: 14, right: 14, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="var(--color-chart-grid, rgba(160, 188, 205, 0.13))" strokeDasharray="3 5" vertical={false} />
                <XAxis
                  dataKey="interval"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-chart-tick, #b5c6d3)", fontSize: 10 }}
                  minTickGap={18}
                  label={{ value: "Khoảng giờ", position: "insideBottomRight", offset: -4, fill: "var(--color-chart-tick, #b5c6d3)", fontSize: 9 }}
                />
                <YAxis
                  domain={[0, (dataMax: number) => Math.max(Math.ceil(dataMax + 2), Math.ceil(thresholdKwh + 2))]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-chart-tick, #b5c6d3)", fontSize: 10 }}
                  tickFormatter={(value: number) => `${value}`}
                  label={{ value: "kWh trong mỗi giờ", angle: -90, position: "insideLeft", fill: "var(--color-chart-tick, #b5c6d3)", fontSize: 9 }}
                />
                <ReferenceLine
                  y={thresholdKwh}
                  stroke="var(--color-chart-threshold, #f59e0b)"
                  strokeDasharray="6 4"
                  strokeWidth={1.8}
                  ifOverflow="extendDomain"
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid var(--color-chart-tooltip-border, #30485d)",
                    borderRadius: 8,
                    background: "var(--color-chart-tooltip-bg, #0c1b29)",
                    color: "var(--color-chart-tooltip-text, #f4f8fb)",
                  }}
                  labelStyle={{ color: "var(--color-chart-tooltip-label, #c4d2de)" }}
                  labelFormatter={(label) => `Khoảng giờ: ${String(label)}`}
                  formatter={(value, name) => {
                    const num = Number(value);
                    if (name === "Cùng giờ hôm qua") {
                      return [`${num.toFixed(1)} kWh`, "Cùng giờ hôm qua"];
                    }
                    const diff = Number((num - thresholdKwh).toFixed(1));
                    return [
                      diff > 0
                        ? `${num.toFixed(1)} kWh (vượt ngưỡng +${diff.toFixed(1)} kWh)`
                        : `${num.toFixed(1)} kWh (ngưỡng ${thresholdKwh.toFixed(1)} kWh)`,
                      "Điện năng tiêu thụ",
                    ];
                  }}
                />
                {compareYesterday && yesterdayIntervals.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey="yesterdayKwh"
                    name="Cùng giờ hôm qua"
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth={1.8}
                    connectNulls={false}
                    dot={{ r: 2.5, fill: "#94a3b8", strokeWidth: 0 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="kwh"
                  name="Điện năng tiêu thụ"
                  stroke="var(--color-chart-line, #42d7ee)"
                  strokeWidth={2.5}
                  connectNulls={false}
                  dot={(dotProps) => {
                    const { cx, cy, payload } = dotProps as {
                      cx?: number;
                      cy?: number;
                      payload?: { interval: string; kwh: number };
                    };
                    if (cx === undefined || cy === undefined || !payload) return <g key="empty" />;
                    const isExceeded = payload.kwh > thresholdKwh;
                    const isPeakExceeded = payload.interval === peakExceededInterval?.interval;
                    const isSelected = payload.interval === activeExceededInterval?.interval;
                    if (!isExceeded) {
                      return (
                        <circle
                          key={payload.interval}
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill="var(--color-chart-line, #42d7ee)"
                        />
                      );
                    }
                    return (
                      <circle
                        key={payload.interval}
                        cx={cx}
                        cy={cy}
                        r={isPeakExceeded || isSelected ? 6 : 5}
                        fill={isPeakExceeded ? "#ef4444" : "#f59e0b"}
                        stroke="#fef3c7"
                        strokeWidth={isSelected ? 2.2 : 1.5}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedExceededIntervalKey(payload.interval)}
                      />
                    );
                  }}
                  activeDot={{ r: 5, fill: "var(--color-chart-line, #42d7ee)", stroke: "var(--color-chart-dot-stroke, #102a39)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            className="energy-chart energy-chart--empty energy-chart--insufficient"
            role="img"
            aria-label={ariaLabel}
          >
            <div className="energy-chart-insufficient-card" role="status">
              <div className="energy-chart-insufficient-head">
                <strong>
                  {data.length === 0 && (Boolean(sampleDate) || source === "dated-sample")
                    ? "Chưa có dữ liệu lịch sử cho kỳ đã chọn"
                    : "Chưa đủ dữ liệu để hiển thị xu hướng"}
                </strong>
                <span>
                  {data.length === 0 && (Boolean(sampleDate) || source === "dated-sample")
                    ? "Hệ thống không tự sinh số liệu giả lập cho các ngày chưa có bản ghi telemetry."
                    : hourlyIntervals.length === 1 && firstInterval
                      ? `Mới có 1 khoảng giờ thực có dữ liệu (${firstInterval.interval}: ${firstInterval.kwh.toFixed(1)} kWh). Cần tối thiểu 2 khoảng giờ để vẽ biểu đồ xu hướng.`
                      : chartData.length === 1
                        ? `Mới có 1 mốc đo lũy kế tại ${chartData[0]!.time} (${chartData[0]!.kwh.toFixed(1)} kWh tích lũy 00:00–${chartData[0]!.time}, không phải điện năng riêng của giờ ${chartData[0]!.time}). Cần tối thiểu 2 lần đo liên tiếp để tính điện năng theo giờ.`
                        : `Chưa có khoảng giờ thực nào có dữ liệu trước ${currentTime}. Cần tối thiểu 2 khoảng giờ có dữ liệu để hiển thị biểu đồ.`}
                </span>
              </div>
              {hourlyIntervals.length === 1 && firstInterval && (
                <div className="energy-chart-insufficient-metrics">
                  <div>
                    <small>Khoảng giờ đã ghi nhận ({firstInterval.interval})</small>
                    <strong>{firstInterval.kwh.toFixed(1)} kWh trong giờ</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {hasEnoughTrendData && peakExceededInterval && activeExceededInterval && (
          <div className="energy-exceeded-analysis" aria-label="Phân tích giờ vượt ngưỡng">
            <div className="energy-exceeded-summary" role="status">
              <div className="energy-exceeded-summary-head">
                <span className="energy-exceeded-badge">
                  <AlertTriangle aria-hidden="true" size={13} /> VƯỢT NGƯỠNG GIỜ
                </span>
                <span className="energy-simulation-pill">Dữ liệu mô phỏng</span>
              </div>
              <div className="energy-exceeded-metrics">
                <div>
                  <small>Khung giờ vượt ngưỡng</small>
                  <strong>{activeExceededInterval.interval}</strong>
                </div>
                <div>
                  <small>Điện năng thực tế</small>
                  <strong>{activeExceededInterval.kwh.toFixed(1)} kWh</strong>
                </div>
                <div>
                  <small>Ngưỡng cảnh báo</small>
                  <strong>{activeExceededInterval.thresholdKwh.toFixed(1)} kWh/giờ</strong>
                </div>
                <div>
                  <small>Mức vượt ngưỡng</small>
                  <strong className="is-exceeded">+{activeExceededInterval.excessKwh.toFixed(1)} kWh</strong>
                </div>
              </div>
              {exceededIntervals.length > 0 && (
                <div className="energy-exceeded-hour-selector" role="group" aria-label="Chọn khung giờ vượt ngưỡng">
                  <span>Giờ vượt ngưỡng ({exceededIntervals.length}):</span>
                  {exceededIntervals.map((item) => {
                    const isCurrent = item.interval === activeExceededInterval.interval;
                    const isPeak = item.interval === peakExceededInterval.interval;
                    return (
                      <button
                        key={item.interval}
                        type="button"
                        className={`energy-exceeded-hour-btn${isCurrent ? " is-active" : ""}`}
                        aria-pressed={isCurrent}
                        onClick={() => setSelectedExceededIntervalKey(item.interval)}
                      >
                        {item.interval} · {item.kwh.toFixed(1)} kWh (+{item.excessKwh.toFixed(1)} kWh)
                        {isPeak ? " · Đỉnh" : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <section className="energy-suspect-panel" aria-label="Thiết bị nghi vấn">
              <header className="energy-suspect-header">
                <div>
                  <h3>Thiết bị nghi vấn · Khung giờ {activeExceededInterval.interval}</h3>
                  <p>
                    Phạm vi theo dõi POC: Mới có dữ liệu đo riêng theo giờ cho{" "}
                    <strong>{monitoredDeviceCount}/{totalFloorDeviceCount} thiết bị</strong> tại {scopeLabel}.
                    Xếp hạng ưu tiên theo <strong>mức tăng bất thường</strong> so với thông thường của chính thiết bị đó;
                    chưa khẳng định nguyên nhân của toàn {scopeLabel}.
                  </p>
                </div>
                <span className="energy-simulation-pill">Dữ liệu mô phỏng</span>
              </header>

              {suspectDevices.length > 0 ? (
                <ul className="energy-suspect-list" aria-label={`Danh sách thiết bị nghi vấn khung giờ ${activeExceededInterval.interval}`}>
                  {suspectDevices.map((device, index) => (
                    <li key={device.deviceId} className="energy-suspect-item">
                      <div className="energy-suspect-main">
                        <span className="energy-suspect-rank">#{index + 1}</span>
                        <div>
                          <div className="energy-suspect-title">
                            <strong>{device.name}</strong>
                            <span className="energy-suspect-area">{device.roomName} · {device.type}</span>
                          </div>
                          <span className="energy-suspect-delta">
                            Thực tế trong giờ: <strong>{device.hourlyKwh.toFixed(1)} kWh</strong> ·{" "}
                            {device.excessKwh > 0
                              ? `Tăng +${device.excessKwh.toFixed(1)} kWh (+${device.excessPercent.toFixed(1)}%) so với thông thường (${device.baselineHourlyKwh.toFixed(1)} kWh/giờ)`
                              : `Ngang mức thông thường (${device.baselineHourlyKwh.toFixed(1)} kWh/giờ)`}
                          </span>
                        </div>
                      </div>
                      <ScopedDashboardLink
                        className="energy-suspect-link"
                        to={
                          device.assetId
                            ? `/dashboard/assets?assetId=${encodeURIComponent(device.assetId)}`
                            : `/dashboard/devices?deviceId=${encodeURIComponent(device.deviceId)}`
                        }
                        aria-label={`Mở hồ sơ thiết bị: ${device.name}`}
                      >
                        Mở hồ sơ thiết bị <ArrowUpRight aria-hidden="true" size={13} />
                      </ScopedDashboardLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="energy-suspect-empty" role="status">
                  Chưa đủ dữ liệu để xác định thiết bị liên quan trong khung giờ {activeExceededInterval.interval}
                  {" "}(không suy ra điện năng theo giờ của thiết bị từ tổng điện năng cả ngày).
                </p>
              )}
            </section>
          </div>
        )}
        {showCaptionInHourlyMode && (
          <p className="energy-chart-caption">{hourlyCaption}</p>
        )}
      </div>
    );
  }

  const yesterdayByTime = new Map(
    yesterdayData.map((point) => [point.time, point.kwh]),
  );
  const enrichedChartData = chartData.map((point, index) => {
    const prevKwh = index > 0 ? chartData[index - 1]!.kwh : 0;
    const hourlyDelta = Number(Math.max(0, point.kwh - prevKwh).toFixed(1));
    return {
      ...point,
      hourlyKwh: hourlyDelta,
      yesterdayKwh: compareYesterday ? (yesterdayByTime.get(point.time) ?? null) : null,
    };
  });

  const hasEnoughTrendData = enrichedChartData.length >= 2;
  const isSparseTrend = hasEnoughTrendData && enrichedChartData.length <= 4;
  const fullDayEnd = data.at(-1)?.time ?? "17:00";
  const fullDayKwh = snapshotTotalKwh ?? data.at(-1)?.kwh;

  const ariaLabel = source === "current-day"
    ? `${scopeLabel} cumulative energy (kWh) by hour today ${today} through ${currentTime}${scopeNote ? `; ${scopeNote}` : ""}`
    : `${scopeLabel} cumulative energy (kWh) by hour; static sample from ${sampleDateLabel}, ${data[0]?.time ?? "—"} to ${data.at(-1)?.time ?? "—"}`;
  const caption = source === "current-day"
    ? `${scopeLabel} · Mô phỏng ngày ${today} · Điểm biểu đồ: điện năng lũy kế đến từng mốc giờ (kWh, 08:00→${currentTime}) · Tổng ảnh chụp mô phỏng trong ngày (00:00–${fullDayEnd}): ${(fullDayKwh ?? 0).toFixed(1)} kWh${scopeNote ? ` · ${scopeNote}` : ""}.`
    : `${scopeLabel} · Dữ liệu mẫu tĩnh ngày ${sampleDateLabel} (${data[0]?.time ?? "08:00"}–${fullDayEnd}, đơn vị: kWh lũy kế theo giờ) · không phải số đo hôm nay.`;

  return (
    <div className="energy-chart-frame">
      {hasEnoughTrendData ? (
        <div
          className={`energy-chart${isSparseTrend ? " energy-chart--sparse" : ""}`}
          role="img"
          aria-label={ariaLabel}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={enrichedChartData} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="var(--color-chart-grid, rgba(160, 188, 205, 0.13))" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-chart-tick, #b5c6d3)", fontSize: 10 }}
                minTickGap={24}
                label={{ value: "Mốc giờ (HH:mm)", position: "insideBottomRight", offset: -4, fill: "var(--color-chart-tick, #b5c6d3)", fontSize: 9 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-chart-tick, #b5c6d3)", fontSize: 10 }}
                tickFormatter={(value: number) => `${value}`}
                label={{ value: "kWh lũy kế", angle: -90, position: "insideLeft", fill: "var(--color-chart-tick, #b5c6d3)", fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid var(--color-chart-tooltip-border, #30485d)",
                  borderRadius: 8,
                  background: "var(--color-chart-tooltip-bg, #0c1b29)",
                  color: "var(--color-chart-tooltip-text, #f4f8fb)",
                }}
                labelStyle={{ color: "var(--color-chart-tooltip-label, #c4d2de)" }}
                formatter={(value, name, item) => {
                  if (name === "Cùng giờ hôm qua") {
                    return [`${Number(value).toFixed(1)} kWh lũy kế`, "Cùng giờ hôm qua"];
                  }
                  const hourly = (item?.payload as { hourlyKwh?: number } | undefined)?.hourlyKwh;
                  return [
                    `${value} kWh lũy kế${hourly !== undefined ? ` (+${hourly.toFixed(1)} kWh/giờ)` : ""}`,
                    "Điện năng theo mốc giờ",
                  ];
                }}
              />
              {compareYesterday && yesterdayData.length > 0 && (
                <Line
                  type="monotone"
                  dataKey="yesterdayKwh"
                  name="Cùng giờ hôm qua"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1.8}
                  connectNulls={false}
                  dot={{ r: 2.5, fill: "#94a3b8", strokeWidth: 0 }}
                />
              )}
              <Line
                type="monotone"
                dataKey="kwh"
                stroke="var(--color-chart-line, #42d7ee)"
                strokeWidth={2.5}
                connectNulls={false}
                dot={{ r: 3, fill: "var(--color-chart-line, #42d7ee)", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "var(--color-chart-line, #42d7ee)", stroke: "var(--color-chart-dot-stroke, #102a39)", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          className="energy-chart energy-chart--empty energy-chart--insufficient"
          role="img"
          aria-label={ariaLabel}
        >
          <div className="energy-chart-insufficient-card" role="status">
            <div className="energy-chart-insufficient-head">
              <strong>
                {data.length === 0 && (Boolean(sampleDate) || source === "dated-sample")
                  ? "Chưa có dữ liệu lịch sử cho kỳ đã chọn"
                  : "Chưa đủ dữ liệu để hiển thị xu hướng"}
              </strong>
              <span>
                {data.length === 0 && (Boolean(sampleDate) || source === "dated-sample")
                  ? "Hệ thống không tự sinh số liệu giả lập cho các ngày chưa có bản ghi telemetry."
                  : enrichedChartData.length === 1
                    ? `Mới có 1 mốc đo theo giờ đến ${currentTime} (mốc ${enrichedChartData[0]!.time}: ${enrichedChartData[0]!.kwh.toFixed(1)} kWh lũy kế đầu ca). Cần tối thiểu 2 mốc giờ để vẽ đường xu hướng.`
                    : `Chưa có mốc đo theo giờ nào trước ${currentTime}. Cần tối thiểu 2 mốc giờ trong ngày để vẽ đường xu hướng.`}
              </span>
            </div>
            <div className="energy-chart-insufficient-metrics">
              {enrichedChartData.length === 1 && (
                <div>
                  <small>Điểm theo giờ ({enrichedChartData[0]!.time})</small>
                  <strong>{enrichedChartData[0]!.kwh.toFixed(1)} kWh (00:00–{enrichedChartData[0]!.time})</strong>
                </div>
              )}
              {fullDayKwh !== undefined && data.length > 0 && (
                <div>
                  <small>Tổng tích lũy kịch bản mô phỏng (00:00–{fullDayEnd})</small>
                  <strong>{fullDayKwh.toFixed(1)} kWh (lũy kế ngày)</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <p className="energy-chart-caption">{caption}</p>
    </div>
  );
}

