import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { formatCompact } from "../../utils/format";
import { computeNiceTicks } from "../../utils/chart";
import { useLanguage } from "../../context/LanguageContext";

interface ObjectBudgetPoint {
  objectName: string;
  budget: number;
  spent: number;
}

export function ObjectBudgetChart({ data }: { data: ObjectBudgetPoint[] }) {
  const { strings } = useLanguage();
  const SERIES = [
    { key: "budget", label: strings.objects.colBudget, color: "#2869C9" },
    { key: "spent", label: strings.common.spentLabel, color: "#FF6B00" },
  ];
  const maxValue = Math.max(0, ...data.map((d) => Math.max(d.budget, d.spent)));
  const ticks = computeNiceTicks(maxValue);
  const niceMax = ticks[ticks.length - 1];

  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={6} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke="#EFEFED" strokeDasharray="3 3" />
        <XAxis dataKey="objectName" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} interval={0} tickMargin={10} />
        <YAxis
          tickLine={false}
          axisLine={false}
          domain={[0, niceMax]}
          ticks={ticks}
          tickFormatter={(v: number) => formatCompact(v)}
          tick={{ fontSize: 12, fill: "#9CA3AF" }}
          width={58}
        />
        <Tooltip cursor={{ fill: "#F5F5F4" }} content={(props) => <ChartTooltip {...props} series={SERIES} />} />
        <Legend
          verticalAlign="top"
          align="left"
          height={40}
          iconType="circle"
          iconSize={9}
          formatter={(value) => <span className="text-sm text-ink-secondary">{value}</span>}
        />
        <Bar dataKey="budget" name={strings.objects.colBudget} fill="#2869C9" radius={[3, 3, 0, 0]} maxBarSize={30} />
        <Bar dataKey="spent" name={strings.common.spentLabel} fill="#FF6B00" radius={[3, 3, 0, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}
