import type { StockReservation } from "../types";

const OBJECT_NAMES = {
  somoni: "Жилой комплекс «Сомони»",
  vatan: "Бизнес-центр «Ватан»",
  navruz: "Коттедж «Навруз»",
  logistika: "Складской комплекс «Логистика»",
};

interface FeaturedInput {
  materialName: string;
  warehouse: string;
  quantity: number;
  objectName: string | null;
  responsible: string;
  date: string;
  note: string;
}

const FEATURED_INPUT: FeaturedInput[] = [
  { materialName: "Цемент М400", warehouse: "Склад (главный)", quantity: 40, objectName: OBJECT_NAMES.somoni, responsible: "Рустам Саидов", date: "2026-07-28", note: "Под заливку фундамента" },
  { materialName: "Арматура Ø12 мм", warehouse: "Склад (главный)", quantity: 0.5, objectName: OBJECT_NAMES.vatan, responsible: "Абдулло Мирзоев", date: "2026-07-27", note: "Резерв под армирование колонн" },
  { materialName: "Кирпич красный", warehouse: "Склад (резервный)", quantity: 500, objectName: OBJECT_NAMES.navruz, responsible: "Комрон Набиев", date: "2026-07-25", note: "" },
  { materialName: "Песок речной", warehouse: "Склад (резервный)", quantity: 2, objectName: OBJECT_NAMES.somoni, responsible: "Шариф Давлатов", date: "2026-07-24", note: "" },
  { materialName: "Щебень 20-40 мм", warehouse: "Склад (главный)", quantity: 1, objectName: OBJECT_NAMES.logistika, responsible: "Мухиддин Холов", date: "2026-07-22", note: "" },
  { materialName: "Труба ПВХ Ø110", warehouse: "Склад (резервный)", quantity: 5, objectName: OBJECT_NAMES.vatan, responsible: "Далер Юсупов", date: "2026-07-20", note: "" },
  { materialName: "Провод ВВГ 3×2.5", warehouse: "Склад (главный)", quantity: 10, objectName: OBJECT_NAMES.logistika, responsible: "Нозим Икромов", date: "2026-07-19", note: "" },
  { materialName: "Утеплитель базальтовый", warehouse: "Склад (главный)", quantity: 3, objectName: OBJECT_NAMES.navruz, responsible: "Фируз Рахмонов", date: "2026-07-18", note: "" },
];

export const mockStockReservations: StockReservation[] = FEATURED_INPUT.map((input, i) => ({
  id: `resv-${String(i + 1).padStart(4, "0")}`,
  materialName: input.materialName,
  warehouse: input.warehouse,
  quantity: input.quantity,
  objectName: input.objectName,
  responsible: input.responsible,
  date: input.date,
  note: input.note,
  status: "active",
  createdDate: input.date,
}));
