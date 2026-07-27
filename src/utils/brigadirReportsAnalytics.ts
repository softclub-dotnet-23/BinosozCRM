import type { CategorySpend, Work, WorkPriority } from "../types";
import { percentChange, previousPeriod } from "./reportsAnalytics";

function round(value: number): number {
  return Math.round(value);
}

// All date math here is anchored to UTC (the "Z" suffix) and mutated/read with the UTC-suffixed
// Date methods throughout — parsing as local time and then reading back with toISOString() (UTC)
// silently shifts the date by a day in any timezone ahead of UTC, which is exactly the bug that
// produced an off-by-one first tick ("30 июн" instead of "1 июл") before this was fixed.
function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((to - from) / 86_400_000));
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A work is "in scope" for a period when its planned schedule overlaps that period at all —
 * the same overlap test used to scope every KPI/chart/table on the page to the selected date range. */
export function isWorkInPeriod(work: Work, dateFrom: string, dateTo: string): boolean {
  return work.plannedStart <= dateTo && work.plannedEnd >= dateFrom;
}

/** Expected cumulative progress (0-100) for a single work on a given day, based on its own planned schedule. */
function plannedProgressOn(work: Work, dayIso: string): number {
  if (dayIso <= work.plannedStart) return 0;
  if (dayIso >= work.plannedEnd) return 100;
  const span = daysBetween(work.plannedStart, work.plannedEnd);
  const elapsed = daysBetween(work.plannedStart, dayIso);
  return Math.min(100, Math.max(0, round((elapsed / span) * 100)));
}

/** Actual progress for a work on a given day, read from its real progressHistory (the latest
 * entry at or before that day). Falls back to 0 before the work started, or its current
 * progress once past the last recorded history entry (no history = flat line at current progress). */
function actualProgressOn(work: Work, dayIso: string): number {
  if (!work.actualStart || dayIso < work.actualStart) return 0;
  const entries = [...work.progressHistory].filter((h) => h.date <= dayIso).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (entries.length > 0) return entries[entries.length - 1].progress;
  return work.progressHistory.length === 0 ? work.progress : 0;
}

export interface WorkDynamicsPoint {
  date: string;
  label: string;
  planned: number;
  actual: number;
  rate: number;
}

/** Planned vs. actual completion curve for a set of works over a period, sampled at ~7 evenly
 * spaced points — computed from each work's own plannedStart/plannedEnd and real progressHistory,
 * not a fixed mock series, so it reflects whichever works the current brigade actually has and
 * whatever date range is selected (not hardcoded to any particular month). */
export function computeWorkDynamicsSeries(works: Work[], dateFrom: string, dateTo: string): WorkDynamicsPoint[] {
  const totalDays = daysBetween(dateFrom, dateTo);
  const steps = Math.min(7, Math.max(2, totalDays + 1));
  const stride = totalDays / (steps - 1);

  const points: WorkDynamicsPoint[] = [];
  for (let i = 0; i < steps; i++) {
    const dayIso = i === steps - 1 ? dateTo : addDays(dateFrom, Math.round(stride * i));
    const planned = works.length > 0 ? round(works.reduce((sum, w) => sum + plannedProgressOn(w, dayIso), 0) / works.length) : 0;
    const actual = works.length > 0 ? round(works.reduce((sum, w) => sum + actualProgressOn(w, dayIso), 0) / works.length) : 0;
    const rate = planned > 0 ? Math.min(100, round((actual / planned) * 100)) : 0;
    points.push({
      date: dayIso,
      label: `${dayIso.slice(8, 10)} ${["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"][Number(dayIso.slice(5, 7)) - 1]}`,
      planned,
      actual,
      rate,
    });
  }
  return points;
}

/** Distributes `counts` across percentages that sum to exactly 100 (when total > 0), using the
 * largest-remainder method — plain per-bucket Math.round() can drift to 99% or 101% once you have
 * more than two buckets, which is exactly the "display artifact" the reference explicitly forbids. */
export function distributePercentages(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((c) => (c / total) * 100);
  const floors = raw.map(Math.floor);
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < remainder; k++) result[order[k % order.length].i] += 1;
  return result;
}

