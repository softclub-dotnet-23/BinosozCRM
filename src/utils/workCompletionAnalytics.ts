import type { Work } from "../types";

function round(value: number): number {
  return Math.round(value);
}

// UTC-anchored throughout (the "Z" suffix) — parsing as local time and reading back via
// toISOString() (always UTC) silently shifts dates by a day in timezones ahead of UTC.
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

function eachDateInclusive(fromIso: string, toIso: string): string[] {
  const span = daysBetween(fromIso, toIso);
  const dates: string[] = [];
  for (let i = 0; i <= span; i++) dates.push(addDays(fromIso, i));
  return dates;
}

/** Fraction (0-1) of a single work's PLANNED schedule elapsed by `dayIso`. */
function plannedFractionOn(work: Work, dayIso: string): number {
  if (dayIso <= work.plannedStart) return 0;
  if (dayIso >= work.plannedEnd) return 1;
  const span = daysBetween(work.plannedStart, work.plannedEnd);
  const elapsed = daysBetween(work.plannedStart, dayIso);
  return Math.min(1, Math.max(0, elapsed / span));
}

/** Fraction (0-1) actually completed by `dayIso`, read from the work's real progressHistory (the
 * latest entry at or before that day). 0 before the work's real start; if there is no history at
 * all, falls back to a flat line at the work's current stored progress (never fabricated/interpolated). */
function actualFractionOn(work: Work, dayIso: string): number {
  if (!work.actualStart || dayIso < work.actualStart) return 0;
  const entries = work.progressHistory.filter((h) => h.date <= dayIso);
  if (entries.length > 0) {
    const latest = entries.reduce((a, b) => (a.date > b.date ? a : b));
    return Math.min(1, Math.max(0, latest.progress / 100));
  }
  return work.progressHistory.length === 0 ? Math.min(1, Math.max(0, work.progress / 100)) : 0;
}

export interface WorkCompletionPoint {
  date: string;
  plan: number;
  actual: number;
  completionPercent: number;
}

/**
 * One point per calendar day across [dateFrom, dateTo] (weekly-sampled instead beyond ~90 days,
 * to keep the chart/tooltip/animation responsive on long ranges).
 *
 * plan(day)   = average, across all in-scope works, of how far each work's own PLANNED schedule
 *               has progressed by that day (0-100). Right axis.
 * actual(day) = the same average, but for each work's real ACTUAL progress (from progressHistory).
 *               Right axis.
 * completionPercent(day) = actual(day) / totalPlannedScope * 100, where totalPlannedScope is the
 *               plan curve's OWN value at the last day in scope — i.e. "how much of the plan is
 *               supposed to be done by the end of the selected period" — a single fixed number,
 *               not a per-day value. Left (percentage) axis.
 *
 * ROOT CAUSE OF THE OLD BUG: the previous implementation computed the percentage as
 * `actual(day) / plan(day) * 100` — dividing by that SAME day's plan value. Early in a period the
 * average plan is naturally tiny (most works haven't reached their planned start yet), so as soon
 * as any one work's actual progress ran slightly ahead of its own individual schedule, the ratio
 * blew past 100% and got silently clamped — e.g. plan=10, actual=17 on day 6 produced
 * round(17/10*100) = 170, clamped to a nonsensical "100% done" six days into a month-long period.
 * Dividing by the FIXED end-of-period plan value instead of the moving day-by-day plan value is
 * what actually fixes it, rather than just clamping the symptom away.
 */
export function computeWorkCompletionSeries(works: Work[], dateFrom: string, dateTo: string): WorkCompletionPoint[] {
  if (works.length === 0) return [];

  const allDates = eachDateInclusive(dateFrom, dateTo);
  const step = allDates.length > 90 ? 7 : 1;
  const sampledDates = allDates.filter((_, i) => i % step === 0 || i === allDates.length - 1);

  const raw = sampledDates.map((day) => ({
    date: day,
    plan: round((works.reduce((sum, w) => sum + plannedFractionOn(w, day), 0) / works.length) * 100),
    actual: round((works.reduce((sum, w) => sum + actualFractionOn(w, day), 0) / works.length) * 100),
  }));

  const totalPlannedScope = raw[raw.length - 1]?.plan ?? 0;

  return raw.map((p) => ({
    date: p.date,
    plan: p.plan,
    actual: p.actual,
    completionPercent: totalPlannedScope <= 0 ? 0 : Math.max(0, Math.min(100, round((p.actual / totalPlannedScope) * 100))),
  }));
}

/** Evenly-spaced major tick dates within [dateFrom, dateTo] (default 7, e.g. 1/6/11/16/21/26/31)
 * — the last tick always lands exactly on `dateTo` regardless of stride rounding, so a period
 * ending on the 31st never shows "30" as its final label. */
export function majorTickDates(dateFrom: string, dateTo: string, count = 7): string[] {
  const totalDays = daysBetween(dateFrom, dateTo);
  const steps = Math.max(1, Math.min(count - 1, totalDays));
  const stride = totalDays / steps;
  const ticks: string[] = [];
  for (let i = 0; i <= steps; i++) {
    ticks.push(i === steps ? dateTo : addDays(dateFrom, Math.round(stride * i)));
  }
  return Array.from(new Set(ticks));
}

/** "6 июл" / "6 Jul" — day number (no leading zero) + a 3-letter month abbreviation derived from
 * the app's own existing full month-name translations (AppStrings["brigades"].monthJan..monthDec),
 * so labels genuinely change with the selected language instead of being hardcoded to Russian. */
export function formatChartDayLabel(iso: string, fullMonthNames: string[]): string {
  const day = Number(iso.slice(8, 10));
  const monthIndex = Number(iso.slice(5, 7)) - 1;
  const month = (fullMonthNames[monthIndex] ?? "").slice(0, 3);
  return `${day} ${month}`;
}
