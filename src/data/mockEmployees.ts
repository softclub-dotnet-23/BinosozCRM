import { mockBrigades } from "./mockBrigades";
import type { Employee, EmployeeStatus, WorkShift } from "../types";

function findBrigade(id: string) {
  const brigade = mockBrigades.find((b) => b.id === id);
  if (!brigade) throw new Error(`Unknown mock brigade id: ${id}`);
  return brigade;
}

interface RawEmployee {
  firstName: string;
  lastName: string;
  phone: string;
  specialty: string;
  qualificationGrade: number;
  brigadeId: string | null;
  memberRole: Employee["memberRole"];
  shift: WorkShift;
  status: EmployeeStatus;
  assignedDate: string;
}

// These 7 rows reproduce the "Состав бригад" reference screenshot exactly. Four of them
// (Давлатов, Холов, Юсупов, Икромов) are the foremen of brigades 3-6 — their "specialty" is
// their trade background, while `memberRole: "foreman"` marks their function in the brigade.
const FEATURED_RAW: RawEmployee[] = [
  { firstName: "Рустам", lastName: "Саидов", phone: "+992 900 11 22 33", specialty: "Бетонщик", qualificationGrade: 5, brigadeId: "brigade-1", memberRole: "worker", shift: "day", status: "on_shift", assignedDate: "2026-01-15" },
  { firstName: "Абдулло", lastName: "Мирзоев", phone: "+992 901 22 33 44", specialty: "Арматурщик", qualificationGrade: 4, brigadeId: "brigade-1", memberRole: "worker", shift: "day", status: "on_shift", assignedDate: "2026-01-15" },
  { firstName: "Комрон", lastName: "Набиев", phone: "+992 902 33 44 55", specialty: "Каменщик", qualificationGrade: 5, brigadeId: "brigade-2", memberRole: "worker", shift: "day", status: "on_site", assignedDate: "2026-02-01" },
  { firstName: "Шариф", lastName: "Давлатов", phone: "+992 903 44 55 66", specialty: "Отделочник", qualificationGrade: 4, brigadeId: "brigade-3", memberRole: "foreman", shift: "day", status: "on_shift", assignedDate: "2026-03-01" },
  { firstName: "Мухиддин", lastName: "Холов", phone: "+992 904 55 66 77", specialty: "Электромонтажник", qualificationGrade: 5, brigadeId: "brigade-4", memberRole: "foreman", shift: "evening", status: "on_shift", assignedDate: "2026-01-20" },
  { firstName: "Далер", lastName: "Юсупов", phone: "+992 905 66 77 88", specialty: "Сантехник", qualificationGrade: 4, brigadeId: "brigade-5", memberRole: "foreman", shift: "day", status: "available", assignedDate: "2026-02-10" },
  { firstName: "Нозим", lastName: "Икромов", phone: "+992 906 77 88 99", specialty: "Разнорабочий", qualificationGrade: 3, brigadeId: "brigade-6", memberRole: "foreman", shift: "day", status: "on_trip", assignedDate: "2026-04-01" },
];

type SpecialtyBucket = "monolithic" | "masonry" | "finishing" | "electrical" | "plumbing" | "other";

const SPECIALTY_POOL: Record<SpecialtyBucket, string[]> = {
  monolithic: ["Бетонщик", "Арматурщик", "Опалубщик"],
  masonry: ["Каменщик", "Кладочник"],
  finishing: ["Отделочник", "Штукатур", "Маляр", "Плиточник"],
  electrical: ["Электромонтажник"],
  plumbing: ["Сантехник"],
  other: ["Разнорабочий", "Стропальщик", "Подсобник"],
};

export const SPECIALTY_BUCKET_LABEL: Record<SpecialtyBucket, string> = {
  monolithic: "Монолитные",
  masonry: "Кладочные",
  finishing: "Отделочные",
  electrical: "Электромонтаж",
  plumbing: "Сантехработы",
  other: "Прочие",
};

// Remaining bucket targets after the 7 featured rows above (28/18/16/12/7/5 minus the featured
// contributions), so the specialization donut totals exactly 86.
const BUCKET_TARGETS: { key: SpecialtyBucket; count: number }[] = [
  { key: "monolithic", count: 26 },
  { key: "masonry", count: 17 },
  { key: "finishing", count: 15 },
  { key: "electrical", count: 11 },
  { key: "plumbing", count: 6 },
  { key: "other", count: 4 },
];

