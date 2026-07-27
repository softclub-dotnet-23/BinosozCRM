import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { WorkDynamicsPoint } from "../../data/mockWorkDynamics";

function DynamicsTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const planned = payload.find((p) => p.dataKey === "planned")?.value as number | undefined;
  const actual = payload.find((p) => p.dataKey === "actual")?.value as number | undefined;
  if (planned === undefined || actual === undefined) return null;
  const variance = actual - planned;

  return (
    <div className="min-w-44 rounded-xl border border-border bg-card px-4 py-3 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.28)]">
      <p className="mb-2 text-xs font-semibold text-ink">{label}</p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-blue" />
          <span className="text-ink-secondary">План:</span>
          <span className="ml-auto font-semibold text-ink tabular">{planned}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          <span className="text-ink-secondary">Факт:</span>
          <span className="ml-auto font-semibold text-ink tabular">{actual}%</span>
        </div>
        <div className="mt-1 flex items-center gap-2 border-t border-border pt-1.5">
          <span className="text-ink-secondary">Отклонение:</span>
          <span className={`ml-auto font-semibold tabular ${variance < 0 ? "text-red" : "text-green"}`}>
            {variance > 0 ? "+" : ""}
            {variance}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function WorkDynamicsChart({ data }: { data: WorkDynamicsPoint[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center gap-5">
        <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true">
            <line x1="0" y1="4" x2="16" y2="4" stroke="#2869C9" strokeWidth="2" strokeDasharray="4 3" />
          </svg>
          План
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true">
            <line x1="0" y1="4" x2="16" y2="4" stroke="#FF6B00" strokeWidth="2.5" />
          </svg>
          Факт
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="#EFEFED" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} tickMargin={8} />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: "#9CA3AF" }}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: "#EFEFED" }}
            isAnimationActive={false}
            allowEscapeViewBox={{ x: false, y: false }}
            wrapperStyle={{ zIndex: 30, outline: "none" }}
            content={(props) => <DynamicsTooltip {...props} />}
          />
          <Line type="monotone" dataKey="planned" name="План" stroke="#2869C9" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="actual" name="Факт" stroke="#FF6B00" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
