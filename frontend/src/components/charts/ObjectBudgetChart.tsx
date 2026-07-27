import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { formatCompact } from "../../utils/format";
import { computeNiceTicks } from "../../utils/chart";

interface ObjectBudgetPoint {
  objectName: string;
  budget: number;
  spent: number;
}

const SERIES = [
  { key: "budget", label: "Бюджет", color: "#2869C9" },
  { key: "spent", label: "Потрачено", color: "#FF6B00" },
];

export function ObjectBudgetChart({ data }: { data: ObjectBudgetPoint[] }) {
  const maxValue = Math.max(0, ...data.map((d) => Math.max(d.budget, d.spent)));
  const ticks = computeNiceTicks(maxValue);
  const niceMax = ticks[ticks.length - 1];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={4} barCategoryGap="24%">
        <CartesianGrid vertical={false} stroke="#EFEFED" strokeDasharray="3 3" />
        <XAxis dataKey="objectName" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} interval={0} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          domain={[0, niceMax]}
          ticks={ticks}
          tickFormatter={(v: number) => formatCompact(v)}
          tick={{ fontSize: 11, fill: "#9CA3AF" }}
          width={54}
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
        <Bar dataKey="budget" name="Бюджет" fill="#2869C9" radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar dataKey="spent" name="Потрачено" fill="#FF6B00" radius={[3, 3, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
