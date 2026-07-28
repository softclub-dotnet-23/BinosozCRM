import { CalendarDays, ChevronRight, UserRound } from "lucide-react";
import type { Work, WorkPriority } from "../../types";
import { useLanguage } from "../../context/LanguageContext";
import { cn } from "../../utils/cn";
import { formatDateShort } from "../../utils/date";
import { ProgressBar } from "../ui/ProgressBar";
import { WORK_STATUS_CONFIG, workPriorityLabel, workStatusLabel } from "../../utils/workStatus";
import { pickWorkIcon } from "./workerIcons";

interface WorkerTaskListRowProps {
  work: Work;
  onOpen: (work: Work) => void;
}

const PRIORITY_TEXT_CLASS: Record<WorkPriority, string> = {
  low: "text-ink-secondary",
  medium: "text-blue",
  high: "text-warning",
  critical: "text-red",
};

/** Richer row for the full "Мои работы" page — adds the Прораб name and a progress bar on top of
 * the compact WorkerTaskRow's title/status/priority/date, matching this page's own reference. */
export function WorkerTaskListRow({ work, onOpen }: WorkerTaskListRowProps) {
  const { strings } = useLanguage();
  const Icon = pickWorkIcon(work);
  const progress = Math.max(0, Math.min(100, work.progress));

  return (
    <button
      type="button"
      onClick={() => onOpen(work)}
      className="flex w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon size={19} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-ink">{work.title}</span>
          <span className={cn("shrink-0 whitespace-nowrap text-xs font-semibold", PRIORITY_TEXT_CLASS[work.priority])}>
            {workPriorityLabel(strings.works, work.priority)}
          </span>
          <span className={cn("shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", WORK_STATUS_CONFIG[work.status].className)}>
            {workStatusLabel(strings.works, work.status)}
          </span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-secondary">
          <span className="min-w-0 truncate">
            {work.objectName} · {work.sectionName}
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap text-ink-muted">
            <CalendarDays size={11} className="shrink-0" />
            {formatDateShort(work.plannedStart)} – {formatDateShort(work.plannedEnd)}
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap text-ink-muted">
            <UserRound size={11} className="shrink-0" />
            {work.responsible.name}
          </span>
        </span>
      </span>

      <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <span className="text-xs font-semibold tabular text-ink">{progress}%</span>
        <ProgressBar value={progress} className="h-1.5 w-20" tone={progress >= 66 ? "green" : progress >= 33 ? "orange" : "red"} />
      </span>

      <ChevronRight size={16} className="shrink-0 text-ink-muted" />
    </button>
  );
}
