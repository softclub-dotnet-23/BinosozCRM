import type { StaffCategory, StaffMember, StaffStatus } from "../types";

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

function makePhone(index: number): string {
  const operators = ["90", "91", "92", "93", "98"];
  const op = operators[index % operators.length];
  const digits = String(1000000 + ((index * 8191) % 8999999)).slice(-7);
  return `+992 ${op} ${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)}`;
}

function makeBirthDate(index: number): string {
  const age = 22 + (index % 33);
  const year = 2026 - age;
  const month = String(((index * 3) % 12) + 1).padStart(2, "0");
  const day = String(((index * 5) % 27) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeHireDate(index: number): string {
  const monthOffset = index % 41;
  const year = 2023 + Math.floor(monthOffset / 12);
  const month = String((monthOffset % 12) + 1).padStart(2, "0");
  const day = String(((index * 7) % 27) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeStatus(index: number): StaffStatus {
  if (index % 17 === 9) return "dismissed";
  if (index % 11 === 5) return "vacation";
  return "active";
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

const FIRST_NAMES = [
  "Азиз", "Фаррух", "Бехруз", "Джамшед", "Тимур", "Наим", "Хуршед", "Сино", "Умед", "Далер",
  "Шерали", "Отабек", "Санжар", "Диловар", "Парвиз", "Восид", "Акбар", "Хумоюн", "Зохир", "Исмоил",
  "Рахим", "Саид", "Абдували", "Нуриддин", "Файзулло", "Гайрат", "Максуд", "Собир", "Толиб", "Ражаб",
  "Икром", "Хикмат", "Латиф", "Мансур", "Одил", "Джалол", "Бободжон", "Курбон", "Сафар", "Эмом",
];

const LAST_NAMES = [
  "Раджабов", "Каримов", "Назаров", "Юлдашев", "Тошев", "Сафаров", "Одинаев", "Хамидов", "Курбонов", "Собиров",
  "Файзуллоев", "Мирзораимов", "Абдуллаев", "Исмоилов", "Шарипов", "Гуломов", "Джураев", "Ахмедов", "Рахматов", "Латипов",
  "Хасанов", "Умаров", "Бердиев", "Ниязов", "Валиев", "Юсуфов", "Норов", "Пулатов", "Салимов", "Эргашев",
];

function makeName(index: number): { firstName: string; lastName: string; fullName: string } {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(index * 7 + 3) % LAST_NAMES.length];
  return { firstName, lastName, fullName: `${lastName} ${firstName}` };
}

interface BrigadeInfo {
  name: string;
  specialization: string;
}

const BRIGADES: BrigadeInfo[] = [
  { name: "Бригада №1", specialization: "Монолитные работы" },
  { name: "Бригада №2", specialization: "Кладочные работы" },
  { name: "Бригада №3", specialization: "Отделочные работы" },
  { name: "Бригада №4", specialization: "Инженерные сети" },
  { name: "Бригада №5", specialization: "Благоустройство" },
  { name: "Бригада №6", specialization: "Кровельные работы" },
  { name: "Бригада №7", specialization: "Земляные работы" },
  { name: "Бригада №8", specialization: "Фасадные работы" },
];

const ITR_DEPARTMENTS = ["Отдел ПТО", "Отдел смет", "Отдел технадзора"];
const ADMIN_DEPARTMENTS = ["Бухгалтерия", "Отдел кадров", "Юридический отдел", "Секретариат", "Отдел снабжения", "Дирекция"];

const WORKER_POSITIONS = [
  "Арматурщик", "Бетонщик", "Плотник", "Сварщик", "Электромонтажник", "Каменщик", "Штукатур",
  "Маляр", "Плиточник", "Сантехник", "Стропальщик", "Разнорабочий", "Кровельщик", "Монтажник", "Изолировщик",
];

const ENGINEER_SITE_POSITIONS = ["Прораб", "Мастер участка"];
const ENGINEER_DEPT_POSITIONS = [
  "Инженер ПТО", "Инженер-сметчик", "Инженер по ОТ", "Геодезист", "Технолог строительства", "Инженер-конструктор",
];
const ADMIN_POSITIONS = [
  "Бухгалтер", "Специалист отдела кадров", "Юрист", "Секретарь", "Офис-менеджер", "Экономист",
  "Специалист по снабжению", "Заместитель директора",
];

const EMPLOYMENT_TYPE = "Полная занятость";

function buildStaffMember(params: {
  index: number;
  id: string;
  fullName: string;
  position: string;
  category: StaffCategory;
  brigadeName: string | null;
  brigadeSpecialization: string | null;
  department: string | null;
  phone?: string;
  status?: StaffStatus;
  hireDate?: string;
  email?: string;
  birthDate?: string;
  address?: string;
  salary?: number;
}): StaffMember {
  const { index, id, fullName, position, category, brigadeName, brigadeSpecialization, department } = params;
  const [lastName, firstName] = fullName.split(" ");
  const salaryDefault =
    category === "worker" ? 2800 + (index % 15) * 100 : category === "engineer" ? 4800 + (index % 12) * 300 : 3800 + (index % 10) * 270;

  return {
    id,
    fullName,
    position,
    category,
    brigadeName,
    brigadeSpecialization,
    department,
    phone: params.phone ?? makePhone(index),
    status: params.status ?? makeStatus(index),
    hireDate: params.hireDate ?? makeHireDate(index),
    email: params.email ?? makeEmail(firstName ?? fullName, lastName ?? fullName),
    birthDate: params.birthDate ?? makeBirthDate(index),
    address: params.address ?? makeAddress(index),
    employmentType: EMPLOYMENT_TYPE,
    salary: params.salary ?? salaryDefault,
    passportNumber: makePassport(index),
    inn: makeInn(index),
    hasContract: true,
  };
}

const FEATURED: StaffMember[] = [
  buildStaffMember({
    index: 1,
    id: "EMP-0001",
    fullName: "Мирзоев Шахром",
    position: "Бригадир",
    category: "engineer",
    brigadeName: "Бригада №1",
    brigadeSpecialization: "Монолитные работы",
    department: null,
    phone: "+992 93 234 56 78",
    status: "active",
    hireDate: "2024-03-15",
    email: "sh.mirzoev@example.com",
    birthDate: "1990-03-12",
    address: "г. Душанбе, ул. Рудаки 123",
    salary: 8500,
  }),
  buildStaffMember({
    index: 2,
    id: "EMP-0002",
    fullName: "Абдуллоев Бахтиёр",
    position: "Арматурщик",
    category: "worker",
    brigadeName: "Бригада №1",
    brigadeSpecialization: "Монолитные работы",
    department: null,
    phone: "+992 90 123 45 67",
    status: "active",
    hireDate: "2024-04-10",
  }),
  buildStaffMember({
    index: 3,
    id: "EMP-0003",
    fullName: "Юсупов Далер",
    position: "Плотник",
    category: "worker",
    brigadeName: "Бригада №2",
    brigadeSpecialization: "Кладочные работы",
    department: null,
    phone: "+992 91 345 67 89",
    status: "active",
    hireDate: "2024-04-22",
  }),
  buildStaffMember({
    index: 4,
    id: "EMP-0004",
    fullName: "Комрон Саидов",
    position: "Бетонщик",
    category: "worker",
    brigadeName: "Бригада №2",
    brigadeSpecialization: "Кладочные работы",
    department: null,
    phone: "+992 93 210 98 76",
    status: "active",
    hireDate: "2024-05-05",
  }),
  buildStaffMember({
    index: 5,
    id: "EMP-0005",
    fullName: "Шариф Давлатов",
    position: "Сварщик",
    category: "worker",
    brigadeName: "Бригада №3",
    brigadeSpecialization: "Отделочные работы",
    department: null,
    phone: "+992 93 567 89 01",
    status: "active",
    hireDate: "2024-05-18",
  }),
  buildStaffMember({
    index: 6,
    id: "EMP-0006",
    fullName: "Мухиддин Холов",
    position: "Электромонтажник",
    category: "worker",
    brigadeName: "Бригада №4",
    brigadeSpecialization: "Инженерные сети",
    department: null,
    phone: "+992 98 765 43 21",
    status: "active",
    hireDate: "2024-06-01",
  }),
  buildStaffMember({
    index: 7,
    id: "EMP-0007",
    fullName: "Нозим Икромов",
    position: "Инженер ПТО",
    category: "engineer",
    brigadeName: null,
    brigadeSpecialization: null,
    department: "Отдел ПТО",
    phone: "+992 90 112 23 45",
    status: "active",
    hireDate: "2024-02-12",
  }),
  buildStaffMember({
    index: 8,
    id: "EMP-0008",
    fullName: "Рустамов Комрон",
    position: "Мастер",
    category: "engineer",
    brigadeName: "Бригада №3",
    brigadeSpecialization: "Отделочные работы",
    department: null,
    phone: "+992 93 678 90 12",
    status: "vacation",
    hireDate: "2026-07-01",
  }),
  buildStaffMember({
    index: 9,
    id: "EMP-0009",
    fullName: "Темуров Фируз",
    position: "Подсобный рабочий",
    category: "worker",
    brigadeName: "Бригада №5",
    brigadeSpecialization: "Благоустройство",
    department: null,
    phone: "+992 93 321 55 66",
    status: "dismissed",
    hireDate: "2026-06-20",
  }),
  buildStaffMember({
    index: 10,
    id: "EMP-0010",
    fullName: "Каримов Сухроб",
    position: "Инженер-сметчик",
    category: "engineer",
    brigadeName: null,
    brigadeSpecialization: null,
    department: "Отдел смет",
    phone: "+992 90 654 32 10",
    status: "active",
    hireDate: "2024-03-03",
  }),
];

const PAD_WORKERS = 56;
const PAD_ENGINEERS = 12;
const PAD_ADMINS = 8;

function generatePadded(): StaffMember[] {
  const rows: StaffMember[] = [];
  let idNum = 11;
  let genIndex = 100;

  for (let i = 0; i < PAD_WORKERS; i++) {
    const { fullName } = makeName(genIndex);
    const brigade = BRIGADES[i % BRIGADES.length];
    const position = WORKER_POSITIONS[i % WORKER_POSITIONS.length];
    rows.push(
      buildStaffMember({
        index: genIndex,
        id: `EMP-${String(idNum).padStart(4, "0")}`,
        fullName,
        position,
        category: "worker",
        brigadeName: brigade.name,
        brigadeSpecialization: brigade.specialization,
        department: null,
      }),
    );
    idNum++;
    genIndex++;
  }

  for (let i = 0; i < PAD_ENGINEERS; i++) {
    const { fullName } = makeName(genIndex);
    const onSite = i % 2 === 0;
    if (onSite) {
      const brigade = BRIGADES[i % BRIGADES.length];
      rows.push(
        buildStaffMember({
          index: genIndex,
          id: `EMP-${String(idNum).padStart(4, "0")}`,
          fullName,
          position: ENGINEER_SITE_POSITIONS[i % ENGINEER_SITE_POSITIONS.length],
          category: "engineer",
          brigadeName: brigade.name,
          brigadeSpecialization: brigade.specialization,
          department: null,
        }),
      );
    } else {
      rows.push(
        buildStaffMember({
          index: genIndex,
          id: `EMP-${String(idNum).padStart(4, "0")}`,
          fullName,
          position: ENGINEER_DEPT_POSITIONS[i % ENGINEER_DEPT_POSITIONS.length],
          category: "engineer",
          brigadeName: null,
          brigadeSpecialization: null,
          department: ITR_DEPARTMENTS[i % ITR_DEPARTMENTS.length],
        }),
      );
    }
    idNum++;
    genIndex++;
  }

  for (let i = 0; i < PAD_ADMINS; i++) {
    const { fullName } = makeName(genIndex);
    rows.push(
      buildStaffMember({
        index: genIndex,
        id: `EMP-${String(idNum).padStart(4, "0")}`,
        fullName,
        position: ADMIN_POSITIONS[i % ADMIN_POSITIONS.length],
        category: "admin",
        brigadeName: null,
        brigadeSpecialization: null,
        department: ADMIN_DEPARTMENTS[i % ADMIN_DEPARTMENTS.length],
      }),
    );
    idNum++;
    genIndex++;
  }

  return rows;
}

export const mockStaff: StaffMember[] = [...FEATURED, ...generatePadded()];

export const STAFF_POSITIONS: string[] = Array.from(new Set(mockStaff.map((s) => s.position))).sort((a, b) =>
  a.localeCompare(b, "ru"),
);

export const STAFF_BRIGADES: string[] = Array.from(
  new Set(mockStaff.map((s) => s.brigadeName).filter((v): v is string => Boolean(v))),
).sort((a, b) => a.localeCompare(b, "ru"));

export const BRIGADE_OPTIONS: BrigadeInfo[] = BRIGADES;
export const DEPARTMENT_OPTIONS: string[] = [...ITR_DEPARTMENTS, ...ADMIN_DEPARTMENTS];
export type { BrigadeInfo };
