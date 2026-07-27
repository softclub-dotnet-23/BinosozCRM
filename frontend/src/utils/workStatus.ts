import type { WorkPriority, WorkStatus } from "../types";

type Tone = "red" | "orange" | "blue" | "green" | "purple";

export const WORK_STATUS_CONFIG: Record<WorkStatus, { label: string; tone: Tone; className: string }> = {
  completed: { label: "Завершено", tone: "green", className: "bg-green-soft text-green" },
  in_progress: { label: "В процессе", tone: "orange", className: "bg-warning-soft text-warning" },
  overdue: { label: "Просрочено", tone: "red", className: "bg-red-soft text-red" },
  planned: { label: "Запланировано", tone: "blue", className: "bg-blue-soft text-blue" },
  on_review: { label: "На проверке", tone: "purple", className: "bg-purple-soft text-purple" },
  paused: { label: "Приостановлено", tone: "orange", className: "bg-[#F3F3F1] text-ink-secondary" },
  cancelled: { label: "Отменено", tone: "red", className: "bg-[#F3F3F1] text-ink-muted" },
};

export const WORK_PRIORITY_CONFIG: Record<WorkPriority, { label: string; className: string }> = {
  low: { label: "Низкий", className: "bg-[#F3F3F1] text-ink-secondary" },
  medium: { label: "Средний", className: "bg-blue-soft text-blue" },
  high: { label: "Высокий", className: "bg-warning-soft text-warning" },
  critical: { label: "Критический", className: "bg-red-soft text-red" },
};

export function progressTone(status: WorkStatus, progress: number): "green" | "orange" | "red" | "gray" {
  if (status === "completed") return "green";
  if (status === "overdue") return "red";
  if (status === "planned" && progress === 0) return "gray";
  if (status === "cancelled" || status === "paused") return "gray";
  if (progress === 0) return "gray";
  return progress < 30 ? "red" : progress < 70 ? "orange" : "green";
}
