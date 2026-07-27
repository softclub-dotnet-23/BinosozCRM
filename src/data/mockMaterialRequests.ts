import type { MaterialRequest, MaterialRequestStatus } from "../types";

// Matches the real Employee record the demo brigadir account (shakhrom.mirzoev) resolves
// through — see mockEmployees.ts — so this seed data is consistent with Assigned Works/Attendance.
const REQUESTER = "Мирзоев Шахром";
const OBJECT_NAME = "Жилой комплекс «Сомони»";
const BRIGADE_NAME = "Бригада №1";

interface FeaturedInput {
  documentNumber: string;
  date: string;
  materialName: string;
  quantity: number;
  unit: string;
  status: MaterialRequestStatus;
}

// Document numbers follow the "<brigade>-<year>-<sequence>" scheme used on site (Бригада №3),
// newest first, spanning July 2026 so the "Заявок за период" KPI and pagination stay realistic.
const FEATURED_INPUT: FeaturedInput[] = [
  { documentNumber: "3-2026-011", date: "2026-07-16", materialName: "Цемент М400", quantity: 40, unit: "мешок", status: "approved" },
  { documentNumber: "3-2026-010", date: "2026-07-15", materialName: "Арматура Ø12 мм", quantity: 0.8, unit: "тонна", status: "in_transit" },
  { documentNumber: "3-2026-009", date: "2026-07-14", materialName: "Кирпич красный", quantity: 1500, unit: "шт", status: "issued" },
  { documentNumber: "3-2026-008", date: "2026-07-13", materialName: "Провод ВВГ 3×2.5", quantity: 60, unit: "м", status: "new" },
  { documentNumber: "3-2026-007", date: "2026-07-12", materialName: "Песок речной", quantity: 6, unit: "м³", status: "approved" },
  { documentNumber: "3-2026-006", date: "2026-07-10", materialName: "Щебень 20-40 мм", quantity: 5, unit: "м³", status: "issued" },
  { documentNumber: "3-2026-005", date: "2026-07-08", materialName: "Доска обрезная", quantity: 1.5, unit: "м³", status: "rejected" },
  { documentNumber: "3-2026-004", date: "2026-07-06", materialName: "Краска фасадная", quantity: 15, unit: "кг", status: "issued" },
  { documentNumber: "3-2026-003", date: "2026-07-04", materialName: "Труба ПВХ Ø110", quantity: 25, unit: "м", status: "issued" },
  { documentNumber: "3-2026-002", date: "2026-07-02", materialName: "Утеплитель базальтовый", quantity: 20, unit: "м²", status: "issued" },
  { documentNumber: "3-2026-001", date: "2026-07-01", materialName: "Цемент М400", quantity: 30, unit: "мешок", status: "issued" },
];

function toRequest(input: FeaturedInput, number: number): MaterialRequest {
  return {
    id: `req-${String(number).padStart(4, "0")}`,
    number,
    documentNumber: input.documentNumber,
    date: input.date,
    materialName: input.materialName,
    quantity: input.quantity,
    unit: input.unit,
    objectName: OBJECT_NAME,
    brigadeName: BRIGADE_NAME,
    requestedBy: REQUESTER,
    status: input.status,
    note: "",
    createdDate: input.date,
    createdBy: REQUESTER,
  };
}

export const mockMaterialRequests: MaterialRequest[] = FEATURED_INPUT.map((input, i) =>
  toRequest(input, FEATURED_INPUT.length - i),
);
