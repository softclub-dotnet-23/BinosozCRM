import type { TooltipContentProps } from "recharts";

export const WORK_COMPLETION_COLORS = {
  plan: "#3B82F6",
  actual: "#22B573",
  completion: "#FF8A1F",
  grid: "#E9EDF3",
  axisText: "#6B7280",
} as const;

interface WorkCompletionTooltipProps extends TooltipContentProps<number, string> {
  formatDayLabel: (iso: string) => string;
  planLabel: string;
  actualLabel: string;
  completionLabel: string;
}

/** Compact tooltip for the work-completion chart: content-sized (~200px), small type, thin
 * border, no oversized title or row spacing — replaces the previous heavier `min-w-40` variant. */
export function WorkCompletionTooltip({ active, payload, label, formatDayLabel, planLabel, actualLabel, completionLabel }: WorkCompletionTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const plan = payload.find((p) => p.dataKey === "plan")?.value as number | undefined;
  const actual = payload.find((p) => p.dataKey === "actual")?.value as number | undefined;
  const completion = payload.find((p) => p.dataKey === "completionPercent")?.value as number | undefined;

  return (
    <div className="w-fit max-w-55 rounded-[10px] border border-border bg-card px-3 py-2 shadow-sm">
      <p className="mb-1.5 text-xs font-semibold text-ink">{formatDayLabel(String(label))}</p>
      <div className="space-y-1">
        <TooltipRow color={WORK_COMPLETION_COLORS.plan} label={planLabel} value={plan} />
        <TooltipRow color={WORK_COMPLETION_COLORS.actual} label={actualLabel} value={actual} />
        <TooltipRow color={WORK_COMPLETION_COLORS.completion} label={completionLabel} value={completion} suffix="%" />
      </div>
    </div>
  );
}

function TooltipRow({ color, label, value, suffix = "" }: { color: string; label: string; value: number | undefined; suffix?: string }) {
  if (value === undefined) return null;
  return (
    <div className="flex items-center gap-1.5 text-[11px] leading-tight">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0 flex-1 truncate text-ink-secondary">{label}</span>
      <span className="shrink-0 font-semibold tabular text-ink">
        {value}
        {suffix}
      </span>
    </div>
  );
}
