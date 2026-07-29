import type { PhotoReport, PhotoReportStatus, Work } from "../types";
import { formatDateShort } from "./date";

export interface PhotoReportStats {
  total: number;
  today: number;
  pending: number;
  approved: number;
  rejected: number;
}

/** "Total"/"today" count real report submissions (not raw image count) — the page's own KPI and
 * pagination totals then agree on the same number instead of two different countings of the same
 * data. */
export function computePhotoReportStats(reports: PhotoReport[], todayIso: string): PhotoReportStats {
  return {
    total: reports.length,
    today: reports.filter((r) => r.createdDate.slice(0, 10) === todayIso).length,
    pending: reports.filter((r) => r.status === "pending").length,
    approved: reports.filter((r) => r.status === "approved").length,
    rejected: reports.filter((r) => r.status === "rejected").length,
  };
}

export interface PhotoActivityPoint {
  date: string;
  dateLabel: string;
  uploaded: number;
  approved: number;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** One point per day for the last `days` days ending on `todayIso`: "uploaded" is every real
 * report submitted that day, "approved" is the subset of those currently approved — there's no
 * separate approval-date field in the data model, so this reads status as of now rather than
 * inventing a review timestamp that doesn't exist. */
export function computePhotoActivityChart(reports: PhotoReport[], todayIso: string, days = 7): PhotoActivityPoint[] {
  const start = addDaysIso(todayIso, -(days - 1));
  const byDate = new Map<string, PhotoReport[]>();
  for (const r of reports) {
    const d = r.createdDate.slice(0, 10);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(r);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDaysIso(start, i);
    const dayReports = byDate.get(date) ?? [];
    return {
      date,
      dateLabel: formatDateShort(date),
      uploaded: dayReports.length,
      approved: dayReports.filter((r) => r.status === "approved").length,
    };
  });
}

export interface PhotoReportFilters {
  status: PhotoReportStatus | "all" | "today";
  workId: string;
}

export function filterPhotoReports(reports: PhotoReport[], filters: PhotoReportFilters, todayIso: string): PhotoReport[] {
  return reports.filter((r) => {
    if (filters.status === "today" && r.createdDate.slice(0, 10) !== todayIso) return false;
    if (filters.status !== "all" && filters.status !== "today" && r.status !== filters.status) return false;
    if (filters.workId && r.workId !== filters.workId) return false;
    return true;
  });
}

export interface PhotoReportSummary {
  totalTasks: number;
  pendingPhotos: number;
  nextCheckDate: string | null;
  remarks: number;
}

/** Real "Краткая сводка" numbers: totalTasks/pendingPhotos are derived from the worker's actual
 * brigade works (a work "needs photos" if it's in progress and has no report at all yet),
 * nextCheckDate is the nearest real upcoming Work.plannedEnd, and remarks reuses the same real
 * rejected-report count shown elsewhere on the page — no separately fabricated numbers. */
export function computePhotoReportSummary(brigadeWorks: Work[], reports: PhotoReport[], stats: PhotoReportStats, todayIso: string): PhotoReportSummary {
  const workIdsWithReports = new Set(reports.map((r) => r.workId));
  const pendingPhotos = brigadeWorks.filter((w) => w.status === "in_progress" && !workIdsWithReports.has(w.id)).length;
  const upcoming = brigadeWorks
    .filter((w) => w.plannedEnd >= todayIso && w.status !== "completed" && w.status !== "cancelled")
    .sort((a, b) => a.plannedEnd.localeCompare(b.plannedEnd))[0];

  return {
    totalTasks: brigadeWorks.length,
    pendingPhotos,
    nextCheckDate: upcoming?.plannedEnd ?? null,
    remarks: stats.rejected,
  };
}
