import type { MaterialTransfer, MaterialTransferLine, TransferStatus } from "../types";
import { MATERIAL_WAREHOUSES } from "./mockMaterials";

const OBJECT_NAMES = {
  somoni: "Жилой комплекс «Сомони»",
  vatan: "Бизнес-центр «Ватан»",
  navruz: "Коттедж «Навруз»",
  logistika: "Складской комплекс «Логистика»",
};

const [MAIN_WAREHOUSE, RESERVE_WAREHOUSE] = MATERIAL_WAREHOUSES;

const RESPONSIBLE_CYCLE = [
  "Мирзоев Шахром",
  "Абдуллоев Бахтиёр",
  "Юсупов Далер",
  "Комрон Саидов",
  "Шариф Давлатов",
  "Мухиддин Холов",
  "Рустамов Комрон",
  "Темуров Фируз",
  "Каримов Сухроб",
  "Нозим Икромов",
];

function singleLine(materialName: string, quantity: number, unit: string, price: number): MaterialTransferLine[] {
  return [{ materialName, quantity, unit, price, lineTotal: Math.round(quantity * price * 100) / 100 }];
}

function evenLines(materialNames: string[], unit: string, totalQuantity: number, totalCost: number): MaterialTransferLine[] {
  const n = materialNames.length;
  const price = Math.round((totalCost / totalQuantity) * 100) / 100;
  const rawQty = Math.round((totalQuantity / n) * 10) / 10;
  let costRunning = 0;
  return materialNames.map((materialName, i) => {
    const isLast = i === n - 1;
    const quantity = isLast ? Math.round((totalQuantity - rawQty * (n - 1)) * 10) / 10 : rawQty;
    const lineTotal = isLast ? Math.round((totalCost - costRunning) * 100) / 100 : Math.round(quantity * price * 100) / 100;
    costRunning += lineTotal;
    return { materialName, quantity, unit, price, lineTotal };
  });
}

interface FeaturedInput {
  documentNumber: string;
  date: string;
  fromWarehouse: string;
  toWarehouse: string;
  objectName: string | null;
  responsible: string;
  status: TransferStatus;
  lines: MaterialTransferLine[];
}

const FEATURED_INPUT: FeaturedInput[] = [
  {
    documentNumber: "ПМ-16",
    date: "2026-07-28",
    fromWarehouse: MAIN_WAREHOUSE,
    toWarehouse: OBJECT_NAMES.somoni,
    objectName: OBJECT_NAMES.somoni,
    responsible: "Мирзоев Шахром",
    status: "completed",
    lines: evenLines(["Цемент М400", "Цемент М500"], "мешок", 22.0, 6450),
  },
  {
    documentNumber: "ПМ-15",
    date: "2026-07-26",
    fromWarehouse: MAIN_WAREHOUSE,
    toWarehouse: OBJECT_NAMES.vatan,
    objectName: OBJECT_NAMES.vatan,
    responsible: "Абдуллоев Бахтиёр",
    status: "completed",
    lines: singleLine("Арматура Ø10 мм", 12.0, "тонна", 180),
  },
  {
    documentNumber: "ПМ-14",
    date: "2026-07-23",
    fromWarehouse: OBJECT_NAMES.somoni,
    toWarehouse: OBJECT_NAMES.navruz,
    objectName: OBJECT_NAMES.navruz,
    responsible: "Юсупов Далер",
    status: "in_transit",
    lines: singleLine("Кирпич облицовочный", 8.0, "шт", 180),
  },
  {
    documentNumber: "ПМ-13",
    date: "2026-07-21",
    fromWarehouse: RESERVE_WAREHOUSE,
    toWarehouse: OBJECT_NAMES.logistika,
    objectName: OBJECT_NAMES.logistika,
    responsible: "Комрон Саидов",
    status: "completed",
    lines: evenLines(["Щебень 20-40 мм", "Песок речной", "Доска обрезная"], "ед.", 35.0, 9850),
  },
  {
    documentNumber: "ПМ-12",
    date: "2026-07-18",
    fromWarehouse: OBJECT_NAMES.vatan,
    toWarehouse: OBJECT_NAMES.logistika,
    objectName: OBJECT_NAMES.logistika,
    responsible: "Шариф Давлатов",
    status: "pending",
    lines: singleLine("Труба ПВХ Ø110", 10.0, "м", 195),
  },
  {
    documentNumber: "ПМ-11",
    date: "2026-07-14",
    fromWarehouse: OBJECT_NAMES.navruz,
    toWarehouse: OBJECT_NAMES.somoni,
    objectName: OBJECT_NAMES.somoni,
    responsible: "Мухиддин Холов",
    status: "completed",
    lines: evenLines(["Провод ВВГ 3×2.5", "Кабель ПВС 2×1.5"], "м", 14.0, 3200),
  },
  {
    documentNumber: "ПМ-10",
    date: "2026-07-13",
    fromWarehouse: MAIN_WAREHOUSE,
    toWarehouse: OBJECT_NAMES.vatan,
    objectName: OBJECT_NAMES.vatan,
    responsible: "Рустамов Комрон",
    status: "completed",
    lines: singleLine("Краска фасадная", 10.0, "кг", 200),
  },
  {
    documentNumber: "ПМ-09",
    date: "2026-07-10",
    fromWarehouse: MAIN_WAREHOUSE,
    toWarehouse: OBJECT_NAMES.navruz,
    objectName: OBJECT_NAMES.navruz,
    responsible: "Темуров Фируз",
    status: "completed",
    lines: singleLine("Утеплитель базальтовый", 7.0, "м²", 190),
  },
  {
    documentNumber: "ПМ-08",
    date: "2026-07-08",
    fromWarehouse: OBJECT_NAMES.logistika,
    toWarehouse: RESERVE_WAREHOUSE,
    objectName: null,
    responsible: "Каримов Сухроб",
    status: "completed",
    lines: evenLines(["Кирпич пустотелый", "Кирпич полнотелый"], "шт", 14.0, 2800),
  },
  {
    documentNumber: "ПМ-07",
    date: "2026-07-05",
    fromWarehouse: OBJECT_NAMES.vatan,
    toWarehouse: OBJECT_NAMES.somoni,
    objectName: OBJECT_NAMES.somoni,
    responsible: "Нозим Икромов",
    status: "completed",
    lines: singleLine("Грунтовка глубокого проникновения", 6.0, "кг", 190),
  },
];

