import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "./ChartTooltip";
import { computeNiceTicks } from "../../utils/chart";

interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

interface GroupedMoneyChartProps {
  data: Record<string, string | number>[];
  categoryKey: string;
  series: SeriesConfig[];
  valueFormatter: (value: number) => string;
  height?: number;
  maxBarSize?: number;
  /** Key on each data row holding the full (un-shortened) category label to show in the tooltip. */
  tooltipLabelKey?: string;
}

interface CategoryTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

function CategoryTick({ x = 0, y = 0, payload }: CategoryTickProps) {
  const value = payload?.value ?? "";
  const lines = value.includes(" ") ? value.split(/\s+/) : [value];

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={`${line}-${index}`}
          x={0}
          y={0}
          dy={14 + index * 13}
          textAnchor="middle"
          fontSize={11}
          fill="#6B7280"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function GroupedMoneyChart({
  data,
  categoryKey,
  series,
  valueFormatter,
  height = 300,
  maxBarSize = 20,
  tooltipLabelKey,
}: GroupedMoneyChartProps) {
  const maxValue = Math.max(0, ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0)));
  const ticks = computeNiceTicks(maxValue);
  const niceMax = ticks[ticks.length - 1];

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }} barGap={3} barCategoryGap="18%">
          <CartesianGrid vertical={false} stroke="#EFEFED" strokeDasharray="3 3" />
          <XAxis
            dataKey={categoryKey}
            tickLine={false}
            axisLine={false}
            interval={0}
            height={40}
            tick={<CategoryTick />}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[0, niceMax]}
            ticks={ticks}
            tickFormatter={(v: number) => valueFormatter(v)}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            width={50}
          />
          <Tooltip
            cursor={{ fill: "#F5F5F4" }}
            isAnimationActive={false}
            allowEscapeViewBox={{ x: false, y: false }}
            wrapperStyle={{ zIndex: 30, outline: "none" }}
            content={(props) => <ChartTooltip {...props} series={series} labelKey={tooltipLabelKey} />}
          />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={maxBarSize} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
