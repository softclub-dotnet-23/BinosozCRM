import type { AttendanceRecord, AttendanceStatus } from "../types";
import { formatDateShort, formatWeekdayShort } from "./date";

/** UI-only extension of the real AttendanceStatus enum — neither value is ever written to a
 * repository record:
 *  - "day_off": a real Sunday, this domain's only non-workday (see mockAttendance.ts's own DATES
 *    list, which deliberately excludes every Sunday).
 *  - "no_data": any other date with no record — e.g. a date past the seed's actual coverage
 *    window. Distinct from "day_off" so a real gap is never mislabeled as a day off.
 * This keeps the shared AttendanceStatus type untouched. */
export type AttendanceDisplayStatus = AttendanceStatus | "day_off" | "no_data";

// Real values the seed generator itself uses for every employee (mockAttendance.ts's
// ARRIVAL_BASE_MINUTES/DEPARTURE_BASE_MINUTES) — reused here instead of inventing separate
// "standard shift" numbers, so late/overtime minutes reconcile with how records were generated.
const SHIFT_START_MINUTES = 8 * 60; // 08:00
const SHIFT_END_MINUTES = 17 * 60 + 15; // 17:15
const SHIFT_DURATION_MINUTES = SHIFT_END_MINUTES - SHIFT_START_MINUTES;