const bucketQueue: SpecialtyBucket[] = BUCKET_TARGETS.flatMap((b) => Array(b.count).fill(b.key) as SpecialtyBucket[]);
const bucketPoolCursor: Record<SpecialtyBucket, number> = { monolithic: 0, masonry: 0, finishing: 0, electrical: 0, plumbing: 0, other: 0 };

function nextSpecialty(index: number): { bucket: SpecialtyBucket; specialty: string } {
  const bucket = bucketQueue[index];
  const pool = SPECIALTY_POOL[bucket];
  const specialty = pool[bucketPoolCursor[bucket] % pool.length];
  bucketPoolCursor[bucket] += 1;
  return { bucket, specialty };
}

const FIRST_NAMES = [
  "Азиз", "Баходур", "Вафо", "Гайрат", "Джамшед", "Еркин", "Жасур", "Зохир", "Икром", "Камол",
  "Лутфулло", "Мансур", "Наим", "Олим", "Парвиз", "Равшан", "Сино", "Толиб", "Умед", "Фарход",
  "Хуршед", "Шодмон", "Эмом", "Юнус", "Якуб", "Бехруз", "Диловар", "Исфандиёр", "Каримджон", "Нусрат",
];
const LAST_NAMES = [
  "Раджабов", "Назаров", "Собиров", "Турсунов", "Хакимов", "Одинаев", "Файзуллоев", "Шарипов", "Латифов", "Бердиев",
  "Ортиков", "Панжиев", "Расулов", "Сафаров", "Тагоев", "Умаров", "Файзиев", "Холиков", "Ганиев", "Джураев",
  "Зиёев", "Исмоилов", "Каюмов", "Нурматов", "Пулатов", "Таджибаев", "Усмонов", "Хамидов", "Валиев", "Эргашев",
];

function nextName(index: number): { firstName: string; lastName: string } {
  // firstName cycles every 30; lastName only advances once firstName has cycled through all 30,
  // so the (firstName, lastName) pair stays unique for up to 30*30 = 900 people.
  return {
    firstName: FIRST_NAMES[index % FIRST_NAMES.length],
    lastName: LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length],
  };
}

function nextPhone(index: number): string {
  const block = String(100000 + index * 91).slice(-6);
  return `+992 90${index % 10} ${block.slice(0, 2)} ${block.slice(2, 4)} ${block.slice(4, 6)}`;
}

const SHIFT_CYCLE: WorkShift[] = ["day", "day", "day", "evening", "day", "day", "night", "day"];
const NON_ACTIVE_STATUSES: EmployeeStatus[] = ["available", "on_trip", "absent", "on_leave", "sick_leave"];
// 10 of the 79 generated brigaded slots are non-active, matching the "74 active / 86 total" KPI.
const NON_ACTIVE_INDICES = new Set([4, 12, 20, 28, 36, 44, 52, 60, 68, 76]);

interface BrigadeStaffPlan {
  brigadeId: string;
  needsForeman: boolean;
  extraWorkers: number;
  helpers: number;
}

const STAFF_PLAN: BrigadeStaffPlan[] = [
  { brigadeId: "brigade-1", needsForeman: true, extraWorkers: 7, helpers: 2 },
  { brigadeId: "brigade-2", needsForeman: true, extraWorkers: 6, helpers: 0 },
  { brigadeId: "brigade-3", needsForeman: false, extraWorkers: 6, helpers: 2 },
  { brigadeId: "brigade-4", needsForeman: false, extraWorkers: 5, helpers: 0 },
  { brigadeId: "brigade-5", needsForeman: false, extraWorkers: 5, helpers: 1 },
  { brigadeId: "brigade-6", needsForeman: false, extraWorkers: 7, helpers: 2 },
  { brigadeId: "brigade-7", needsForeman: true, extraWorkers: 4, helpers: 1 },
  { brigadeId: "brigade-8", needsForeman: true, extraWorkers: 3, helpers: 1 },
  { brigadeId: "brigade-9", needsForeman: true, extraWorkers: 4, helpers: 1 },
  { brigadeId: "brigade-10", needsForeman: true, extraWorkers: 6, helpers: 0 },
  { brigadeId: "brigade-11", needsForeman: true, extraWorkers: 3, helpers: 1 },
  { brigadeId: "brigade-12", needsForeman: true, extraWorkers: 3, helpers: 1 },
];

