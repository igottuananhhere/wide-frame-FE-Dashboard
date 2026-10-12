import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EnergyPoint } from "../../features/dashboard/types";
import { selectEnergyChartPoints, type EnergyChartSource } from "../../features/energy/energySelectors";

type EnergyChartProps = {
  data: readonly EnergyPoint[];
  source: EnergyChartSource;
  scopeLabel: string;
  sampleDate?: string;
  scopeNote?: string;
};

function formatHourMinute(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatSampleDate(date?: string): string {
  if (!date) return "ngày mẫu không xác định";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export default function EnergyChart({ data, source, scopeLabel, sampleDate, scopeNote }: EnergyChartProps) {
  const now = new Date();
  const currentTime = formatHourMinute(now);
  const today = new Intl.DateTimeFormat("en-GB", { dateStyle: "short" }).format(now);
  const sampleDateLabel = formatSampleDate(sampleDate);
  const chartData = selectEnergyChartPoints(data, source, currentTime);
  const ariaLabel = source === "current-day"
    ? `${scopeLabel} cumulative energy (kWh) by hour today ${today} through ${currentTime}${scopeNote ? `; ${scopeNote}` : ""}`
    : `${scopeLabel} cumulative energy (kWh) by hour; static sample from ${sampleDateLabel}, ${data[0]?.time ?? "—"} to ${data.at(-1)?.time ?? "—"}`;
  const caption = source === "current-day"
    ? `${scopeLabel} · Mô phỏng ngày ${today} · số liệu đến ${currentTime}${scopeNote ? ` · ${scopeNote}` : ""}.`
    : `${scopeLabel} · Dữ liệu mẫu tĩnh ngày ${sampleDateLabel} · không phải số đo hôm nay.`;

  return (
    <div className="energy-chart-frame">
      {chartData.length > 0 ? (
        <div className="energy-chart" role="img" aria-label={ariaLabel}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 8, left: 8 }}>
              <CartesianGrid stroke="rgba(160, 188, 205, 0.13)" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#b5c6d3", fontSize: 10 }}
                minTickGap={24}
                label={{ value: "Giờ", position: "insideBottomRight", offset: -4, fill: "#b5c6d3", fontSize: 9 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#b5c6d3", fontSize: 10 }}
                tickFormatter={(value: number) => `${value}`}
                label={{ value: "kWh lũy kế", angle: -90, position: "insideLeft", fill: "#b5c6d3", fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{ border: "1px solid #30485d", borderRadius: 8, background: "#0c1b29", color: "#f4f8fb" }}
                labelStyle={{ color: "#c4d2de" }}
                formatter={(value) => [`${value} kWh`, "Điện năng lũy kế"]}
              />
              <Line type="monotone" dataKey="kwh" stroke="#42d7ee" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#42d7ee", stroke: "#102a39", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="energy-chart energy-chart--empty" role="status">
          Chưa có số liệu điện năng theo giờ trong ngày.
        </div>
      )}
      <p className="energy-chart-caption">{caption}</p>
    </div>
  );
}
