import { mockEmployees } from "./mockEmployees";
import { mockBrigades } from "./mockBrigades";
import { mockObjects } from "./mockObjects";
import type { AttendanceRecord, AttendanceStatus, Employee } from "../types";

/**
 * Attendance is generated for every employee actually assigned to a brigade — the same
 * `mockEmployees` used by the Brigades/Employees module, so employeeName always resolves to a
 * real, currently-existing person (single source of truth, no parallel fictional roster).
 * Unassigned free-pool employees (brigadeId === null) aren't deployed to any site yet, so
 * there's nothing to mark attendance against for them.
 */
const ATTENDANCE_ROSTER: Employee[] = mockEmployees.filter((e) => e.brigadeId !== null);

function findBrigadeSpecialization(brigadeId: string | null): string | null {
  if (!brigadeId) return null;
  return mockBrigades.find((b) => b.id === brigadeId)?.specialization ?? null;
}

function findObjectCity(objectId: string | null): string {
  if (!objectId) return "г. Душанбе";
  return mockObjects.find((o) => o.id === objectId)?.city ?? "г. Душанбе";
}

// 26 workdays across July 2026 (Sundays excluded: 5, 12, 19, 26) — matches the Attendance
// page's default filter window (2026-07-01 .. 2026-07-30) and includes "today" (2026-07-22).
const DATES = [
  "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-06", "2026-07-07", "2026-07-08",
  "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16",
  "2026-07-17", "2026-07-18", "2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24",
  "2026-07-25", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash;
}

interface DayOutcome {
  status: AttendanceStatus;
  arrivalTime: string | null;
  departureTime: string | null;
  note: string;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const ARRIVAL_BASE_MINUTES = 8 * 60; // 08:00
const DEPARTURE_BASE_MINUTES = 17 * 60 + 15; // 17:15

/**
 * Deterministic (never Math.random) per-employee/per-day outcome. The last 3 tracked dates
 * reflect the employee's CURRENT `EmployeeStatus` (a snapshot of "right now"), so someone who is
 * currently on sick leave / on leave / marked absent shows that reason on their most recent days
 * — everything earlier assumes a normal working history. Everyone else gets a realistic
 * ~85% present / 8% late / 7% absent split from a stable hash of (name, day), so the same
 * employee+date always resolves to the same outcome (no duplicates, no randomness).
 */
function buildDayOutcome(employee: Employee, dayIndex: number): DayOutcome {
  const isRecent = dayIndex >= DATES.length - 3;

  if (isRecent) {
    if (employee.status === "sick_leave") return { status: "absent", arrivalTime: null, departureTime: null, note: "Больничный" };
    if (employee.status === "on_leave") return { status: "absent", arrivalTime: null, departureTime: null, note: "Отпуск" };
    if (employee.status === "absent") return { status: "absent", arrivalTime: null, departureTime: null, note: "Неявка" };
  }

  const seed = (hashName(employee.fullName) + dayIndex * 31) % 100;

  if (seed < 7) {
    return { status: "absent", arrivalTime: null, departureTime: null, note: seed % 2 === 0 ? "Больничный" : "Неявка" };
  }
  if (seed < 15) {
    const lateBy = 5 + (seed % 20);
    return {
      status: "late",
      arrivalTime: minutesToTime(ARRIVAL_BASE_MINUTES + lateBy),
      departureTime: minutesToTime(DEPARTURE_BASE_MINUTES + (dayIndex % 3) * 5),
      note: `Опоздал на ${lateBy} мин`,
    };
  }
  return {
    status: "present",
    arrivalTime: minutesToTime(ARRIVAL_BASE_MINUTES - 5 + (seed % 6)),
    departureTime: minutesToTime(DEPARTURE_BASE_MINUTES + (dayIndex % 4) * 5),
    note: "",
  };
}

let idCounter = 1;
function nextId(): string {
  return `att-${String(idCounter++).padStart(4, "0")}`;
}

export const mockAttendance: AttendanceRecord[] = ATTENDANCE_ROSTER.flatMap((employee): AttendanceRecord[] =>
  DATES.map((date, dayIndex): AttendanceRecord => {
    const outcome = buildDayOutcome(employee, dayIndex);
    return {
      id: nextId(),
      date,
      employeeId: employee.id,
      employeeName: employee.fullName,
      position: employee.specialty,
      brigadeName: employee.brigadeName,
      brigadeSpecialization: findBrigadeSpecialization(employee.brigadeId),
      department: null,
      objectName: employee.objectName ?? "—",
      city: findObjectCity(employee.objectId),
      arrivalTime: outcome.arrivalTime,
      departureTime: outcome.departureTime,
      status: outcome.status,
      note: outcome.note,
    };
  }),
);

export const ATTENDANCE_OBJECTS: string[] = Array.from(
  new Set(ATTENDANCE_ROSTER.map((e) => e.objectName).filter((v): v is string => Boolean(v))),
).sort((a, b) => a.localeCompare(b, "ru"));
export const ATTENDANCE_BRIGADES: string[] = Array.from(
  new Set(ATTENDANCE_ROSTER.map((e) => e.brigadeName).filter((v): v is string => Boolean(v))),
).sort((a, b) => a.localeCompare(b, "ru"));
export const ATTENDANCE_EMPLOYEES: string[] = ATTENDANCE_ROSTER.map((e) => e.fullName);
