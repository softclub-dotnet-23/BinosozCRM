import type { LucideIcon } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";

export const TONE_CLASS = {
  orange: "bg-primary-soft text-primary",
  green: "bg-green-soft text-green",
  blue: "bg-blue-soft text-blue",
  purple: "bg-purple-soft text-purple",
  warning: "bg-warning-soft text-warning",
  red: "bg-red-soft text-red",
} as const;

export type Tone = keyof typeof TONE_CLASS;

/** Shared between the Worker Dashboard's KPI row and the "Мои работы" page's KPI row so both
 * render identical cards instead of two near-duplicate local components. */
export function WorkerKpiCard({ icon: Icon, tone, title, value, footer }: { icon: LucideIcon; tone: Tone; title: string; value: string; footer: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", TONE_CLASS[tone])}>
          <Icon size={19} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-secondary">{title}</p>
          <p className="text-2xl font-bold leading-tight text-ink">{value}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-muted">{footer}</p>
    </Card>
  );
}
