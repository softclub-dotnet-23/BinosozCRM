import type { TooltipContentProps } from "recharts";
import { formatNumber } from "../../utils/format";

interface SeriesConfig {
  key: string;
  label: string;
  color: string;
  unit?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  series,
  labelKey,
}: TooltipContentProps & { series: SeriesConfig[]; labelKey?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  const fullLabel = labelKey ? ((payload[0]?.payload as Record<string, unknown> | undefined)?.[labelKey] as string | undefined) : undefined;

  return (
    <div className="min-w-[152px] rounded-xl border border-border bg-card px-4 py-3 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.28)]">
      <p className="mb-2 text-xs font-semibold text-ink">{fullLabel ?? label}</p>
      <div className="space-y-1.5">
        {series.map((s) => {
          const entry = payload.find((p) => p.dataKey === s.key);
          if (!entry || entry.value === undefined) return null;
          return (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-ink-secondary">{s.label}:</span>
              <span className="ml-auto font-semibold text-ink tabular">
                {formatNumber(Number(entry.value))}
                {s.unit ?? ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
