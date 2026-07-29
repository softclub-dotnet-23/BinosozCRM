import type { AttendanceRecord, Employee, MaterialRequest, PhotoReport, Work } from "../types";
import { computeAttendanceSummary } from "./workerAttendanceAnalytics";

export function currentMonthRange(todayIso: string): [string, string] {
  const [y, m] = todayIso.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return [from, to];
}

/** Whole years between a real ISO hire date and today — used for both the "Стаж" KPI and the
 * "Опыт в строительстве" professional-info row, so the two stay in sync automatically instead of
 * being two separately-typed numbers that could drift apart. */
export function computeExperienceYears(hiredAt: string | undefined, todayIso: string): number {
  if (!hiredAt) return 0;
  const [hy, hm, hd] = hiredAt.split("-").map(Number);
  const [ty, tm, td] = todayIso.split("-").map(Number);
  let years = ty - hy;
  if (tm < hm || (tm === hm && td < hd)) years -= 1;
  return Math.max(0, years);
}

export interface ProfileKpis {
  experienceYears: number;
  activeTasks: number;
  workedHoursThisMonth: number;
  attendancePercent: number;
}

const ACTIVE_WORK_STATUSES = new Set<Work["status"]>(["in_progress", "planned", "on_review", "overdue", "paused"]);

export function computeProfileKpis(employee: Employee, brigadeWorks: Work[], attendance: AttendanceRecord[], todayIso: string): ProfileKpis {
  const [monthFrom, monthTo] = currentMonthRange(todayIso);
  const summary = computeAttendanceSummary(attendance, employee.id, monthFrom, monthTo);
  return {
    experienceYears: computeExperienceYears(employee.hiredAt, todayIso),
    activeTasks: brigadeWorks.filter((w) => ACTIVE_WORK_STATUSES.has(w.status)).length,
    workedHoursThisMonth: Math.round(summary.totalWorkedMinutes / 60),
    attendancePercent: summary.attendancePercent,
  };
}

export interface ProfileStatsSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface ProfileStats {
  segments: ProfileStatsSegment[];
  total: number;
  attendancePercent: number;
}

/** Three real pie-chart segments (completed tasks / photo reports / rejected-report remarks) sum
 * to the donut's center total; attendance is a percentage, not a count, so it's shown as a fourth
 * informational legend row rather than forced into the same sum. */
export function computeProfileStats(brigadeWorks: Work[], myPhotoReports: PhotoReport[], attendancePercent: number): ProfileStats {
  const completedTasks = brigadeWorks.filter((w) => w.status === "completed").length;
  const photoReports = myPhotoReports.length;
  const remarks = myPhotoReports.filter((r) => r.status === "rejected").length;

  const segments: ProfileStatsSegment[] = [
    { key: "completedTasks", label: "completedTasks", value: completedTasks, color: "#3478F6" },
    { key: "photoReports", label: "photoReports", value: photoReports, color: "#F58A1F" },
    { key: "remarks", label: "remarks", value: remarks, color: "#7C3AED" },
  ];

  return { segments, total: completedTasks + photoReports + remarks, attendancePercent };
}

export type ProfileActivityType = "attendance" | "photoReport" | "materialRequest" | "taskCompleted";

export interface ProfileActivityItem {
  id: string;
  type: ProfileActivityType;
  title: string;
  createdAt: string;
}

/** One real most-recent event per category, pulled straight from the same repositories the rest
 * of the app already reads (attendance/photo reports/material requests/works) — no synthetic
 * activity log exists, so this is the honest "recent activity" a real one would show. */
export function computeProfileActivity(
  employee: Employee,
  brigadeName: string | null,
  attendance: AttendanceRecord[],
  myPhotoReports: PhotoReport[],
  myMaterialRequests: MaterialRequest[],
  brigadeWorks: Work[],
  todayIso: string,
): ProfileActivityItem[] {
  const items: ProfileActivityItem[] = [];

  // "Recent activity" only makes sense for events that have actually happened — the seed data's
  // real attendance/work dates span the whole of July, some of which fall after this environment's
  // simulated "today", so those are excluded rather than shown as if they'd already occurred.
  const lastAttendance = attendance
    .filter((r) => r.employeeId === employee.id && r.date <= todayIso)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (lastAttendance) {
    items.push({
      id: `attendance-${lastAttendance.id}`,
      type: "attendance",
      title: "attendanceMarked",
      createdAt: lastAttendance.arrivalTime ? `${lastAttendance.date}T${lastAttendance.arrivalTime}:00` : `${lastAttendance.date}T00:00:00`,
    });
  }

  const lastPhoto = [...myPhotoReports].filter((r) => r.createdDate.slice(0, 10) <= todayIso).sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1))[0];
  if (lastPhoto) items.push({ id: `photo-${lastPhoto.id}`, type: "photoReport", title: "photoReportUploaded", createdAt: lastPhoto.createdDate });

  const lastMaterial = myMaterialRequests
    .filter((r) => r.brigadeName === brigadeName && r.date <= todayIso)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (lastMaterial) items.push({ id: `material-${lastMaterial.id}`, type: "materialRequest", title: "materialsRequested", createdAt: `${lastMaterial.date}T00:00:00` });

  const lastCompleted = brigadeWorks
    .filter((w) => w.status === "completed" && w.actualEnd && w.actualEnd <= todayIso)
    .sort((a, b) => (a.actualEnd! < b.actualEnd! ? 1 : -1))[0];
  if (lastCompleted) items.push({ id: `task-${lastCompleted.id}`, type: "taskCompleted", title: "taskCompleted", createdAt: `${lastCompleted.actualEnd}T00:00:00` });

  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
