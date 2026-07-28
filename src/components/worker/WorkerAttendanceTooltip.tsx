import type { TooltipContentProps } from "recharts";
import type { WeeklyChartPoint } from "../../utils/workerAttendanceAnalytics";
import { formatDurationMinutes } from "../../utils/workerAttendanceAnalytics";

interface WorkerAttendanceTooltipProps extends TooltipContentProps {
  points: WeeklyChartPoint[];
  statusLabel: (status: WeeklyChartPoint["status"]) => string;
  checkInLabel: string;
  checkOutLabel: string;
  lateLabel: string;
  workedLabel: string;
  statusFieldLabel: string;
}

/** Compact, content-sized tooltip (matches the pattern already established by
 * WorkCompletionTooltip) — real per-day check-in/out, late minutes, worked minutes and status,
 * not just the bar's raw percentage. */
export function WorkerAttendanceTooltip({ active, payload, label, points, statusLabel, checkInLabel, checkOutLabel, lateLabel, workedLabel, statusFieldLabel }: WorkerAttendanceTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = points.find((p) => p.date === label);
  if (!point) return null;

  return (
    <div className="w-fit max-w-60 rounded-[10px] border border-border bg-card px-3 py-2 shadow-sm">
      <p className="mb-1.5 text-xs font-semibold text-ink">
        {point.weekdayLabel}, {point.dateLabel}
      </p>
      <div className="space-y-1 text-[11px] leading-tight">
        <Row label={statusFieldLabel} value={statusLabel(point.status)} />
        {point.checkIn && <Row label={checkInLabel} value={point.checkIn} />}
        {point.checkOut && <Row label={checkOutLabel} value={point.checkOut} />}
        {point.lateMinutes > 0 && <Row label={lateLabel} value={formatDurationMinutes(point.lateMinutes)} />}
        {point.workedMinutes > 0 && <Row label={workedLabel} value={formatDurationMinutes(point.workedMinutes)} />}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-secondary">{label}</span>
      <span className="font-semibold tabular text-ink">{value}</span>
    </div>
  );
}
