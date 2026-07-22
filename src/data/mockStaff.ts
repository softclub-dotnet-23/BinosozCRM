import { mockEmployees } from "./mockEmployees";
import { mockBrigades } from "./mockBrigades";
import type { Employee, StaffCategory, StaffMember, StaffStatus } from "../types";

/** Real brigades, for the "add/transfer staff" forms' brigade picker (components/employees/*). */
interface BrigadeInfo {
  name: string;
  specialization: string;
}

export const BRIGADE_OPTIONS: BrigadeInfo[] = mockBrigades.map((b) => ({ name: b.name, specialization: b.specialization }));

/**
 * Office/ITR department options for staff not tied to a brigade. `mockEmployees` only models
 * field crew (brigade-assigned or unassigned bench workers) — it has no admin/office employee
 * concept — so unlike brigades, there's no real source to derive this list from; it stays a
 * fixed, independent list for the manual "add staff" flow.
 */
const ITR_DEPARTMENTS = ["Отдел ПТО", "Отдел смет", "Отдел технадзора"];
const ADMIN_DEPARTMENTS = ["Бухгалтерия", "Отдел кадров", "Юридический отдел", "Секретариат", "Отдел снабжения", "Дирекция"];
export const DEPARTMENT_OPTIONS: string[] = [...ITR_DEPARTMENTS, ...ADMIN_DEPARTMENTS];
export type { BrigadeInfo };

/**
 * Payroll's HR profile roster is derived 1:1 from the real Employees (data/mockEmployees.ts) —
 * every StaffMember.employeeId points at a real, currently-existing Employee, so name/position/
 * brigade/role/status can never drift out of sync with Brigades/Attendance. There is no
 * independent fictional payroll roster; the only genuinely payroll-only data here (salary,
 * passport, contract, birth date, address) has no Employee counterpart to reconcile against.
 */

const TRANSLIT_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y",
  ь: "", э: "e", ю: "yu", я: "ya", ғ: "g", қ: "q", ҳ: "h", ҷ: "j", ӯ: "u", і: "i",
};

function transliterate(value: string): string {
  return value
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT_MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z]/g, "");
}

function makeEmail(firstName: string, lastName: string): string {
  return `${transliterate(firstName).slice(0, 1)}.${transliterate(lastName)}@example.com`;
}

function makeBirthDate(index: number): string {
  const age = 22 + (index % 33);
  const year = 2026 - age;
  const month = String(((index * 3) % 12) + 1).padStart(2, "0");
  const day = String(((index * 5) % 27) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makePassport(index: number): string {
  return `AA${String(2000000 + index).slice(-7)}`;
}

function makeInn(index: number): string {
  return `1100000${String(100000 + index).slice(-6)}`;
}

function makeAddress(index: number): string {
  const streets = [
    "г. Душанбе, ул. Рудаки",
    "г. Душанбе, ул. Айни",
    "г. Душанбе, ул. Борбад",
    "г. Душанбе, ул. Дусти",
    "г. Душанбе, ул. Фирдавси",
    "г. Душанбе, ул. Бухоро",
    "г. Гиссар, ул. Ленина",
    "г. Вахдат, ул. Истиклол",
  ];
  const street = streets[index % streets.length];
  const house = (index % 40) + 1;
  return `${street} ${house}`;
}

function findBrigadeSpecialization(brigadeId: string | null): string | null {
  if (!brigadeId) return null;
  return mockBrigades.find((b) => b.id === brigadeId)?.specialization ?? null;
}

/** Foreman (memberRole "foreman") = Прораб, brigadir = Бригадир, everyone else keeps their trade. */
function positionFor(employee: Employee): string {
  if (employee.memberRole === "foreman") return "Прораб";
  if (employee.memberRole === "brigadir") return "Бригадир";
  return employee.specialty;
}

/** Site leadership (foreman/brigadir) is payroll-classified as "engineer"; everyone else "worker". */
function categoryFor(employee: Employee): StaffCategory {
  return employee.memberRole === "foreman" || employee.memberRole === "brigadir" ? "engineer" : "worker";
}

function statusFor(employee: Employee): StaffStatus {
  return employee.status === "on_leave" ? "vacation" : "active";
}

function salaryFor(employee: Employee, index: number): number {
  const category = categoryFor(employee);
  return category === "worker" ? 2800 + (index % 15) * 100 : 4800 + (index % 12) * 300;
}

export const mockStaff: StaffMember[] = mockEmployees.map((employee, index): StaffMember => {
  const [firstName, lastName] = [employee.firstName, employee.lastName];
  return {
    id: `EMP-${String(index + 1).padStart(4, "0")}`,
    employeeId: employee.id,
    fullName: employee.fullName,
    position: positionFor(employee),
    category: categoryFor(employee),
    brigadeName: employee.brigadeName,
    brigadeSpecialization: findBrigadeSpecialization(employee.brigadeId),
    department: null,
    phone: employee.phone,
    status: statusFor(employee),
    hireDate: employee.assignedDate,
    email: makeEmail(firstName, lastName),
    birthDate: makeBirthDate(index),
    address: makeAddress(index),
    employmentType: "Полная занятость",
    salary: salaryFor(employee, index),
    passportNumber: makePassport(index),
    inn: makeInn(index),
    hasContract: true,
  };
});

export const STAFF_POSITIONS: string[] = Array.from(new Set(mockStaff.map((s) => s.position))).sort((a, b) =>
  a.localeCompare(b, "ru"),
);

export const STAFF_BRIGADES: string[] = Array.from(
  new Set(mockStaff.map((s) => s.brigadeName).filter((v): v is string => Boolean(v))),
).sort((a, b) => a.localeCompare(b, "ru"));
