import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ObjectProgressPoint } from "../../types";
import { ChartTooltip } from "./ChartTooltip";

const SERIES = [
  { key: "planned", label: "Плановый прогресс", color: "#2869C9", unit: "%" },
  { key: "actual", label: "Фактический прогресс", color: "#FF6B00", unit: "%" },
];

export function ProgressChart({ data }: { data: ObjectProgressPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={4} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="#EFEFED" strokeDasharray="3 3" />
        <XAxis
          dataKey="objectName"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          interval={0}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          width={48}
        />
        <Tooltip cursor={{ fill: "#F5F5F4" }} content={(props) => <ChartTooltip {...props} series={SERIES} />} />
        <Legend
          verticalAlign="top"
          align="left"
          height={36}
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-ink-secondary">{value}</span>}
        />
        <Bar dataKey="planned" name="Плановый прогресс (%)" fill="#2869C9" radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar dataKey="actual" name="Фактический прогресс (%)" fill="#FF6B00" radius={[3, 3, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
