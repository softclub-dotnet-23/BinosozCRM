import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ObjectProgressPoint } from "../../types";
import { ChartTooltip } from "./ChartTooltip";
import { useLanguage } from "../../context/LanguageContext";

export function ProgressChart({ data }: { data: ObjectProgressPoint[] }) {
  const { strings } = useLanguage();
  const s = strings.objects;
  const SERIES = [
    { key: "planned", label: s.chartSeriesPlanned, color: "#2869C9", unit: "%" },
    { key: "actual", label: s.chartSeriesActual, color: "#FF6B00", unit: "%" },
  ];
  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barGap={6} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke="#EFEFED" strokeDasharray="3 3" />
        <XAxis
          dataKey="objectName"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#9CA3AF" }}
          interval={0}
          tickMargin={10}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 12, fill: "#9CA3AF" }}
          width={52}
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
        <Bar dataKey="planned" name={`${s.chartSeriesPlanned} (%)`} fill="#2869C9" radius={[3, 3, 0, 0]} maxBarSize={30} />
        <Bar dataKey="actual" name={`${s.chartSeriesActual} (%)`} fill="#FF6B00" radius={[3, 3, 0, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}
