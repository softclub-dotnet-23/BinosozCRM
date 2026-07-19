import type { AttendanceRecord, AttendanceStatus } from "../types";

interface RosterEntry {
  name: string;
  position: string;
  brigadeName: string | null;
  brigadeSpecialization: string | null;
  department: string | null;
  objectName: string;
  city: string;
}

// The same 10-person roster used on the Employees page (EMP-0001..EMP-0010), so every
// attendance row resolves to an already-photographed real person via PERSON_PHOTOS.
const ROSTER: RosterEntry[] = [
  { name: "Мирзоев Шахром", position: "Прораб", brigadeName: "Бригада №1", brigadeSpecialization: "Монолитные работы", department: null, objectName: "ЖК «Сомони»", city: "г. Душанбе" },
  { name: "Абдуллоев Бахтиёр", position: "Арматурщик", brigadeName: "Бригада №1", brigadeSpecialization: "Монолитные работы", department: null, objectName: "ЖК «Сомони»", city: "г. Душанбе" },
  { name: "Юсупов Далер", position: "Плотник", brigadeName: "Бригада №2", brigadeSpecialization: "Кладочные работы", department: null, objectName: "Бизнес-центр «Ватан»", city: "г. Душанбе" },
  { name: "Комрон Саидов", position: "Бетонщик", brigadeName: "Бригада №2", brigadeSpecialization: "Кладочные работы", department: null, objectName: "Бизнес-центр «Ватан»", city: "г. Душанбе" },
  { name: "Шариф Давлатов", position: "Сварщик", brigadeName: "Бригада №3", brigadeSpecialization: "Отделочные работы", department: null, objectName: "Коттедж «Навруз»", city: "г. Рудаки" },
  { name: "Мухиддин Холов", position: "Электромонтажник", brigadeName: "Бригада №4", brigadeSpecialization: "Инженерные сети", department: null, objectName: "ЖК «Сомони»", city: "г. Душанбе" },
  { name: "Рустамов Комрон", position: "Мастер отделочных работ", brigadeName: "Бригада №3", brigadeSpecialization: "Отделочные работы", department: null, objectName: "Коттедж «Навруз»", city: "г. Рудаки" },
  { name: "Темуров Фируз", position: "Подсобный рабочий", brigadeName: "Бригада №5", brigadeSpecialization: "Благоустройство", department: null, objectName: "Складской комплекс «Логистика»", city: "г. Гиссар" },
  { name: "Каримов Сухроб", position: "Инженер-сметчик", brigadeName: null, brigadeSpecialization: null, department: "Отдел смет", objectName: "Капитальный ремонт школы №15", city: "г. Душанбе" },
  { name: "Нозим Икромов", position: "Инженер ПТО", brigadeName: null, brigadeSpecialization: null, department: "Отдел ПТО", objectName: "Капитальный ремонт школы №15", city: "г. Душанбе" },
];

interface FeaturedRow {
  arrivalTime: string | null;
  departureTime: string | null;
  status: AttendanceStatus;
  note: string;
}

// Reproduces the reference screenshot's 10 rows for 15.07.2026 exactly — kept first in the
// array so the default (unsorted) table view shows exactly this page first.
const FEATURED_15TH: FeaturedRow[] = [
  { arrivalTime: "08:02", departureTime: "17:35", status: "present", note: "" },
  { arrivalTime: "08:15", departureTime: "17:40", status: "late", note: "Опоздал на 15 мин" },
  { arrivalTime: "07:58", departureTime: "17:20", status: "present", note: "" },
  { arrivalTime: null, departureTime: null, status: "absent", note: "Больничный" },
  { arrivalTime: "08:00", departureTime: "17:30", status: "present", note: "" },
  { arrivalTime: "08:05", departureTime: "17:25", status: "present", note: "" },
  { arrivalTime: "08:20", departureTime: "17:18", status: "late", note: "Опоздал на 20 мин" },
  { arrivalTime: null, departureTime: null, status: "absent", note: "Неявка" },
  { arrivalTime: "08:01", departureTime: "17:33", status: "present", note: "" },
  { arrivalTime: "08:10", departureTime: "17:10", status: "late", note: "Опоздал на 10 мин" },
];

