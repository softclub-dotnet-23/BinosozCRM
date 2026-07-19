import type { MaterialWriteOff, MaterialWriteOffLine, WriteOffReason } from "../types";
import { MATERIAL_WAREHOUSES } from "./mockMaterials";

const OBJECT_NAMES = {
  somoni: "Жилой комплекс «Сомони»",
  vatan: "Бизнес-центр «Ватан»",
  navruz: "Коттедж «Навруз»",
  logistika: "Складской комплекс «Логистика»",
};

const OBJECT_BRIGADE: Record<string, string> = {
  [OBJECT_NAMES.somoni]: "Бригада №3",
  [OBJECT_NAMES.vatan]: "Бригада №2",
  [OBJECT_NAMES.navruz]: "Бригада №1",
  [OBJECT_NAMES.logistika]: "Бригада №4",
};

const RESPONSIBLE_CYCLE = ["Азизов Шахром", "Исломов Далер", "Мирзоев Шахром", "Саидов Азим", "Комрон Саидов"];

function evenLines(materialNames: string[], unit: string, totalQuantity: number, totalCost: number): MaterialWriteOffLine[] {
  const n = materialNames.length;
  const price = Math.round((totalCost / totalQuantity) * 100) / 100;
  const rawQty = Math.round((totalQuantity / n) * 10) / 10;
  let costRunning = 0;
  const lines: MaterialWriteOffLine[] = materialNames.map((materialName, i) => {
    const isLast = i === n - 1;
    const quantity = isLast ? Math.round((totalQuantity - rawQty * (n - 1)) * 10) / 10 : rawQty;
    const lineTotal = isLast ? Math.round((totalCost - costRunning) * 100) / 100 : Math.round(quantity * price * 100) / 100;
    costRunning += lineTotal;
    return { materialName, quantity, unit, price, lineTotal };
  });
  return lines;
}

interface FeaturedInput {
  documentNumber: string;
  date: string;
  objectName: string;
  reason: WriteOffReason;
  responsible: string;
  materialNames: string[];
  unit: string;
  totalQuantity: number;
  totalCost: number;
  requiresReview: boolean;
}

const FEATURED_INPUT: FeaturedInput[] = [
  {
    documentNumber: "СП-20",
    date: "2026-07-29",
    objectName: OBJECT_NAMES.somoni,
    reason: "construction_works",
    responsible: "Азизов Шахром",
    materialNames: ["Цемент М400", "Цемент М500", "Песок речной", "Щебень 20-40 мм", "Арматура Ø10 мм"],
    unit: "ед.",
    totalQuantity: 38.5,
    totalCost: 12350,
    requiresReview: false,
  },
  {
    documentNumber: "СП-19",
    date: "2026-07-28",
    objectName: OBJECT_NAMES.vatan,
    reason: "damage",
    responsible: "Исломов Далер",
    materialNames: ["Кирпич облицовочный", "Труба ПВХ Ø110", "Провод ВВГ 3×2.5", "Краска фасадная"],
    unit: "ед.",
    totalQuantity: 25.2,
    totalCost: 8640,
    requiresReview: true,
  },
  {
    documentNumber: "СП-18",
    date: "2026-07-26",
    objectName: OBJECT_NAMES.navruz,
    reason: "finishing_works",
    responsible: "Мирзоев Шахром",
    materialNames: [
      "Краска интерьерная",
      "Грунтовка глубокого проникновения",
      "Утеплитель базальтовый",
      "Доска обрезная",
      "Кабель ПВС 2×1.5",
      "Труба канализационная",
    ],
    unit: "ед.",
    totalQuantity: 42.0,
    totalCost: 13200,
    requiresReview: false,
  },
  {
    documentNumber: "СП-17",
    date: "2026-07-24",
    objectName: OBJECT_NAMES.logistika,
    reason: "defect",
    responsible: "Саидов Азим",
    materialNames: ["Кирпич силикатный", "Швеллер стальной", "Пенопласт ПСБ-25"],
    unit: "ед.",
    totalQuantity: 18.0,
    totalCost: 5500,
    requiresReview: true,
  },
  {
    documentNumber: "СП-16",
    date: "2026-07-22",
    objectName: OBJECT_NAMES.somoni,
    reason: "construction_works",
    responsible: "Азизов Шахром",
    materialNames: ["Цемент ПЦ400-Д20", "Щебень 5-20 мм", "Проволока вязальная", "Отсев щебёночный"],
    unit: "ед.",
    totalQuantity: 22.6,
    totalCost: 7860,
    requiresReview: false,
  },
  {
    documentNumber: "СП-15",
    date: "2026-07-21",
    objectName: OBJECT_NAMES.vatan,
    reason: "damage",
    responsible: "Исломов Далер",
    materialNames: ["Труба ПВХ Ø50", "Уголок стальной"],
    unit: "ед.",
    totalQuantity: 15.0,
    totalCost: 4120,
    requiresReview: false,
  },
  {
    documentNumber: "СП-14",
    date: "2026-07-18",
    objectName: OBJECT_NAMES.navruz,
    reason: "other_works",
    responsible: "Мирзоев Шахром",
    materialNames: ["Брус строительный", "Фанера ламинированная", "Кирпич пустотелый", "Кирпич полнотелый", "Песок карьерный"],
    unit: "ед.",
    totalQuantity: 33.7,
    totalCost: 10450,
    requiresReview: false,
  },
  {
    documentNumber: "СП-13",
    date: "2026-07-16",
    objectName: OBJECT_NAMES.logistika,
    reason: "defect",
    responsible: "Саидов Азим",
    materialNames: ["Арматура Ø8 мм", "Арматура Ø16 мм", "Кирпич красный"],
    unit: "ед.",
    totalQuantity: 12.5,
    totalCost: 3700,
    requiresReview: true,
  },
  {
    documentNumber: "СП-12",
    date: "2026-07-14",
    objectName: OBJECT_NAMES.somoni,
    reason: "construction_works",
    responsible: "Азизов Шахром",
    materialNames: ["Цемент М400", "Песок мытый", "Щебень 20-40 мм", "Арматура Ø12 мм", "Арматура Ø14 мм"],
    unit: "ед.",
    totalQuantity: 29.4,
    totalCost: 9870,
    requiresReview: false,
  },
  {
    documentNumber: "СП-11",
    date: "2026-07-12",
    objectName: OBJECT_NAMES.vatan,
    reason: "finishing_works",
    responsible: "Исломов Далер",
    materialNames: ["Краска фасадная", "Грунтовка глубокого проникновения", "Провод ВВГ 3×2.5"],
    unit: "ед.",
    totalQuantity: 11.5,
    totalCost: 2950,
    requiresReview: false,
  },
];