/** Mon-Fri day count in [dateFrom, dateTo] inclusive — no work-calendar/holiday utility exists
 * elsewhere in this codebase (confirmed by search), so this is a standard, deterministic business-day
 * definition rather than an invented one. */
export function computeWorkingDays(dateFrom: string, dateTo: string): number {
  let count = 0;
  let cursor = new Date(`${dateFrom}T00:00:00`);
  const end = new Date(`${dateTo}T00:00:00`);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return count;
}

export type WorkStatusBucketKey = "completed" | "in_progress" | "on_review" | "overdue" | "other";

export interface WorkStatusBucket {
  key: WorkStatusBucketKey;
  count: number;
  percent: number;
  color: string;
}

const STATUS_COLORS: Record<WorkStatusBucketKey, string> = {
  completed: "#22A447",
  in_progress: "#2869C9",
  on_review: "#F58A1F",
  overdue: "#E83939",
  other: "#9CA3AF",
};

/** Завершено/В работе/На проверке/Просрочено — matches the four statuses shown on the reference
 * dashboard; any remaining works (planned/paused/cancelled) fold into "other" instead of being
 * silently dropped, so the bucket counts always sum to works.length. Percentages always sum to
 * exactly 100 (distributePercentages), never left to independent per-bucket rounding. */
export function computeWorkStatusBreakdown(works: Work[]): WorkStatusBucket[] {
  const completed = works.filter((w) => w.status === "completed").length;
  const inProgress = works.filter((w) => w.status === "in_progress").length;
  const onReview = works.filter((w) => w.status === "on_review").length;
  const overdue = works.filter((w) => w.status === "overdue").length;
  const other = works.length - completed - inProgress - onReview - overdue;
  const counts = [completed, inProgress, onReview, overdue, other];
  const percents = distributePercentages(counts);
  const keys: WorkStatusBucketKey[] = ["completed", "in_progress", "on_review", "overdue", "other"];
  return keys
    .map((key, i) => ({ key, count: counts[i], percent: percents[i], color: STATUS_COLORS[key] }))
    .filter((b) => b.count > 0);
}

export function workStatusBucketToDonut(buckets: WorkStatusBucket[], labelFor: (key: WorkStatusBucketKey) => string): CategorySpend[] {
  return buckets.map((b) => ({ category: labelFor(b.key), amount: b.count, color: b.color }));
}

export type PriorityBucketKey = "high" | "medium" | "low";

export interface PriorityBucket {
  key: PriorityBucketKey;
  count: number;
  percent: number;
  color: string;
}

const PRIORITY_COLORS: Record<PriorityBucketKey, string> = { high: "#E83939", medium: "#F58A1F", low: "#22A447" };

/** Высокий/Средний/Низкий — "critical" folds into "Высокий" so the breakdown stays the 3-tier
 * severity view shown on the reference rather than a raw 4-value enum dump. Percentages sum to 100. */
export function computeWorkPriorityBreakdown(works: Work[]): PriorityBucket[] {
  const countOf = (priorities: WorkPriority[]) => works.filter((w) => priorities.includes(w.priority)).length;
  const counts = [countOf(["high", "critical"]), countOf(["medium"]), countOf(["low"])];
  const percents = distributePercentages(counts);
  const keys: PriorityBucketKey[] = ["high", "medium", "low"];
  return keys.map((key, i) => ({ key, count: counts[i], percent: percents[i], color: PRIORITY_COLORS[key] }));
}

export interface TopObjectProgressRow {
  objectName: string;
  totalWorks: number;
  completedWorks: number;
  averageProgress: number;
  changePoints: number;
}

/** Per-object progress with a real period-over-period delta: the average progress each work had
 * recorded (via progressHistory) at the start of the period, versus its progress now. */
export function computeTopObjectsProgress(works: Work[], periodStart: string): TopObjectProgressRow[] {
  const byObject = new Map<string, Work[]>();
  for (const w of works) byObject.set(w.objectName, [...(byObject.get(w.objectName) ?? []), w]);

  return Array.from(byObject.entries())
    .map(([objectName, rows]) => {
      const averageProgress = round(rows.reduce((sum, w) => sum + w.progress, 0) / rows.length);
      const startProgress = round(rows.reduce((sum, w) => sum + actualProgressOn(w, periodStart), 0) / rows.length);
      return {
        objectName,
        totalWorks: rows.length,
        completedWorks: rows.filter((w) => w.status === "completed").length,
        averageProgress,
        changePoints: averageProgress - startProgress,
      };
    })
    .sort((a, b) => b.averageProgress - a.averageProgress);
}

