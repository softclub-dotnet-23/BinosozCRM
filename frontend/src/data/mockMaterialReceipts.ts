import type { MaterialReceipt, MaterialReceiptLine } from "../types";
import { MATERIAL_WAREHOUSES } from "./mockMaterials";

const OBJECT_NAMES = {
  somoni: "Жилой комплекс «Сомони»",
  vatan: "Бизнес-центр «Ватан»",
  navruz: "Коттедж «Навруз»",
  logistika: "Складской комплекс «Логистика»",
};

const OBJECT_BRIGADE: Record<string, string | null> = {
  [OBJECT_NAMES.somoni]: "Бригада №1",
  [OBJECT_NAMES.vatan]: "Бригада №2",
  [OBJECT_NAMES.navruz]: "Бригада №3",
  [OBJECT_NAMES.logistika]: "Бригада №5",
};

const RESPONSIBLE_CYCLE = ["Мирзоев Шахром", "Комрон Саидов", "Шариф Давлатов", "Мухиддин Холов", "Каримов Сухроб"];

function lines(rows: [string, number, string, number][]): MaterialReceiptLine[] {
  return rows.map(([materialName, quantity, unit, price]) => ({
    materialName,
    quantity,
    unit,
    price,
    lineTotal: Math.round(quantity * price * 100) / 100,
  }));
}

interface FeaturedInput {
  documentNumber: string;
  date: string;
  supplier: string;
  objectName: string;
  warehouse: string;
  invoiceNumber: string;
  lineRows: [string, number, string, number][];
}

const FEATURED_INPUT: FeaturedInput[] = [
  {
    documentNumber: "ПР-24",
    date: "2026-07-29",
    supplier: "ООО «ТаджЦемент»",
    objectName: OBJECT_NAMES.somoni,
    warehouse: "Склад (главный)",
    invoiceNumber: "НК-2026-0241",
    lineRows: [
      ["Цемент М400", 100, "мешок", 75],
      ["Цемент М500", 50, "мешок", 225],
    ],
  },
  {
    documentNumber: "ПР-23",
    date: "2026-07-25",
    supplier: "МеталлТрейд",
    objectName: OBJECT_NAMES.vatan,
    warehouse: "Склад (главный)",
    invoiceNumber: "НК-2026-0238",
    lineRows: [
      ["Арматура Ø10 мм", 45, "тонна", 110],
      ["Арматура Ø12 мм", 45, "тонна", 114],
      ["Арматура Ø14 мм", 30, "тонна", 112],
    ],
  },
  {
    documentNumber: "ПР-22",
    date: "2026-07-22",
    supplier: "Кирпичный завод №1",
    objectName: OBJECT_NAMES.navruz,
    warehouse: "Склад (главный)",
    invoiceNumber: "НК-2026-0233",
    lineRows: [["Кирпич красный", 5000, "шт", 2.2]],
  },
  {
    documentNumber: "ПР-21",
    date: "2026-07-20",
    supplier: "Карьер «Гиссар»",
    objectName: OBJECT_NAMES.somoni,
    warehouse: "Склад (резервный)",
    invoiceNumber: "НК-2026-0229",
    lineRows: [
      ["Песок речной", 5, "м³", 160],
      ["Песок карьерный", 4, "м³", 160],
      ["Песок мытый", 3, "м³", 160],
    ],
  },
  {
    documentNumber: "ПР-20",
    date: "2026-07-18",
    supplier: "Карьер «Файзобод»",
    objectName: OBJECT_NAMES.logistika,
    warehouse: "Склад (резервный)",
    invoiceNumber: "НК-2026-0224",
    lineRows: [["Щебень 20-40 мм", 10, "м³", 180]],
  },
  {
    documentNumber: "ПР-19",
    date: "2026-07-15",
    supplier: "ЛесТорг",
    objectName: OBJECT_NAMES.navruz,
    warehouse: "Склад (главный)",
    invoiceNumber: "НК-2026-0219",
    lineRows: [
      ["Доска обрезная", 5, "м³", 2500],
      ["Брус строительный", 5, "м³", 2500],
    ],
  },
  {
    documentNumber: "ПР-18",
    date: "2026-07-12",
    supplier: "СантехМаркет",
    objectName: OBJECT_NAMES.vatan,
    warehouse: "Склад (главный)",
    invoiceNumber: "НК-2026-0214",
    lineRows: [["Труба ПВХ Ø110", 20, "м", 28]],
  },
  {
    documentNumber: "ПР-17",
    date: "2026-07-10",
    supplier: "Dulux",
    objectName: OBJECT_NAMES.somoni,
    warehouse: "Склад (главный)",
    invoiceNumber: "НК-2026-0208",
    lineRows: [
      ["Краска фасадная", 12, "кг", 65],
      ["Краска интерьерная", 8, "кг", 65],
    ],
  },
  {
    documentNumber: "ПР-16",
    date: "2026-07-08",
    supplier: "ЭлектроСнаб",
    objectName: OBJECT_NAMES.logistika,
    warehouse: "Склад «Худжанд»",
    invoiceNumber: "НК-2026-0202",
    lineRows: [["Провод ВВГ 3×2.5", 100, "м", 12.5]],
  },
  {
    documentNumber: "ПР-15",
    date: "2026-07-05",
    supplier: "ТехноНИКОЛЬ",
    objectName: OBJECT_NAMES.navruz,
    warehouse: "Склад (главный)",
    invoiceNumber: "НК-2026-0197",
    lineRows: [["Утеплитель базальтовый", 30, "м²", 45]],
  },
];