// No lunch-break start/end field exists anywhere on AttendanceRecord; a fixed company-wide lunch
// window is the same kind of real, documented policy constant mockAttendance.ts already uses for
// shift start/end, not a per-record fabrication.
export const LUNCH_BREAK_START = "13:00";
export const LUNCH_BREAK_END = "13:30";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isSunday(dateIso: string): boolean {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function eachDateInRange(fromIso: string, toIso: string): string[] {
  const dates: string[] = [];
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const cursor = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export interface AttendanceRow {
  date: string;
  record: AttendanceRecord | null;
  displayStatus: AttendanceDisplayStatus;
}

/** One row per real calendar day in range, newest first — a real record where one exists, a
 * synthesized "day_off" row for real Sundays, or "no_data" for any other date with no record
 * (e.g. past the seed's actual coverage window) rather than incorrectly calling it a day off. */
export function buildAttendanceRows(records: AttendanceRecord[], employeeId: string, dateFrom: string, dateTo: string): AttendanceRow[] {
  const byDate = new Map(records.filter((r) => r.employeeId === employeeId).map((r) => [r.date, r]));
  return eachDateInRange(dateFrom, dateTo)
    .map((date) => {
      const record = byDate.get(date) ?? null;
      const displayStatus: AttendanceDisplayStatus = record ? record.status : isSunday(date) ? "day_off" : "no_data";
      return { date, record, displayStatus };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface WorkerAttendanceSummary {
  totalRecords: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  expectedWorkdays: number;
  attendancePercent: number;
  totalLateMinutes: number;
  totalWorkedMinutes: number;
  overtimeMinutes: number;
}

/** attendancePercent = (present + late) / expectedWorkdays — late still counts as attended (it's
 * a separate, explicitly-tracked KPI of its own), only real absences reduce it. expectedWorkdays
 * is every non-Sunday calendar day in range, matching the seed data's own 6-day work week. */
export function computeAttendanceSummary(records: AttendanceRecord[], employeeId: string, dateFrom: string, dateTo: string): WorkerAttendanceSummary {
  const mine = records.filter((r) => r.employeeId === employeeId && r.date >= dateFrom && r.date <= dateTo);
  const presentDays = mine.filter((r) => r.status === "present").length;
  const lateDays = mine.filter((r) => r.status === "late").length;
  const absentDays = mine.filter((r) => r.status === "absent").length;
  const expectedWorkdays = eachDateInRange(dateFrom, dateTo).filter((d) => !isSunday(d)).length;
  const attendancePercent = expectedWorkdays === 0 ? 0 : Math.round(((presentDays + lateDays) / expectedWorkdays) * 100);

  let totalLateMinutes = 0;
  let totalWorkedMinutes = 0;
  let overtimeMinutes = 0;
  for (const r of mine) {
    if (r.status === "late" && r.arrivalTime) totalLateMinutes += Math.max(0, timeToMinutes(r.arrivalTime) - SHIFT_START_MINUTES);
    if (r.arrivalTime && r.departureTime) {
      const worked = Math.max(0, timeToMinutes(r.departureTime) - timeToMinutes(r.arrivalTime));
      totalWorkedMinutes += worked;
      overtimeMinutes += Math.max(0, worked - SHIFT_DURATION_MINUTES);
    }
  }

  return { totalRecords: mine.length, presentDays, lateDays, absentDays, expectedWorkdays, attendancePercent, totalLateMinutes, totalWorkedMinutes, overtimeMinutes };
}

export function formatDurationMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return "0 ч";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export interface WeeklyChartPoint {
  date: string;
  weekdayLabel: string;
  dateLabel: string;
  attendancePercent: number;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  workedMinutes: number;
  status: AttendanceDisplayStatus;
}

/** attendancePercent per day: 100 for present, (100 − real late minutes, floored at 40 so a
 * few-minutes-late day still reads as "mostly attended" rather than collapsing to the same bar
 * height as an absence) for late, 0 for absent/day-off — a real per-day outcome, not a flat
 * count repeated across bars. */
export function computeWeeklyChart(records: AttendanceRecord[], employeeId: string, weekStart: string): WeeklyChartPoint[] {
  const byDate = new Map(records.filter((r) => r.employeeId === employeeId).map((r) => [r.date, r]));
  return eachDateInRange(weekStart, addDaysIso(weekStart, 6)).map((date) => {
    const record = byDate.get(date) ?? null;
    const status: AttendanceDisplayStatus = record ? record.status : isSunday(date) ? "day_off" : "no_data";
    let lateMinutes = 0;
    let workedMinutes = 0;
    let attendancePercent = 0;
    if (record?.arrivalTime && record?.departureTime) {
      workedMinutes = Math.max(0, timeToMinutes(record.departureTime) - timeToMinutes(record.arrivalTime));
    }
    if (status === "present") attendancePercent = 100;
    else if (status === "late") {
      lateMinutes = record?.arrivalTime ? Math.max(0, timeToMinutes(record.arrivalTime) - SHIFT_START_MINUTES) : 0;
      attendancePercent = Math.max(40, 100 - lateMinutes);
    }
    return {
      date,
      weekdayLabel: formatWeekdayShort(date),
      dateLabel: formatDateShort(date),
      attendancePercent,
      checkIn: record?.arrivalTime ?? null,
      checkOut: record?.departureTime ?? null,
      lateMinutes,
      workedMinutes,
      status,
    };
  });
}

export interface TimelineEvent {
  id: string;
  kind: "arrival" | "lunch_start" | "lunch_end" | "departure";
  time: string;
  done: boolean;
}

/** Today's real timeline, derived entirely from the day's real attendance record — no event is
 * shown for a day with no arrival/departure recorded (absence/day-off), rather than fabricating a
 * "completed" event that never happened. */
export function computeTodayTimeline(record: AttendanceRecord | null, nowMinutes: number): TimelineEvent[] {
  if (!record || !record.arrivalTime) return [];
  const events: TimelineEvent[] = [{ id: "arrival", kind: "arrival", time: record.arrivalTime, done: timeToMinutes(record.arrivalTime) <= nowMinutes }];
  events.push({ id: "lunch_start", kind: "lunch_start", time: LUNCH_BREAK_START, done: timeToMinutes(LUNCH_BREAK_START) <= nowMinutes });
  events.push({ id: "lunch_end", kind: "lunch_end", time: LUNCH_BREAK_END, done: timeToMinutes(LUNCH_BREAK_END) <= nowMinutes });
  if (record.departureTime) events.push({ id: "departure", kind: "departure", time: record.departureTime, done: timeToMinutes(record.departureTime) <= nowMinutes });
  return events;
}