const GENERATED_RAW: RawEmployee[] = [];
let cursor = 0;

for (const plan of STAFF_PLAN) {
  const brigade = findBrigade(plan.brigadeId);

  if (plan.needsForeman) {
    const { bucket } = nextSpecialty(cursor);
    GENERATED_RAW.push({
      firstName: brigade.foremanName.split(" ")[0],
      lastName: brigade.foremanName.split(" ")[1],
      phone: nextPhone(cursor),
      specialty: SPECIALTY_POOL[bucket][0],
      qualificationGrade: 5,
      brigadeId: brigade.id,
      memberRole: "foreman",
      shift: "day",
      status: "on_shift",
      assignedDate: brigade.createdDate,
    });
    cursor += 1;
  }

  for (let i = 0; i < plan.extraWorkers; i += 1) {
    const { specialty } = nextSpecialty(cursor);
    const { firstName, lastName } = nextName(cursor);
    const isActive = !NON_ACTIVE_INDICES.has(cursor);
    GENERATED_RAW.push({
      firstName,
      lastName,
      phone: nextPhone(cursor),
      specialty,
      qualificationGrade: 3 + (cursor % 3),
      brigadeId: brigade.id,
      memberRole: "worker",
      shift: SHIFT_CYCLE[cursor % SHIFT_CYCLE.length],
      status: isActive ? (cursor % 5 === 0 ? "on_site" : "on_shift") : NON_ACTIVE_STATUSES[cursor % NON_ACTIVE_STATUSES.length],
      assignedDate: brigade.createdDate,
    });
    cursor += 1;
  }

  for (let i = 0; i < plan.helpers; i += 1) {
    const { firstName, lastName } = nextName(cursor);
    const isActive = !NON_ACTIVE_INDICES.has(cursor);
    GENERATED_RAW.push({
      firstName,
      lastName,
      phone: nextPhone(cursor),
      specialty: "Разнорабочий",
      qualificationGrade: 2 + (cursor % 2),
      brigadeId: brigade.id,
      memberRole: "helper",
      shift: SHIFT_CYCLE[cursor % SHIFT_CYCLE.length],
      status: isActive ? "on_shift" : NON_ACTIVE_STATUSES[cursor % NON_ACTIVE_STATUSES.length],
      assignedDate: brigade.createdDate,
    });
    cursor += 1;
  }
}

// 8 unassigned specialists, ready to be assigned to a brigade.
const FREE_POOL_RAW: RawEmployee[] = Array.from({ length: 8 }, (_, i) => {
  const { firstName, lastName } = nextName(cursor + i);
  const { specialty } = nextSpecialty((cursor + i) % bucketQueue.length);
  return {
    firstName,
    lastName,
    phone: nextPhone(cursor + i + 200),
    specialty,
    qualificationGrade: 3 + (i % 3),
    brigadeId: null,
    memberRole: "worker",
    shift: "day",
    status: "available",
    assignedDate: "2026-06-15",
  };
});

const ALL_RAW: RawEmployee[] = [...FEATURED_RAW, ...GENERATED_RAW, ...FREE_POOL_RAW];

export const mockEmployees: Employee[] = ALL_RAW.map((raw, index) => {
  const brigade = raw.brigadeId ? findBrigade(raw.brigadeId) : null;
  return {
    id: `employee-${index + 1}`,
    firstName: raw.firstName,
    lastName: raw.lastName,
    fullName: `${raw.firstName} ${raw.lastName}`,
    phone: raw.phone,
    specialty: raw.specialty,
    qualificationGrade: raw.qualificationGrade,
    brigadeId: brigade?.id ?? null,
    brigadeName: brigade?.name ?? null,
    memberRole: raw.memberRole,
    objectId: brigade?.objectId ?? null,
    objectName: brigade?.objectName ?? null,
    shift: raw.shift,
    status: raw.status,
    assignedDate: raw.assignedDate,
  };
});
