import { CalendarDays, ChevronRight } from "lucide-react";
import type { Work, WorkPriority } from "../../types";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../utils/cn";
import { formatDateShort } from "../../utils/date";
import { WORK_STATUS_CONFIG, workPriorityLabel, workStatusLabel } from "../../utils/workStatus";
import { pickWorkIcon } from "./workerIcons";

interface WorkerTaskRowProps {
  work: Work;
  onOpen: (work: Work) => void;
}

// Priority as plain colored text (no pill background) — matches the reference's compact meta
// line, which reserves pill backgrounds for status only.
const PRIORITY_TEXT_CLASS: Record<WorkPriority, string> = {
  low: "text-ink-secondary",
  medium: "text-blue",
  high: "text-warning",
  critical: "text-red",
};

/** Two-line compact row (title+status on line 1, subtitle+priority+date on line 2) — matches the
 * reference's row density. `flex-wrap` on line 2 lets the priority/date group drop to its own row
 * on narrow screens instead of a separate mobile-only block, so there's only one layout to keep
 * in sync. */
export function WorkerTaskRow({ work, onOpen }: WorkerTaskRowProps) {
  const { strings } = useLanguage();
  const Icon = pickWorkIcon(work);

  return (
    <button
      type="button"
      onClick={() => onOpen(work)}
      className="flex w-full min-w-0 items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-surface-2 sm:px-3"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon size={17} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-ink">{work.title}</span>
          <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", WORK_STATUS_CONFIG[work.status].className)}>
            {workStatusLabel(strings.works, work.status)}
          </span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
          <span className="min-w-0 truncate text-xs text-ink-secondary">
            {work.objectName} · {work.sectionName}
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            <span className={cn("whitespace-nowrap text-[11px] font-semibold", PRIORITY_TEXT_CLASS[work.priority])}>
              {workPriorityLabel(strings.works, work.priority)}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap text-[11px] text-ink-muted">
              <CalendarDays size={11} className="shrink-0" />
              {formatDateShort(work.plannedStart)} – {formatDateShort(work.plannedEnd)}
            </span>
          </span>
        </span>
      </span>

      <ChevronRight size={15} className="shrink-0 text-ink-muted" />
    </button>
  );
}
