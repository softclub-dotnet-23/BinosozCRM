import { mockObjects } from "./mockObjects";
import { mockBrigades } from "./mockAssignments";
import type { Work, WorkSection, WorkSectionKey, WorkStatus } from "../types";

export const WORK_SECTIONS: WorkSection[] = [
  { id: "prep", name: "Подготовительные работы" },
  { id: "foundation", name: "Фундаменты" },
  { id: "structure", name: "Монтажные работы" },
  { id: "finishing", name: "Отделочные работы" },
  { id: "engineering", name: "Инженерные сети" },
  { id: "other", name: "Прочие работы" },
];

function findObject(id: string) {
  const object = mockObjects.find((o) => o.id === id);
  if (!object) throw new Error(`Unknown mock object id: ${id}`);
  return object;
}

function findBrigade(id: string) {
  const brigade = mockBrigades.find((b) => b.id === id);
  if (!brigade) throw new Error(`Unknown mock brigade id: ${id}`);
  return brigade;
}

function findSection(id: WorkSectionKey) {
  const section = WORK_SECTIONS.find((s) => s.id === id);
  if (!section) throw new Error(`Unknown work section id: ${id}`);
  return section;
}

// Date-only arithmetic via Date.UTC, never parsing/formatting through local time — a local-time
// round-trip here would silently shift results by a day depending on the runtime's UTC offset.
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

const DEFAULT_FILTER_WINDOW_START = "2026-07-01";
const DEFAULT_FILTER_WINDOW_END = "2026-07-30";

/** Shifts a [start, end] pair so it overlaps the default "Период" filter window
 * (01.07–30.07.2026), so the page shows the full 56-work dataset by default. */
function ensureOverlapsDefaultWindow(start: string, end: string): [string, string] {
  if (end < DEFAULT_FILTER_WINDOW_START) {
    const shift = daysBetween(end, DEFAULT_FILTER_WINDOW_START);
    return [addDays(start, shift), addDays(end, shift)];
  }
  if (start > DEFAULT_FILTER_WINDOW_END) {
    const shift = daysBetween(DEFAULT_FILTER_WINDOW_END, start);
    return [addDays(start, -shift), addDays(end, -shift)];
  }
  return [start, end];
}

interface RawWork {
  code: string;
  title: string;
  sectionId: WorkSectionKey;
  objectId: string;
  brigadeId: string;
  status: WorkStatus;
  progress: number;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  priority?: Work["priority"];
  budget?: number;
}

// The first 7 rows reproduce the reference screenshot's visible table exactly.
const FEATURED_RAW: RawWork[] = [
  {
    code: "1.1",
    title: "Устройство фундамента",
    sectionId: "prep",
    objectId: "obj-1",
    brigadeId: "brigade-1",
    status: "completed",
    progress: 100,
    plannedStart: "2026-07-10",
    plannedEnd: "2026-07-18",
    actualStart: "2026-07-10",
    actualEnd: "2026-07-18",
    priority: "high",
  },
  {
    code: "1.2",
    title: "Очистка территории",
    sectionId: "prep",
    objectId: "obj-1",
    brigadeId: "brigade-2",
    status: "in_progress",
    progress: 60,
    plannedStart: "2026-07-12",
    plannedEnd: "2026-07-20",
    actualStart: "2026-07-12",
    actualEnd: null,
    priority: "medium",
  },
  {
    code: "2.1",
    title: "Бетонная подготовка",
    sectionId: "foundation",
    objectId: "obj-1",
    brigadeId: "brigade-3",
    status: "in_progress",
    progress: 30,
    plannedStart: "2026-07-16",
    plannedEnd: "2026-07-23",
    actualStart: "2026-07-16",
    actualEnd: null,
    priority: "high",
  },
  {
    code: "3.4",
    title: "Арматура A500",
    sectionId: "foundation",
    objectId: "obj-1",
    brigadeId: "brigade-1",
    status: "overdue",
    progress: 0,
    plannedStart: "2026-07-05",
    plannedEnd: "2026-07-12",
    actualStart: null,
    actualEnd: null,
    priority: "critical",
  },
  {
    code: "4.1",
    title: "Кладка стен 1-го этажа",
    sectionId: "structure",
    objectId: "obj-2",
    brigadeId: "brigade-2",
    status: "in_progress",
    progress: 45,
    plannedStart: "2026-07-18",
    plannedEnd: "2026-07-30",
    actualStart: "2026-07-18",
    actualEnd: null,
    priority: "medium",
  },
  {
    code: "5.2",
    title: "Монтаж оконных блоков",
    sectionId: "finishing",
    objectId: "obj-3",
    brigadeId: "brigade-4",
    status: "in_progress",
    progress: 0,
    plannedStart: "2026-07-25",
    plannedEnd: "2026-08-02",
    actualStart: null,
    actualEnd: null,
    priority: "low",
  },
  {
    code: "6.1",
    title: "Покраска стен",
    sectionId: "finishing",
    objectId: "obj-4",
    brigadeId: "brigade-3",
    status: "in_progress",
    progress: 0,
    plannedStart: "2026-07-28",
    plannedEnd: "2026-08-05",
    actualStart: null,
    actualEnd: null,
    priority: "low",
  },
];

