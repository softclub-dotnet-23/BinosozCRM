import type { BrigadeStatus, EmployeeStatus, WorkShift } from "../types";

export const BRIGADE_STATUS_CONFIG: Record<BrigadeStatus, { label: string; className: string }> = {
  active: { label: "Активна", className: "bg-green-soft text-green" },
  paused: { label: "На паузе", className: "bg-blue-soft text-blue" },
  inactive: { label: "Неактивна", className: "bg-[#F3F3F1] text-ink-secondary" },
  forming: { label: "Формируется", className: "bg-warning-soft text-warning" },
  overloaded: { label: "Перегружена", className: "bg-red-soft text-red" },
};

export const EMPLOYEE_STATUS_CONFIG: Record<EmployeeStatus, { label: string; className: string; dotClassName: string }> = {
  on_shift: { label: "На смене", className: "bg-green-soft text-green", dotClassName: "bg-green" },
  on_site: { label: "На объекте", className: "bg-blue-soft text-blue", dotClassName: "bg-blue" },
  available: { label: "Свободен", className: "bg-[#F3F3F1] text-ink-secondary", dotClassName: "bg-ink-muted" },
  on_trip: { label: "На выезде", className: "bg-warning-soft text-warning", dotClassName: "bg-warning" },
  absent: { label: "Отсутствует", className: "bg-red-soft text-red", dotClassName: "bg-red" },
  on_leave: { label: "В отпуске", className: "bg-purple-soft text-purple", dotClassName: "bg-purple" },
  sick_leave: { label: "На больничном", className: "bg-red-soft text-red", dotClassName: "bg-red" },
};

export const SHIFT_CONFIG: Record<WorkShift, { label: string; className: string }> = {
  day: { label: "Дневная", className: "bg-blue-soft text-blue" },
  evening: { label: "Вечерняя", className: "bg-purple-soft text-purple" },
  night: { label: "Ночная", className: "bg-[#1E293B]/10 text-[#1E293B]" },
  day_off: { label: "Выходной", className: "bg-[#F3F3F1] text-ink-secondary" },
};

const ROLE_BADGE_PALETTE = ["bg-blue-soft text-blue", "bg-purple-soft text-purple", "bg-warning-soft text-warning", "bg-green-soft text-green", "bg-[#F3F3F1] text-ink-secondary"];

export function roleBadgeClassName(specialty: string): string {
  let hash = 0;
  for (let i = 0; i < specialty.length; i += 1) hash = (hash * 31 + specialty.charCodeAt(i)) >>> 0;
  return ROLE_BADGE_PALETTE[hash % ROLE_BADGE_PALETTE.length];
}

export function efficiencyColor(value: number): string {
  if (value >= 65) return "#22A447";
  if (value >= 40) return "#F58A1F";
  return "#E83939";
}

export function workProgressTone(status: BrigadeStatus, progress: number): "green" | "orange" | "red" | "gray" {
  if (status === "paused" || status === "inactive") return "gray";
  if (progress >= 60) return "green";
  if (progress >= 25) return "orange";
  return "red";
}