// Every non-Sunday day in July 2026 except the 15th (already used above) — 25 distinct dates.
const EXTRA_DATES = [
  "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-06", "2026-07-07", "2026-07-08",
  "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-13", "2026-07-14", "2026-07-16", "2026-07-17",
  "2026-07-18", "2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25",
  "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30",
];

// Per-employee counts across their extra (non-15th) days — reconciled so totals across the
// whole dataset land on exactly 214 present / 10 late / 24 absent out of 248 records.
const EXTRA_DAYS = [24, 24, 24, 24, 24, 24, 24, 24, 23, 23];
const LATE_EXTRA = [0, 2, 1, 0, 0, 1, 1, 0, 1, 1];
const ABSENT_EXTRA = [2, 2, 2, 3, 2, 2, 2, 3, 2, 2];

const ARRIVAL_BASE_MINUTES = 8 * 60; // 08:00

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildExtraRow(employeeIndex: number, dayIndex: number): { status: AttendanceStatus; arrivalTime: string | null; departureTime: string | null; note: string } {
  const lateCount = LATE_EXTRA[employeeIndex];
  const absentCount = ABSENT_EXTRA[employeeIndex];

  if (dayIndex < lateCount) {
    const lateBy = 8 + ((employeeIndex + dayIndex) % 4) * 4; // 8-20 min late
    return {
      status: "late",
      arrivalTime: minutesToTime(ARRIVAL_BASE_MINUTES + lateBy),
      departureTime: minutesToTime(17 * 60 + 15 + (dayIndex % 3) * 5),
      note: `Опоздал на ${lateBy} мин`,
    };
  }
  if (dayIndex < lateCount + absentCount) {
    return {
      status: "absent",
      arrivalTime: null,
      departureTime: null,
      note: dayIndex % 2 === 0 ? "Больничный" : "Неявка",
    };
  }
  return {
    status: "present",
    arrivalTime: minutesToTime(ARRIVAL_BASE_MINUTES - 5 + (dayIndex % 6)),
    departureTime: minutesToTime(17 * 60 + 15 + (dayIndex % 4) * 5),
    note: "",
  };
}

let idCounter = 1;
function nextId(): string {
  return `att-${String(idCounter++).padStart(4, "0")}`;
}

export const mockAttendance: AttendanceRecord[] = [
  ...ROSTER.map((person, i): AttendanceRecord => {
    const f = FEATURED_15TH[i];
    return {
      id: nextId(),
      date: "2026-07-15",
      employeeName: person.name,
      position: person.position,
      brigadeName: person.brigadeName,
      brigadeSpecialization: person.brigadeSpecialization,
      department: person.department,
      objectName: person.objectName,
      city: person.city,
      arrivalTime: f.arrivalTime,
      departureTime: f.departureTime,
      status: f.status,
      note: f.note,
    };
  }),
  ...ROSTER.flatMap((person, employeeIndex): AttendanceRecord[] => {
    const dayCount = EXTRA_DAYS[employeeIndex];
    return Array.from({ length: dayCount }, (_, dayIndex): AttendanceRecord => {
      const row = buildExtraRow(employeeIndex, dayIndex);
      return {
        id: nextId(),
        date: EXTRA_DATES[dayIndex],
        employeeName: person.name,
        position: person.position,
        brigadeName: person.brigadeName,
        brigadeSpecialization: person.brigadeSpecialization,
        department: person.department,
        objectName: person.objectName,
        city: person.city,
        arrivalTime: row.arrivalTime,
        departureTime: row.departureTime,
        status: row.status,
        note: row.note,
      };
    });
  }),
];

export const ATTENDANCE_OBJECTS: string[] = Array.from(new Set(ROSTER.map((r) => r.objectName))).sort((a, b) =>
  a.localeCompare(b, "ru"),
);
export const ATTENDANCE_BRIGADES: string[] = Array.from(
  new Set(ROSTER.map((r) => r.brigadeName).filter((v): v is string => Boolean(v))),
).sort((a, b) => a.localeCompare(b, "ru"));
export const ATTENDANCE_EMPLOYEES: string[] = ROSTER.map((r) => r.name);
