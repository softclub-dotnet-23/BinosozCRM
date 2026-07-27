import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BudgetPoint } from "../../types";
import { ChartTooltip } from "./ChartTooltip";
import { formatCompact } from "../../utils/format";
import { computeNiceTicks } from "../../utils/chart";

const SERIES = [
  { key: "planned", label: "Запланировано", color: "#2869C9" },
  { key: "spent", label: "Потрачено", color: "#FF6B00" },
];

export function BudgetChart({ data }: { data: BudgetPoint[] }) {
  const maxValue = Math.max(0, ...data.map((d) => Math.max(d.planned, d.spent)));
  const ticks = computeNiceTicks(maxValue);
  const niceMax = ticks[ticks.length - 1];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="#EFEFED" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          interval={4}
          tickMargin={8}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          domain={[0, niceMax]}
          ticks={ticks}
          tickFormatter={(v: number) => formatCompact(v)}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          width={54}
        />
        <Tooltip
          cursor={{ fill: "#F5F5F4" }}
          content={(props) => <ChartTooltip {...props} series={SERIES} />}
        />
        <Legend
          verticalAlign="top"
          align="left"
          height={36}
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-ink-secondary">{value}</span>}
        />
        <Bar dataKey="planned" name="Запланировано" fill="#2869C9" radius={[3, 3, 0, 0]} maxBarSize={7} />
        <Bar dataKey="spent" name="Потрачено" fill="#FF6B00" radius={[3, 3, 0, 0]} maxBarSize={7} />
      </BarChart>
    </ResponsiveContainer>
  );
}