function toWriteOff(input: FeaturedInput, number: number, index: number): MaterialWriteOff {
  return {
    id: `wo-${String(number).padStart(4, "0")}`,
    number,
    documentNumber: input.documentNumber,
    date: input.date,
    objectName: input.objectName,
    brigadeName: OBJECT_BRIGADE[input.objectName] ?? null,
    warehouse: MATERIAL_WAREHOUSES[index % MATERIAL_WAREHOUSES.length],
    responsible: input.responsible,
    reason: input.reason,
    basis: "Акт списания материалов",
    note: "",
    requiresReview: input.requiresReview,
    lines: evenLines(input.materialNames, input.unit, input.totalQuantity, input.totalCost),
    createdDate: input.date,
    createdBy: input.responsible,
  };
}

const featured: MaterialWriteOff[] = FEATURED_INPUT.map((input, i) => toWriteOff(input, 20 - i, i));

// 10 more write-offs extending back before 12.07.2026, single material line each, cycling
// through the catalog so filters, reasons and pagination have real variety across all 20 documents.
const PADDING_SOURCE: [string, string, WriteOffReason, number, number][] = [
  [OBJECT_NAMES.logistika, "Цемент белый", "construction_works", 6.0, 1860],
  [OBJECT_NAMES.somoni, "Арматура Ø8 мм", "damage", 4.5, 1400],
  [OBJECT_NAMES.vatan, "Кирпич пустотелый", "defect", 8.0, 2480],
  [OBJECT_NAMES.navruz, "Доска обрезная", "finishing_works", 5.0, 1550],
  [OBJECT_NAMES.somoni, "Щебень 5-20 мм", "construction_works", 7.0, 2170],
  [OBJECT_NAMES.logistika, "Труба ПВХ Ø50", "damage", 4.0, 1240],
  [OBJECT_NAMES.vatan, "Утеплитель базальтовый", "finishing_works", 9.0, 2790],
  [OBJECT_NAMES.navruz, "Проволока вязальная", "construction_works", 5.0, 1550],
  [OBJECT_NAMES.somoni, "Кирпич силикатный", "defect", 7.0, 2170],
  [OBJECT_NAMES.vatan, "Краска интерьерная", "construction_works", 8.5, 2600],
];

const PADDING_DAYS = [10, 9, 7, 6, 5, 4, 3, 2, 1, 30];

const padding: MaterialWriteOff[] = PADDING_SOURCE.map((row, i) => {
  const [objectName, materialName, reason, totalQuantity, totalCost] = row;
  const monthDay = PADDING_DAYS[i];
  const docNum = 10 - i;
  return toWriteOff(
    {
      documentNumber: `СП-${docNum}`,
      date: `2026-07-${String(monthDay).padStart(2, "0")}`,
      objectName,
      reason,
      responsible: RESPONSIBLE_CYCLE[i % RESPONSIBLE_CYCLE.length],
      materialNames: [materialName],
      unit: "ед.",
      totalQuantity,
      totalCost,
      requiresReview: i === 2,
    },
    docNum,
    i + FEATURED_INPUT.length,
  );
});

export const mockMaterialWriteOffs: MaterialWriteOff[] = [...featured, ...padding];

export const WRITE_OFF_OBJECTS: string[] = Array.from(new Set(mockMaterialWriteOffs.map((w) => w.objectName))).sort((a, b) =>
  a.localeCompare(b, "ru"),
);
export const WRITE_OFF_BRIGADES: string[] = Array.from(
  new Set(mockMaterialWriteOffs.map((w) => w.brigadeName).filter((v): v is string => Boolean(v))),
).sort((a, b) => a.localeCompare(b, "ru"));
export const WRITE_OFF_RESPONSIBLE: string[] = Array.from(new Set(mockMaterialWriteOffs.map((w) => w.responsible))).sort((a, b) =>
  a.localeCompare(b, "ru"),
);

export function writeOffQuantity(writeOff: MaterialWriteOff): number {
  return writeOff.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function writeOffTotal(writeOff: MaterialWriteOff): number {
  return writeOff.lines.reduce((sum, line) => sum + line.lineTotal, 0);
}
