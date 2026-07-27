import type { ObjectStatus } from "../../types";
import { cn } from "../../utils/cn";
import { useLanguage } from "../../context/LanguageContext";

const STATUS_CLASSNAME: Record<ObjectStatus, string> = {
  in_progress: "bg-green-soft text-green",
  at_risk: "bg-red-soft text-red",
  almost_done: "bg-warning-soft text-warning",
  completed: "bg-blue-soft text-blue",
};

export function StatusBadge({ status }: { status: ObjectStatus }) {
  const { strings } = useLanguage();
  const c = strings.common;
  const label: Record<ObjectStatus, string> = {
    in_progress: c.statusInProgress,
    at_risk: c.statusAtRisk,
    almost_done: c.statusAlmostDone,
    completed: c.statusCompleted,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_CLASSNAME[status],
      )}
    >
      {label[status]}
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

export function Badge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        TONE_CLASSNAMES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