function toReceipt(input: FeaturedInput, number: number, index: number): MaterialReceipt {
  return {
    id: `rcpt-${String(number).padStart(4, "0")}`,
    number,
    documentNumber: input.documentNumber,
    date: input.date,
    supplier: input.supplier,
    objectName: input.objectName,
    brigadeName: OBJECT_BRIGADE[input.objectName] ?? null,
    warehouse: input.warehouse,
    responsible: RESPONSIBLE_CYCLE[index % RESPONSIBLE_CYCLE.length],
    invoiceNumber: input.invoiceNumber,
    note: "",
    lines: lines(input.lineRows),
    status: "completed",
    createdDate: input.date,
    createdBy: RESPONSIBLE_CYCLE[index % RESPONSIBLE_CYCLE.length],
  };
}

const featured: MaterialReceipt[] = FEATURED_INPUT.map((input, i) => toReceipt(input, 24 - i, i));

// 14 more receipts extending back before 05.07.2026, single material line each, cycling
// through the same suppliers/objects/catalog so filters have real variety.
const PADDING_SOURCE: [string, string, string, number, string, number][] = [
  ["ООО «ТаджЦемент»", OBJECT_NAMES.somoni, "Цемент М400", 80, "мешок", 75],
  ["МеталлТрейд", OBJECT_NAMES.vatan, "Арматура Ø8 мм", 20, "тонна", 108],
  ["Кирпичный завод №1", OBJECT_NAMES.navruz, "Кирпич облицовочный", 3000, "шт", 2.6],
  ["Карьер «Гиссар»", OBJECT_NAMES.somoni, "Щебень 5-20 мм", 8, "м³", 150],
  ["ЛесТорг", OBJECT_NAMES.navruz, "Фанера ламинированная", 4, "м³", 2100],
  ["СантехМаркет", OBJECT_NAMES.vatan, "Труба ПВХ Ø50", 35, "м", 18],
  ["Dulux", OBJECT_NAMES.somoni, "Грунтовка глубокого проникновения", 15, "кг", 42],
  ["ЭлектроСнаб", OBJECT_NAMES.logistika, "Кабель ПВС 2×1.5", 80, "м", 9.5],
  ["ТехноНИКОЛЬ", OBJECT_NAMES.navruz, "Пенопласт ПСБ-25", 25, "м²", 38],
  ["ООО «ТаджЦемент»", OBJECT_NAMES.vatan, "Цемент ПЦ400-Д20", 60, "мешок", 82],
  ["МеталлТрейд", OBJECT_NAMES.somoni, "Уголок стальной", 12, "тонна", 9800],
  ["Карьер «Файзобод»", OBJECT_NAMES.logistika, "Отсев щебёночный", 6, "м³", 145],
  ["Кирпичный завод №1", OBJECT_NAMES.somoni, "Кирпич пустотелый", 4200, "шт", 2.1],
  ["СантехМаркет", OBJECT_NAMES.navruz, "Труба канализационная", 18, "м", 32],
];

// Fills the July gaps between the 10 featured dates above, so all 24 receipts stay within
// the default 01.07-30.07 filter window (the reference screenshot's "24" KPI/pagination
// total assumes the whole dataset is visible under the default period).
const PADDING_DAYS = [4, 3, 2, 1, 30, 28, 27, 26, 24, 23, 21, 19, 17, 14];

const padding: MaterialReceipt[] = PADDING_SOURCE.map((row, i) => {
  const [supplier, objectName, materialName, quantity, unit, price] = row;
  const monthDay = PADDING_DAYS[i];
  const docNum = 14 - i;
  return toReceipt(
    {
      documentNumber: `ПР-${docNum}`,
      date: `2026-07-${String(monthDay).padStart(2, "0")}`,
      supplier,
      objectName,
      warehouse: MATERIAL_WAREHOUSES[i % MATERIAL_WAREHOUSES.length],
      invoiceNumber: `НК-2026-0${190 - i}`,
      lineRows: [[materialName, quantity, unit, price]],
    },
    docNum,
    i + FEATURED_INPUT.length,
  );
});

export const mockMaterialReceipts: MaterialReceipt[] = [...featured, ...padding];

export const RECEIPT_SUPPLIERS: string[] = Array.from(new Set(mockMaterialReceipts.map((r) => r.supplier))).sort((a, b) =>
  a.localeCompare(b, "ru"),
);
export const RECEIPT_OBJECTS: string[] = Array.from(new Set(mockMaterialReceipts.map((r) => r.objectName))).sort((a, b) =>
  a.localeCompare(b, "ru"),
);
export const RECEIPT_BRIGADES: string[] = Array.from(
  new Set(mockMaterialReceipts.map((r) => r.brigadeName).filter((v): v is string => Boolean(v))),
).sort((a, b) => a.localeCompare(b, "ru"));

export function receiptQuantity(receipt: MaterialReceipt): number {
  return receipt.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function receiptTotal(receipt: MaterialReceipt): number {
  return receipt.lines.reduce((sum, line) => sum + line.lineTotal, 0);
}

export function receiptUnit(receipt: MaterialReceipt): string | null {
  const units = new Set(receipt.lines.map((l) => l.unit));
  return units.size === 1 ? receipt.lines[0].unit : null;
}
