import type { LucideIcon } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";

export const CIRCLE_KPI_TONE_CLASS = {
  blue: "bg-blue-soft text-blue",
  green: "bg-green-soft text-green",
  orange: "bg-warning-soft text-warning",
  red: "bg-red-soft text-red",
  purple: "bg-purple-soft text-purple",
} as const;

export type CircleKpiTone = keyof typeof CIRCLE_KPI_TONE_CLASS;

/** Shared between the Attendance and Schedule pages — both reference designs put a circular icon
 * badge in the top-right corner with title/value/footer stacked on the left, a different structure
 * from the Dashboard/Tasks pages' left-icon WorkerKpiCard (those match their own, separate
 * reference and are intentionally left alone). */
export function WorkerCircleKpiCard({ icon: Icon, tone, title, value, footer }: { icon: LucideIcon; tone: CircleKpiTone; title: string; value: string; footer: string }) {
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-secondary">{title}</p>
          <p className="mt-1 text-xl font-bold leading-tight text-ink">{value}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{footer}</p>
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", CIRCLE_KPI_TONE_CLASS[tone])}>
          <Icon size={17} />
        </span>
      </div>
    </Card>
  );
}

/** Compact circular-icon stat row used inside the weekly-analytics / hours-chart side panels on
 * both pages. */
export function WorkerCircleStat({ icon: Icon, tone, label, value }: { icon: LucideIcon; tone: CircleKpiTone; label: string; value: string }) {
  return (
    <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-surface-1 p-2.5 md:flex-none">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", CIRCLE_KPI_TONE_CLASS[tone])}>
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-secondary">{label}</p>
        <p className="text-sm font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}
