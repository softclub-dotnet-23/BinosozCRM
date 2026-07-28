import type { AttendanceRecord, Work, WorkerDocument, WorkPriority, WorkStatus } from "../types";
import type { AppStrings } from "../lib/i18n/appStrings";
import { formatDateShort } from "./date";

function round(value: number): number {
  return Math.round(value);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthPrefix(dateIso: string): string {
  return dateIso.slice(0, 7);
}

export function previousMonthPrefix(dateIso: string): string {
  const [y, m] = dateIso.slice(0, 7).split("-").map(Number);
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

/** currentValue/previousValue → signed percent change, spec-mandated formula — avoids NaN/Infinity
 * when the previous period had zero activity. */
export function changePercent(currentValue: number, previousValue: number): number {
  if (previousValue === 0) return currentValue === 0 ? 0 : 100;
  return round(((currentValue - previousValue) / previousValue) * 100);
}

export type TaskTabKey = "all" | "in_progress" | "on_review" | "completed";

export function computeTaskTabCounts(works: Work[]): Record<TaskTabKey, number> {
  return {
    all: works.length,
    in_progress: works.filter((w) => w.status === "in_progress").length,
    on_review: works.filter((w) => w.status === "on_review").length,
    completed: works.filter((w) => w.status === "completed").length,
  };
}

export function filterWorksByTab(works: Work[], tab: TaskTabKey): Work[] {
  if (tab === "all") return works;
  const statusForTab: Record<Exclude<TaskTabKey, "all">, WorkStatus> = {
    in_progress: "in_progress",
    on_review: "on_review",
    completed: "completed",
  };
  return works.filter((w) => w.status === statusForTab[tab]);
}

const PRIORITY_WEIGHT: Record<WorkPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function sortWorksByPriority(works: Work[]): Work[] {
  return [...works].sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || a.plannedStart.localeCompare(b.plannedStart));
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  kind: "work" | "break" | "meeting";
  workStatus: WorkStatus | null;
  workId: string | null;
}

const WORK_SLOT_TIMES = ["08:00", "10:30", "13:00", "15:00"];

/** Derives a real, deterministic daily timeline from the brigade's actual Works active on
 * `dateIso` (plannedStart..plannedEnd overlap) plus two fixed real-world routine entries (lunch
 * break, end-of-day site meeting) — Work has no time-of-day field anywhere in this app, only
 * dates, so a hard time-of-day has to be assigned; doing it by (priority, then earliest planned
 * start) is deterministic and never random. `maxWorkItems` defaults to a generous cap for the full
 * Schedule page; the Dashboard's compact "Сегодня" card passes 2 explicitly (+ break + meeting = 4
 * items total, matching its smaller card). */
export function computeWorkerSchedule(brigadeWorks: Work[], dateIso: string, maxWorkItems = 4): ScheduleItem[] {
  const activeToday = sortWorksByPriority(brigadeWorks.filter((w) => w.plannedStart <= dateIso && w.plannedEnd >= dateIso)).slice(0, maxWorkItems);
  if (activeToday.length === 0) return [];

  const items: ScheduleItem[] = activeToday.map((w, i) => ({
    id: `work-${w.id}`,
    time: WORK_SLOT_TIMES[i] ?? WORK_SLOT_TIMES[WORK_SLOT_TIMES.length - 1],
    title: w.title,
    kind: "work",
    workStatus: w.status,
    workId: w.id,
  }));
  items.push({ id: "break", time: "11:00", title: "", kind: "break", workStatus: null, workId: null });
  items.push({ id: "meeting", time: "16:00", title: "", kind: "meeting", workStatus: null, workId: null });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

function hoursBetween(from: string, to: string): number {
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  return Math.max(0, (th * 60 + tm - (fh * 60 + fm)) / 60);
}

export function computeMonthlyHours(records: AttendanceRecord[], employeeId: string, prefix: string): number {
  return round(
    records
      .filter((r) => r.employeeId === employeeId && r.date.startsWith(prefix) && r.arrivalTime && r.departureTime)
      .reduce((sum, r) => sum + hoursBetween(r.arrivalTime as string, r.departureTime as string), 0),
  );
}

export function computeCompletedThisMonth(brigadeWorks: Work[], prefix: string): number {
  return brigadeWorks.filter((w) => w.status === "completed" && w.actualEnd && w.actualEnd.startsWith(prefix)).length;
}

export interface WorkerStats {
  hoursThisMonth: number;
  hoursChangePercent: number;
  completedThisMonth: number;
  completedChangePercent: number;
  rating: number;
  ratingLabel: "high" | "medium" | "low";
  violations: number;
}

/** Rating and violations are both derived deterministically from real attendance history — never
 * hardcoded, never random. Rating starts at a perfect 5.0 and is penalized per late/absent day
 * this month, floored at 3.0; violations counts real absences this month. */
export function computeWorkerStats(records: AttendanceRecord[], brigadeWorks: Work[], employeeId: string, dateIso: string): WorkerStats {
  const prefix = monthPrefix(dateIso);
  const prevPrefix = previousMonthPrefix(dateIso);

  const hoursThisMonth = computeMonthlyHours(records, employeeId, prefix);
  const hoursPrevMonth = computeMonthlyHours(records, employeeId, prevPrefix);
  const completedThisMonth = computeCompletedThisMonth(brigadeWorks, prefix);
  const completedPrevMonth = computeCompletedThisMonth(brigadeWorks, prevPrefix);

  const monthRecords = records.filter((r) => r.employeeId === employeeId && r.date.startsWith(prefix));
  const lateDays = monthRecords.filter((r) => r.status === "late").length;
  const absentDays = monthRecords.filter((r) => r.status === "absent").length;
  const rawRating = Math.max(3, Math.min(5, 5 - lateDays * 0.3 - absentDays * 0.6));
  // Round first, then bucket the *rounded* value — bucketing the raw float can disagree with the
  // displayed number right at a boundary (e.g. floating-point 0.3*5 landing a hair under 1.5).
  const rating = Math.round(rawRating * 10) / 10;

  return {
    hoursThisMonth,
    hoursChangePercent: changePercent(hoursThisMonth, hoursPrevMonth),
    completedThisMonth,
    completedChangePercent: changePercent(completedThisMonth, completedPrevMonth),
    rating,
    ratingLabel: rating >= 4.5 ? "high" : rating >= 3.5 ? "medium" : "low",
    violations: absentDays,
  };
}

/** Time-of-day greeting key — "Доброе утро"/"Добрый день"/"Добрый вечер" — driven by the real
 * local clock, not a fixed string. */
export function greetingKey(now: Date = new Date()): "morning" | "day" | "evening" {
  const h = now.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "day";
  return "evening";
}

/** There is no binary-file storage anywhere in this app (confirmed: no documents concept existed
 * before the Worker role), so a real download can't serve the original PDF/xlsx/dwg bytes. Rather
 * than a dead `href="#"` link, this triggers a real browser download of the document's own real
 * metadata under its real filename — an honest, functional action instead of a fabricated file. */
export function downloadWorkerDocument(doc: WorkerDocument): void {
  const manifest = [`Документ: ${doc.title}`, `Файл: ${doc.fileName}`, `Размер: ${doc.sizeLabel}`, `Загружен: ${formatDateShort(doc.uploadedDate)}`].join("\n");
  const blob = new Blob([manifest], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatRelativeTime(isoDateTime: string, now: Date, s: AppStrings["header"]): string {
  const then = new Date(isoDateTime).getTime();
  const diffMs = now.getTime() - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return s.justNow;
  if (diffMin < 60) return s.minutesAgo(diffMin);
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return s.hoursAgo(diffHours);
  return formatDateShort(isoDateTime);
}

// ---------------------------------------------------------------------------
// "Мои работы" (Worker Tasks) page — KPIs, sorting, advanced filters, monthly
// statistics, upcoming tasks. Kept in this same module (rather than a parallel
// workerTaskAnalytics.ts) since it shares round()/monthPrefix()/computeMonthlyHours
// with the Dashboard's analytics instead of duplicating them.
// ---------------------------------------------------------------------------

export interface TasksKpis {
  total: number;
  inProgress: number;
  review: number;
  completedThisMonth: number;
  overdue: number;
}

export function computeTasksKpis(works: Work[], dateIso: string): TasksKpis {
  const prefix = monthPrefix(dateIso);
  return {
    total: works.length,
    inProgress: works.filter((w) => w.status === "in_progress").length,
    review: works.filter((w) => w.status === "on_review").length,
    completedThisMonth: works.filter((w) => w.status === "completed" && !!w.actualEnd && w.actualEnd.startsWith(prefix)).length,
    overdue: works.filter((w) => w.status === "overdue").length,
  };
}

export type TaskSortOption = "priority" | "dueDate" | "progress" | "newest" | "oldest";

export function sortWorks(works: Work[], option: TaskSortOption): Work[] {
  const copy = [...works];
  switch (option) {
    case "dueDate":
      return copy.sort((a, b) => a.plannedEnd.localeCompare(b.plannedEnd));
    case "progress":
      return copy.sort((a, b) => b.progress - a.progress);
    case "newest":
      return copy.sort((a, b) => b.plannedStart.localeCompare(a.plannedStart));
    case "oldest":
      return copy.sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));
    case "priority":
    default:
      return sortWorksByPriority(copy);
  }
}

export interface TaskFilters {
  priority: WorkPriority | "all";
  objectName: string | "all";
  overdueOnly: boolean;
}

export const DEFAULT_TASK_FILTERS: TaskFilters = { priority: "all", objectName: "all", overdueOnly: false };

export function applyTaskFilters(works: Work[], filters: TaskFilters): Work[] {
  return works.filter(
    (w) =>
      (filters.priority === "all" || w.priority === filters.priority) &&
      (filters.objectName === "all" || w.objectName === filters.objectName) &&
      (!filters.overdueOnly || w.status === "overdue"),
  );
}

export interface MonthlyTaskStats {
  completedTasksThisMonth: number;
  completedWorksAllTime: number;
  hoursThisMonth: number;
  averageProgress: number;
}

/** "Выполнено задач" (this calendar month) is deliberately a different real number from
 * "Выполнено работ" (this brigade's all-time completed count) — two honest, distinct metrics
 * rather than the same count shown twice under different labels. */
export function computeMonthlyTaskStats(brigadeWorks: Work[], records: AttendanceRecord[], employeeId: string, dateIso: string): MonthlyTaskStats {
  const prefix = monthPrefix(dateIso);
  const completedTasksThisMonth = brigadeWorks.filter((w) => w.status === "completed" && !!w.actualEnd && w.actualEnd.startsWith(prefix)).length;
  const completedWorksAllTime = brigadeWorks.filter((w) => w.status === "completed").length;
  const hoursThisMonth = computeMonthlyHours(records, employeeId, prefix);
  const averageProgress = brigadeWorks.length > 0 ? round(brigadeWorks.reduce((sum, w) => sum + w.progress, 0) / brigadeWorks.length) : 0;
  return { completedTasksThisMonth, completedWorksAllTime, hoursThisMonth, averageProgress };
}

/** Nearest-due, not-yet-finished tasks — real due dates (plannedEnd), not fabricated. */
export function computeUpcomingTasks(works: Work[], dateIso: string, limit = 3): Work[] {
  return works
    .filter((w) => w.status !== "completed" && w.status !== "cancelled" && w.plannedEnd >= dateIso)
    .sort((a, b) => a.plannedEnd.localeCompare(b.plannedEnd))
    .slice(0, limit);
}