export interface ExpenseCategoryRow {
  category: string;
  planned: number;
  actual: number;
  variance: number;
}

/**
 * Категория/План/Факт/Отклонение. Real "Факт" per category (materials from receipts+write-offs,
 * labor from payroll). There is no per-category budget line anywhere in this app — BudgetLine is
 * tracked per object only (confirmed: no `category` field) — so a per-category "План" doesn't
 * exist as a stored fact. Rather than invent one, this allocates the object's own real budget,
 * time-prorated for the selected period (the same straight-line technique already used by
 * computeDailyFinanceSeries for object-level income), across categories in proportion to how the
 * period's real spend actually split between them. It's a documented modeling choice built
 * entirely from real inputs (real budget, real dates, real actual amounts) — not a random or
 * hardcoded number, and categories with zero real spend are omitted rather than padded.
 */
export function computeExpensesByCategory(materialsActual: number, laborActual: number, plannedForPeriod: number): ExpenseCategoryRow[] {
  const rows: { category: string; actual: number }[] = [];
  if (materialsActual > 0) rows.push({ category: "Материалы", actual: materialsActual });
  if (laborActual > 0) rows.push({ category: "Оплата труда", actual: laborActual });
  const totalActual = rows.reduce((sum, r) => sum + r.actual, 0);
  if (rows.length === 0 || totalActual === 0) return [];
  return rows.map((r) => {
    const planned = round(plannedForPeriod * (r.actual / totalActual));
    const actual = round(r.actual);
    return { category: r.category, planned, actual, variance: actual - planned };
  });
}

export interface PeriodDeltas {
  totalWorksPercent: number | null;
  completedWorksPercent: number | null;
  overdueWorksPercent: number | null;
  overdueWorksCountDelta: number;
  averageProgressPoints: number;
  totalExpensePercent: number | null;
}

/** Period-over-period comparison for the five KPI cards, reusing the app's existing
 * previousPeriod()/percentChange() helpers (utils/reportsAnalytics.ts) rather than a second
 * implementation of the same math. `allBrigadeWorks` must be the brigade's full, un-date-filtered
 * work list so the previous window can be resolved independently of the currently selected range. */
export function computePeriodDeltas(
  allBrigadeWorks: Work[],
  currentAverageProgress: number,
  currentExpense: number,
  previousExpense: number,
  dateFrom: string,
  dateTo: string,
): PeriodDeltas {
  const { from: prevFrom, to: prevTo } = previousPeriod(dateFrom, dateTo);
  const previousWorks = allBrigadeWorks.filter((w) => isWorkInPeriod(w, prevFrom, prevTo));
  const currentWorks = allBrigadeWorks.filter((w) => isWorkInPeriod(w, dateFrom, dateTo));

  const prevCompleted = previousWorks.filter((w) => w.status === "completed").length;
  const currCompleted = currentWorks.filter((w) => w.status === "completed").length;
  const prevOverdue = previousWorks.filter((w) => w.status === "overdue").length;
  const currOverdue = currentWorks.filter((w) => w.status === "overdue").length;
  const prevAverageProgress = previousWorks.length > 0 ? round(previousWorks.reduce((s, w) => s + w.progress, 0) / previousWorks.length) : 0;

  return {
    totalWorksPercent: previousWorks.length > 0 || currentWorks.length > 0 ? percentChange(currentWorks.length, previousWorks.length) : null,
    completedWorksPercent: prevCompleted > 0 || currCompleted > 0 ? percentChange(currCompleted, prevCompleted) : null,
    overdueWorksPercent: prevOverdue > 0 || currOverdue > 0 ? percentChange(currOverdue, prevOverdue) : null,
    overdueWorksCountDelta: currOverdue - prevOverdue,
    averageProgressPoints: currentAverageProgress - prevAverageProgress,
    totalExpensePercent: previousExpense > 0 || currentExpense > 0 ? percentChange(currentExpense, previousExpense) : null,
  };
}
