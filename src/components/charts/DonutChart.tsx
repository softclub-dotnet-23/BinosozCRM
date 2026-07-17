import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategorySpend } from "../../types";
import { formatCurrency } from "../../utils/format";

interface DonutChartProps {
  data: CategorySpend[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}

const INNER_RADIUS_PERCENT = 64;

export function DonutChart({ data, centerLabel, centerValue, size = 208 }: DonutChartProps) {
  const innerDiameter = size * (INNER_RADIUS_PERCENT / 100);
  const textMaxWidth = Math.round(innerDiameter - 28);

  return (
    <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="category"
            innerRadius={`${INNER_RADIUS_PERCENT}%`}
            outerRadius="100%"
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={entry.category} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const entry = payload[0].payload as CategorySpend;
              return (
                <div className="rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-[var(--shadow-popover)]">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-ink-secondary">{entry.category}:</span>
                    <span className="font-semibold text-ink tabular">{formatCurrency(entry.amount)}</span>
                  </div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="flex flex-col items-center" style={{ maxWidth: textMaxWidth }}>
          <p className="text-[11px] leading-tight text-ink-secondary">{centerLabel}</p>
          <p className="mt-1.5 break-words text-[15px] font-bold leading-[1.2] tabular text-ink">{centerValue}</p>
        </div>
      </div>
    </div>
  );
}