const WORK_NAME_LIBRARY: Record<WorkSectionKey, string[]> = {
  prep: ["Ограждение стройплощадки", "Временные бытовки", "Разбивка осей", "Планировка территории", "Водоотведение площадки", "Подготовка подъездных путей"],
  foundation: ["Разработка котлована", "Устройство песчаной подушки", "Опалубка фундамента", "Гидроизоляция фундамента", "Обратная засыпка пазух", "Устройство ростверка", "Армирование плиты", "Заливка бетона М300"],
  structure: [
    "Монтаж колонн",
    "Монтаж плит перекрытия",
    "Кладка стен 2-го этажа",
    "Кладка стен 3-го этажа",
    "Монтаж лестничных маршей",
    "Устройство перегородок",
    "Монтаж кровельных ферм",
    "Устройство парапета",
    "Монтаж балконных плит",
    "Кладка стен 4-го этажа",
    "Монтаж вентиляционных шахт",
    "Устройство деформационных швов",
    "Кладка стен 5-го этажа",
  ],
  finishing: [
    "Штукатурка фасада",
    "Утепление фасада",
    "Устройство стяжки пола",
    "Облицовка плиткой санузлов",
    "Малярные работы",
    "Устройство подвесных потолков",
    "Монтаж дверных блоков",
    "Укладка ламината",
    "Фасадное остекление",
    "Устройство отмостки",
    "Шпаклёвка стен",
    "Монтаж плинтусов",
    "Финишная покраска фасада",
    "Уборка после отделки",
  ],
  engineering: ["Прокладка электропроводки", "Монтаж электрощитовой", "Разводка водоснабжения", "Монтаж канализации", "Установка отопительных приборов", "Пусконаладка инженерных систем"],
  other: ["Благоустройство территории", "Озеленение и посадки", "Установка ограждений", "Вывоз строительного мусора"],
};

interface SectionPlan {
  sectionId: WorkSectionKey;
  codePrefix: number;
  codeStart: number;
  completed: number;
  inProgress: number;
  overdue: number;
}

// Counts here plus the featured rows above add up exactly to the section totals
// shown in "Работы по разделам" (6 / 10 / 14 / 16 / 6 / 4 = 56), and the
// completed/inProgress/overdue counts plus the featured rows add up exactly to
// the KPI totals (28 / 22 / 6).
const SECTION_PLANS: SectionPlan[] = [
  { sectionId: "prep", codePrefix: 1, codeStart: 3, completed: 4, inProgress: 0, overdue: 0 },
  { sectionId: "foundation", codePrefix: 2, codeStart: 2, completed: 7, inProgress: 1, overdue: 0 },
  { sectionId: "structure", codePrefix: 4, codeStart: 2, completed: 8, inProgress: 4, overdue: 1 },
  { sectionId: "finishing", codePrefix: 5, codeStart: 3, completed: 6, inProgress: 7, overdue: 1 },
  { sectionId: "engineering", codePrefix: 7, codeStart: 1, completed: 2, inProgress: 3, overdue: 1 },
  { sectionId: "other", codePrefix: 8, codeStart: 1, completed: 0, inProgress: 2, overdue: 2 },
];

const OBJECT_CYCLE = ["obj-1", "obj-2", "obj-3", "obj-4", "obj-5", "obj-6"];
const BRIGADE_CYCLE = mockBrigades.map((b) => b.id);
const PRIORITY_CYCLE: Work["priority"][] = ["low", "medium", "high", "critical"];

