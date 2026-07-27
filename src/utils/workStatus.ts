import type { WorkPriority, WorkSectionKey, WorkStatus } from "../types";
import type { AppStrings } from "../lib/i18n/appStrings";

type Tone = "red" | "orange" | "blue" | "green" | "purple";

export const WORK_STATUS_CONFIG: Record<WorkStatus, { tone: Tone; className: string }> = {
  completed: { tone: "green", className: "bg-green-soft text-green" },
  in_progress: { tone: "orange", className: "bg-warning-soft text-warning" },
  overdue: { tone: "red", className: "bg-red-soft text-red" },
  planned: { tone: "blue", className: "bg-blue-soft text-blue" },
  on_review: { tone: "purple", className: "bg-purple-soft text-purple" },
  paused: { tone: "orange", className: "bg-surface-3 text-ink-secondary" },
  cancelled: { tone: "red", className: "bg-surface-3 text-ink-muted" },
};

export const WORK_PRIORITY_CONFIG: Record<WorkPriority, { className: string }> = {
  low: { className: "bg-surface-3 text-ink-secondary" },
  medium: { className: "bg-blue-soft text-blue" },
  high: { className: "bg-warning-soft text-warning" },
  critical: { className: "bg-red-soft text-red" },
};

export function workStatusLabel(s: AppStrings["works"], status: WorkStatus): string {
  const map: Record<WorkStatus, string> = {
    completed: s.statusCompleted,
    in_progress: s.statusInProgress,
    overdue: s.statusOverdue,
    planned: s.statusPlanned,
    on_review: s.statusOnReview,
    paused: s.statusPaused,
    cancelled: s.statusCancelled,
  };
  return map[status];
}

export function workSectionLabel(s: AppStrings["works"], sectionId: WorkSectionKey): string {
  const map: Record<WorkSectionKey, string> = {
    prep: s.sectionPrep,
    foundation: s.sectionFoundation,
    structure: s.sectionStructure,
    finishing: s.sectionFinishing,
    engineering: s.sectionEngineering,
    other: s.sectionOther,
  };
  return map[sectionId];
}

export function workPriorityLabel(s: AppStrings["works"], priority: WorkPriority): string {
  const map: Record<WorkPriority, string> = {
    low: s.priorityLow,
    medium: s.priorityMedium,
    high: s.priorityHigh,
    critical: s.priorityCritical,
  };
  return map[priority];
}

const HISTORY_NOTE_MAP: Record<string, keyof Pick<AppStrings["works"], "historyNoteCompleted" | "historyNoteProgressUpdated" | "historyNoteCreated" | "historyNoteDuplicated">> = {
  "Работа создана": "historyNoteCreated",
  "Работа завершена": "historyNoteCompleted",
  "Работа дублирована": "historyNoteDuplicated",
  "Обновление прогресса": "historyNoteProgressUpdated",
};

export function workHistoryNoteLabel(s: AppStrings["works"], note: string): string {
  const key = HISTORY_NOTE_MAP[note];
  return key ? s[key] : note;
}

export function progressTone(status: WorkStatus, progress: number): "green" | "orange" | "red" | "gray" {
  if (status === "completed") return "green";
  if (status === "overdue") return "red";
  if (status === "planned" && progress === 0) return "gray";
  if (status === "cancelled" || status === "paused") return "gray";
  if (progress === 0) return "gray";
  return progress < 30 ? "red" : progress < 70 ? "orange" : "green";
}
