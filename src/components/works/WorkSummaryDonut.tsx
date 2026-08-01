import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { WorkAnalytics } from "../../types";
import { useLanguage } from "../../context/LanguageContext";
import type { AppStrings } from "../../lib/i18n/appStrings";
import { useChartAnimation } from "../../hooks/useChartAnimation";
import { AnimatedNumber } from "../ui/AnimatedNumber";

interface DonutSegment {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
}

function buildSegments(s: AppStrings["works"], analytics: WorkAnalytics): DonutSegment[] {
  return [
    { key: "completed", label: s.statusCompleted, value: analytics.completed, percent: analytics.completedPercent, color: "#22A447" },
    { key: "inProgress", label: s.statusInProgress, value: analytics.inProgress, percent: analytics.inProgressPercent, color: "#FF6B00" },
    { key: "overdue", label: s.statusOverdue, value: analytics.overdue, percent: analytics.overduePercent, color: "#E83939" },
    { key: "planned", label: s.statusPlanned, value: analytics.planned, percent: analytics.plannedPercent, color: "#2869C9" },
  ];
}

export function WorkSummaryDonut({ analytics, size = 176 }: { analytics: WorkAnalytics; size?: number }) {
  const { strings } = useLanguage();
  const chartAnim = useChartAnimation();
  const segments = buildSegments(strings.works, analytics);
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
            {...chartAnim}
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
        <AnimatedNumber value={analytics.total} className="text-2xl font-bold leading-none tabular text-ink" />
        <p className="mt-1.5 text-xs text-ink-secondary">{strings.works.donutSuffix}</p>
      </div>
    </div>
  );
}

export function WorkSummaryLegend({ analytics }: { analytics: WorkAnalytics }) {
  const { strings } = useLanguage();
  const segments = buildSegments(strings.works, analytics);
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