function generateSectionWorks(plan: SectionPlan, startIndex: number): RawWork[] {
  const names = WORK_NAME_LIBRARY[plan.sectionId];
  const rows: RawWork[] = [];
  let suffix = plan.codeStart;
  let cursor = 0;

  function nextName(): string {
    const name = names[cursor % names.length];
    cursor += 1;
    return name;
  }

  function pushRow(status: WorkStatus, seed: number) {
    const objectId = OBJECT_CYCLE[seed % OBJECT_CYCLE.length];
    const brigadeId = BRIGADE_CYCLE[seed % BRIGADE_CYCLE.length];
    const priority = PRIORITY_CYCLE[seed % PRIORITY_CYCLE.length];
    const baseStart = addDays("2026-06-20", (seed * 3) % 60);
    const duration = 5 + (seed % 10);

    if (status === "completed") {
      const [start, end] = ensureOverlapsDefaultWindow(baseStart, addDays(baseStart, duration));
      rows.push({
        code: `${plan.codePrefix}.${suffix}`,
        title: nextName(),
        sectionId: plan.sectionId,
        objectId,
        brigadeId,
        status,
        progress: 100,
        plannedStart: start,
        plannedEnd: end,
        actualStart: start,
        actualEnd: end,
        priority,
      });
    } else if (status === "overdue") {
      const overdueBaseStart = addDays("2026-06-20", (seed * 5) % 20);
      const [start, end] = ensureOverlapsDefaultWindow(overdueBaseStart, addDays(overdueBaseStart, duration));
      const progress = 15 + ((seed * 11) % 55);
      rows.push({
        code: `${plan.codePrefix}.${suffix}`,
        title: nextName(),
        sectionId: plan.sectionId,
        objectId,
        brigadeId,
        status,
        progress,
        plannedStart: start,
        plannedEnd: end,
        actualStart: start,
        actualEnd: null,
        priority,
      });
    } else {
      const start = addDays("2026-07-05", (seed * 4) % 25);
      const end = addDays(start, duration);
      const progress = (seed * 13) % 80;
      rows.push({
        code: `${plan.codePrefix}.${suffix}`,
        title: nextName(),
        sectionId: plan.sectionId,
        objectId,
        brigadeId,
        status,
        progress,
        plannedStart: start,
        plannedEnd: end,
        actualStart: progress > 0 ? start : null,
        actualEnd: null,
        priority,
      });
    }
    suffix += 1;
  }

  for (let i = 0; i < plan.completed; i += 1) pushRow("completed", startIndex + i);
  for (let i = 0; i < plan.inProgress; i += 1) pushRow("in_progress", startIndex + plan.completed + i);
  for (let i = 0; i < plan.overdue; i += 1) pushRow("overdue", startIndex + plan.completed + plan.inProgress + i);

  return rows;
}

const GENERATED_RAW: RawWork[] = SECTION_PLANS.flatMap((plan, index) => generateSectionWorks(plan, index * 7 + 1));

const ALL_RAW: RawWork[] = [...FEATURED_RAW, ...GENERATED_RAW];

export const mockWorks: Work[] = ALL_RAW.map((raw, index) => {
  const object = findObject(raw.objectId);
  const brigade = findBrigade(raw.brigadeId);
  const section = findSection(raw.sectionId);
  const durationDays =
    (new Date(`${raw.plannedEnd}T00:00:00`).getTime() - new Date(`${raw.plannedStart}T00:00:00`).getTime()) / 86_400_000;

  return {
    id: `work-${index + 1}`,
    code: raw.code,
    title: raw.title,
    description: `${raw.title} — раздел «${section.name}» на объекте «${object.name}».`,
    objectId: object.id,
    objectName: object.name,
    objectType: object.objectType,
    imageUrl: object.imageUrl,
    sectionId: section.id,
    sectionName: section.name,
    responsible: { name: brigade.foremanName, role: "Прораб" },
    brigadeId: brigade.id,
    brigadeName: brigade.name,
    plannedStart: raw.plannedStart,
    plannedEnd: raw.plannedEnd,
    actualStart: raw.actualStart,
    actualEnd: raw.actualEnd,
    plannedDurationDays: Math.max(1, Math.round(durationDays)),
    progress: raw.progress,
    status: raw.status,
    priority: raw.priority ?? "medium",
    budget: raw.budget ?? 20000 + ((index * 3700) % 180000),
    parentWorkId: null,
    dependencyIds: [],
    attachments: [],
    comments: [],
    progressHistory: [
      {
        id: `${`work-${index + 1}`}-hist-1`,
        date: raw.actualStart ?? raw.plannedStart,
        progress: raw.progress,
        note: "Начальные данные по работе",
        author: brigade.foremanName,
      },
    ],
  };
});
