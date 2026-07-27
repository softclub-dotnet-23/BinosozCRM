import type { BrigadeStatus, EmployeeStatus, WorkShift } from "../types";
import type { AppStrings } from "../lib/i18n/appStrings";

export const BRIGADE_STATUS_CONFIG: Record<BrigadeStatus, { className: string }> = {
  active: { className: "bg-green-soft text-green" },
  paused: { className: "bg-blue-soft text-blue" },
  inactive: { className: "bg-surface-3 text-ink-secondary" },
  forming: { className: "bg-warning-soft text-warning" },
  overloaded: { className: "bg-red-soft text-red" },
};

export const EMPLOYEE_STATUS_CONFIG: Record<EmployeeStatus, { className: string; dotClassName: string }> = {
  on_shift: { className: "bg-green-soft text-green", dotClassName: "bg-green" },
  on_site: { className: "bg-blue-soft text-blue", dotClassName: "bg-blue" },
  available: { className: "bg-surface-3 text-ink-secondary", dotClassName: "bg-ink-muted" },
  on_trip: { className: "bg-warning-soft text-warning", dotClassName: "bg-warning" },
  absent: { className: "bg-red-soft text-red", dotClassName: "bg-red" },
  on_leave: { className: "bg-purple-soft text-purple", dotClassName: "bg-purple" },
  sick_leave: { className: "bg-red-soft text-red", dotClassName: "bg-red" },
};

export const SHIFT_CONFIG: Record<WorkShift, { className: string }> = {
  day: { className: "bg-blue-soft text-blue" },
  evening: { className: "bg-purple-soft text-purple" },
  night: { className: "bg-[#1E293B]/10 text-[#1E293B]" },
  day_off: { className: "bg-surface-3 text-ink-secondary" },
};

export function brigadeStatusLabel(s: AppStrings["brigades"], status: BrigadeStatus): string {
  const map: Record<BrigadeStatus, string> = {
    active: s.statusActive,
    paused: s.statusPaused,
    inactive: s.statusInactive,
    forming: s.statusForming,
    overloaded: s.statusOverloaded,
  };
  return map[status];
}

export function employeeStatusLabel(s: AppStrings["brigades"], status: EmployeeStatus): string {
  const map: Record<EmployeeStatus, string> = {
    on_shift: s.employeeStatusOnShift,
    on_site: s.employeeStatusOnSite,
    available: s.employeeStatusAvailable,
    on_trip: s.employeeStatusOnTrip,
    absent: s.employeeStatusAbsent,
    on_leave: s.employeeStatusOnLeave,
    sick_leave: s.employeeStatusSickLeave,
  };
  return map[status];
}

export function shiftLabel(s: AppStrings["brigades"], shift: WorkShift): string {
  const map: Record<WorkShift, string> = {
    day: s.shiftDay,
    evening: s.shiftEvening,
    night: s.shiftNight,
    day_off: s.shiftDayOff,
  };
  return map[shift];
}

const ROLE_BADGE_PALETTE = ["bg-blue-soft text-blue", "bg-purple-soft text-purple", "bg-warning-soft text-warning", "bg-green-soft text-green", "bg-surface-3 text-ink-secondary"];

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
