import { WORK_SECTIONS } from "../data/mockWorks";
import type { CriticalWork, Work, WorkAnalytics, WorkSectionBreakdown } from "../types";

export function computeWorkAnalytics(works: Work[]): WorkAnalytics {
  const total = works.length;
  const completed = works.filter((w) => w.status === "completed").length;
  const inProgress = works.filter((w) => w.status === "in_progress").length;
  const overdue = works.filter((w) => w.status === "overdue").length;
  const planned = works.filter((w) => w.status === "planned").length;
  const onReview = works.filter((w) => w.status === "on_review").length;
  const paused = works.filter((w) => w.status === "paused").length;
  const cancelled = works.filter((w) => w.status === "cancelled").length;
  const averageProgress = total > 0 ? Math.round(works.reduce((sum, w) => sum + w.progress, 0) / total) : 0;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    total,
    completed,
    inProgress,
    overdue,
    planned,
    onReview,
    paused,
    cancelled,
    completedPercent: pct(completed),
    inProgressPercent: pct(inProgress),
    overduePercent: pct(overdue),
    plannedPercent: pct(planned),
    averageProgress,
  };
}

export function computeSectionBreakdown(works: Work[]): WorkSectionBreakdown[] {
  return WORK_SECTIONS.map((section) => {
    const sectionWorks = works.filter((w) => w.sectionId === section.id);
    const workCount = sectionWorks.length;
    const averageProgress =
      workCount > 0 ? Math.round(sectionWorks.reduce((sum, w) => sum + w.progress, 0) / workCount) : 0;
    return { section, workCount, averageProgress };
  });
}

export function computeActualDays(work: Work, todayIso: string): number {
  if (!work.actualStart) return 0;
  const start = new Date(`${work.actualStart}T00:00:00`).getTime();
  const cap = work.actualEnd ?? (todayIso < work.plannedEnd ? todayIso : work.plannedEnd);
  const end = new Date(`${cap}T00:00:00`).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function computeOverdueDays(work: Work, todayIso: string): number {
  const end = new Date(`${work.plannedEnd}T00:00:00`).getTime();
  const today = new Date(`${todayIso}T00:00:00`).getTime();
  return Math.max(0, Math.round((today - end) / 86_400_000));
}

export function computeCriticalWorks(works: Work[], todayIso: string, limit = 3): CriticalWork[] {
  return works
    .filter((w) => w.status === "overdue")
    .map((work) => ({ work, overdueDays: computeOverdueDays(work, todayIso) }))
    .sort((a, b) => b.overdueDays - a.overdueDays || a.work.progress - b.work.progress)
    .slice(0, limit);
}
