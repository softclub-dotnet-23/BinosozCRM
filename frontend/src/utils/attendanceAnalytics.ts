import type { AttendanceRecord } from "../types";
import type { SpecializationSlice } from "./brigadeAnalytics";

export interface AttendanceKpis {
  total: number;
  present: number;
  absent: number;
  late: number;
  presentPercent: number;
  absentPercent: number;
  latePercent: number;
}

export function computeAttendanceKpis(records: AttendanceRecord[]): AttendanceKpis {
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return { total, present, absent, late, presentPercent: pct(present), absentPercent: pct(absent), latePercent: pct(late) };
}

export function computeAttendanceStatusSlices(kpis: AttendanceKpis): SpecializationSlice[] {
  return [
    { key: "present", label: "Присутствовали", value: kpis.present, percent: kpis.presentPercent, color: "#22A447" },
    { key: "late", label: "Опоздали", value: kpis.late, percent: kpis.latePercent, color: "#F58A1F" },
    { key: "absent", label: "Отсутствовали", value: kpis.absent, percent: kpis.absentPercent, color: "#E83939" },
  ];
}

export interface FrequentLatenessRow {
  employeeName: string;
  count: number;
}

export function computeFrequentLateness(records: AttendanceRecord[], limit = 3): FrequentLatenessRow[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    if (r.status !== "late") continue;
    counts.set(r.employeeName, (counts.get(r.employeeName) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([employeeName, count]) => ({ employeeName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
