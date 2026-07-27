import type { ObjectStatus } from "../../types";
import { cn } from "../../utils/cn";

const STATUS_CONFIG: Record<ObjectStatus, { label: string; className: string }> = {
  in_progress: { label: "В работе", className: "bg-green-soft text-green" },
  at_risk: { label: "Есть риск", className: "bg-red-soft text-red" },
  almost_done: { label: "Почти готов", className: "bg-warning-soft text-warning" },
  completed: { label: "Завершён", className: "bg-blue-soft text-blue" },
};

export function StatusBadge({ status }: { status: ObjectStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

type Tone = "red" | "orange" | "blue" | "green" | "purple";

const TONE_CLASSNAMES: Record<Tone, string> = {
  red: "bg-red-soft text-red",
  orange: "bg-warning-soft text-warning",
  blue: "bg-blue-soft text-blue",
  green: "bg-green-soft text-green",
  purple: "bg-purple-soft text-purple",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        TONE_CLASSNAMES[tone],
      )}
    >
      {children}
    </span>
  );
}