function toTransfer(input: FeaturedInput, number: number): MaterialTransfer {
  return {
    id: `trf-${String(number).padStart(4, "0")}`,
    number,
    documentNumber: input.documentNumber,
    date: input.date,
    fromWarehouse: input.fromWarehouse,
    toWarehouse: input.toWarehouse,
    objectName: input.objectName,
    responsible: input.responsible,
    basis: "Заявка на перемещение материалов",
    note: "",
    status: input.status,
    lines: input.lines,
    createdDate: input.date,
    createdBy: input.responsible,
  };
}

const featured: MaterialTransfer[] = FEATURED_INPUT.map((input, i) => toTransfer(input, 16 - i));

// 6 more transfers extending back before 05.07.2026, single material line each, cycling
// through the same routes/catalog so filters, frequent routes and pagination stay realistic
// across all 16 documents.
const PADDING_SOURCE: [string, string, string | null, string, number, number, TransferStatus][] = [
  [MAIN_WAREHOUSE, OBJECT_NAMES.somoni, OBJECT_NAMES.somoni, "Арматура Ø12 мм", 4.0, 800, "completed"],
  [MAIN_WAREHOUSE, OBJECT_NAMES.vatan, OBJECT_NAMES.vatan, "Цемент М400", 3.5, 700, "completed"],
  [OBJECT_NAMES.navruz, OBJECT_NAMES.somoni, OBJECT_NAMES.somoni, "Кирпич красный", 3.0, 750, "completed"],
  [RESERVE_WAREHOUSE, OBJECT_NAMES.logistika, OBJECT_NAMES.logistika, "Щебень 5-20 мм", 2.8, 800, "completed"],
  [MAIN_WAREHOUSE, OBJECT_NAMES.vatan, OBJECT_NAMES.vatan, "Труба ПВХ Ø50", 2.5, 600, "in_transit"],
  [OBJECT_NAMES.vatan, OBJECT_NAMES.logistika, OBJECT_NAMES.logistika, "Провод ВВГ 3×2.5", 3.0, 940, "completed"],
];

const PADDING_DAYS = [3, 2, 1, 30, 29, 27];

const padding: MaterialTransfer[] = PADDING_SOURCE.map((row, i) => {
  const [fromWarehouse, toWarehouse, objectName, materialName, quantity, price, status] = row;
  const monthDay = PADDING_DAYS[i];
  const docNum = 6 - i;
  return toTransfer(
    {
      documentNumber: `ПМ-${String(docNum).padStart(2, "0")}`,
      date: `2026-07-${String(monthDay).padStart(2, "0")}`,
      fromWarehouse,
      toWarehouse,
      objectName,
      responsible: RESPONSIBLE_CYCLE[(i + FEATURED_INPUT.length) % RESPONSIBLE_CYCLE.length],
      status,
      lines: singleLine(materialName, quantity, "ед.", price),
    },
    docNum,
  );
});

export const mockMaterialTransfers: MaterialTransfer[] = [...featured, ...padding];

export const TRANSFER_LOCATIONS: string[] = Array.from(
  new Set([...MATERIAL_WAREHOUSES, ...mockMaterialTransfers.flatMap((t) => [t.fromWarehouse, t.toWarehouse])]),
).sort((a, b) => a.localeCompare(b, "ru"));

export const TRANSFER_OBJECTS: string[] = Array.from(
  new Set(mockMaterialTransfers.map((t) => t.objectName).filter((v): v is string => Boolean(v))),
).sort((a, b) => a.localeCompare(b, "ru"));

export const TRANSFER_RESPONSIBLE: string[] = Array.from(new Set(mockMaterialTransfers.map((t) => t.responsible))).sort((a, b) =>
  a.localeCompare(b, "ru"),
);

export function transferQuantity(transfer: MaterialTransfer): number {
  return transfer.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function transferTotal(transfer: MaterialTransfer): number {
  return transfer.lines.reduce((sum, line) => sum + line.lineTotal, 0);
}
