import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { WorkAnalytics } from "../../types";

interface DonutSegment {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
}

function buildSegments(analytics: WorkAnalytics): DonutSegment[] {
  return [
    { key: "completed", label: "Завершено", value: analytics.completed, percent: analytics.completedPercent, color: "#22A447" },
    { key: "inProgress", label: "В процессе", value: analytics.inProgress, percent: analytics.inProgressPercent, color: "#FF6B00" },
    { key: "overdue", label: "Просрочено", value: analytics.overdue, percent: analytics.overduePercent, color: "#E83939" },
    { key: "planned", label: "Запланировано", value: analytics.planned, percent: analytics.plannedPercent, color: "#2869C9" },
  ];
}

export function WorkSummaryDonut({ analytics, size = 176 }: { analytics: WorkAnalytics; size?: number }) {
  const segments = buildSegments(analytics);
  const chartData = segments.filter((s) => s.value > 0);
  const displayData = chartData.length > 0 ? chartData : segments;

  return (
    <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={displayData}
            dataKey="value"
            nameKey="label"
            innerRadius="66%"
            outerRadius="100%"
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {displayData.map((entry) => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const entry = payload[0].payload as DonutSegment;
              return (
                <div className="rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-[var(--shadow-popover)]">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-ink-secondary">{entry.label}:</span>
                    <span className="font-semibold text-ink tabular">{entry.value}</span>
                  </div>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-2xl font-bold leading-none tabular text-ink">{analytics.total}</p>
        <p className="mt-1.5 text-[11px] text-ink-secondary">работ</p>
      </div>
    </div>
  );
}

export function WorkSummaryLegend({ analytics }: { analytics: WorkAnalytics }) {
  const segments = buildSegments(analytics);
  return (
    <ul className="w-full space-y-2.5">
      {segments.map((row) => (
        <li key={row.key} className="flex items-center gap-2.5 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="text-ink-secondary">{row.label}</span>
          <span className="ml-auto shrink-0 font-semibold text-ink tabular">
            {row.value} <span className="text-ink-muted">({row.percent}%)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
