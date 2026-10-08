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

type EnergyChartProps = { data: readonly EnergyPoint[] };

export default function EnergyChart({ data }: EnergyChartProps) {
  return (
    <div className="energy-chart" role="img" aria-label="Energy consumption today">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="rgba(160, 188, 205, 0.13)" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: "#b5c6d3", fontSize: 10 }} minTickGap={24} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#b5c6d3", fontSize: 10 }} tickFormatter={(value: number) => `${value}`} />
          <Tooltip
            contentStyle={{ border: "1px solid #30485d", borderRadius: 8, background: "#0c1b29", color: "#f4f8fb" }}
            labelStyle={{ color: "#c4d2de" }}
            formatter={(value) => [`${value} kWh`, "Điện năng lũy kế"]}
          />
          <Line type="monotone" dataKey="kwh" stroke="#42d7ee" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#42d7ee", stroke: "#102a39", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
