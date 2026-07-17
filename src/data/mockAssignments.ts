import { mockObjects } from "./mockObjects";
import type { Assignment, Brigade } from "../types";

function findObject(id: string) {
  const object = mockObjects.find((o) => o.id === id);
  if (!object) throw new Error(`Unknown mock object id: ${id}`);
  return object;
}

export const mockBrigades: Brigade[] = [
  { id: "brigade-1", name: "Бригада «Фундамент»", specialization: "Фундаментные работы", foremanName: "Фируз Рахмонов", membersCount: 8 },
  { id: "brigade-2", name: "Бригада «Каменщики»", specialization: "Кладочные и монтажные работы", foremanName: "Комрон Саидов", membersCount: 12 },
  { id: "brigade-3", name: "Бригада «Отделочники»", specialization: "Отделочные работы", foremanName: "Шариф Давлатов", membersCount: 10 },
  { id: "brigade-4", name: "Бригада «Инженерные сети»", specialization: "Электрика и сантехника", foremanName: "Мухиддин Холов", membersCount: 6 },
  { id: "brigade-5", name: "Бригада «Кровельщики»", specialization: "Кровельные работы", foremanName: "Азизбек Юсупов", membersCount: 7 },
  { id: "brigade-6", name: "Бригада «Благоустройство»", specialization: "Благоустройство территории", foremanName: "Бахтиёр Курбонов", membersCount: 9 },
];

function findBrigade(id: string) {
  const brigade = mockBrigades.find((b) => b.id === id);
  if (!brigade) throw new Error(`Unknown mock brigade id: ${id}`);
  return brigade;
}

interface RawAssignment {
  objectId: string;
  workTitle: string;
  brigadeId: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: Assignment["status"];
  progress: number;
}

const RAW_ASSIGNMENTS: RawAssignment[] = [
  { objectId: "obj-1", workTitle: "Устройство фундамента", brigadeId: "brigade-1", periodStart: "2026-07-01", periodEnd: "2026-07-10", amount: 145000, status: "completed", progress: 100 },
  { objectId: "obj-1", workTitle: "Кладка стен 1-го этажа", brigadeId: "brigade-2", periodStart: "2026-07-08", periodEnd: "2026-07-22", amount: 210000, status: "active", progress: 65 },
  { objectId: "obj-1", workTitle: "Электромонтажные работы", brigadeId: "brigade-4", periodStart: "2026-07-15", periodEnd: "2026-08-05", amount: 98000, status: "active", progress: 30 },
  { objectId: "obj-2", workTitle: "Устройство фундамента", brigadeId: "brigade-1", periodStart: "2026-07-03", periodEnd: "2026-07-18", amount: 260000, status: "active", progress: 70 },
  { objectId: "obj-2", workTitle: "Фасадное остекление", brigadeId: "brigade-3", periodStart: "2026-07-20", periodEnd: "2026-08-15", amount: 175000, status: "active", progress: 15 },
  { objectId: "obj-3", workTitle: "Кровельные работы", brigadeId: "brigade-5", periodStart: "2026-07-05", periodEnd: "2026-07-14", amount: 62000, status: "completed", progress: 100 },
  { objectId: "obj-3", workTitle: "Отделочные работы", brigadeId: "brigade-3", periodStart: "2026-07-12", periodEnd: "2026-08-02", amount: 88000, status: "active", progress: 55 },
  { objectId: "obj-4", workTitle: "Устройство фундамента", brigadeId: "brigade-1", periodStart: "2026-07-01", periodEnd: "2026-07-20", amount: 310000, status: "active", progress: 80 },
  { objectId: "obj-4", workTitle: "Монтаж металлоконструкций", brigadeId: "brigade-2", periodStart: "2026-07-18", periodEnd: "2026-08-20", amount: 420000, status: "active", progress: 20 },
  { objectId: "obj-5", workTitle: "Кровельные работы", brigadeId: "brigade-5", periodStart: "2026-06-15", periodEnd: "2026-06-30", amount: 54000, status: "overdue", progress: 82 },
  { objectId: "obj-5", workTitle: "Внутренняя отделка", brigadeId: "brigade-3", periodStart: "2026-06-20", periodEnd: "2026-07-10", amount: 71000, status: "completed", progress: 100 },
  { objectId: "obj-6", workTitle: "Устройство фундамента", brigadeId: "brigade-1", periodStart: "2026-07-22", periodEnd: "2026-08-10", amount: 190000, status: "active", progress: 5 },
  { objectId: "obj-6", workTitle: "Инженерные сети", brigadeId: "brigade-4", periodStart: "2026-07-25", periodEnd: "2026-08-20", amount: 132000, status: "active", progress: 0 },
  { objectId: "obj-7", workTitle: "Кладка стен", brigadeId: "brigade-2", periodStart: "2026-07-10", periodEnd: "2026-08-05", amount: 245000, status: "active", progress: 40 },
  { objectId: "obj-7", workTitle: "Благоустройство территории", brigadeId: "brigade-6", periodStart: "2026-07-28", periodEnd: "2026-08-20", amount: 76000, status: "active", progress: 0 },
  { objectId: "obj-8", workTitle: "Отделочные работы", brigadeId: "brigade-3", periodStart: "2026-07-14", periodEnd: "2026-07-30", amount: 54000, status: "active", progress: 60 },
  { objectId: "obj-9", workTitle: "Благоустройство территории", brigadeId: "brigade-6", periodStart: "2026-07-05", periodEnd: "2026-07-25", amount: 68000, status: "active", progress: 75 },
  { objectId: "obj-10", workTitle: "Инженерные сети", brigadeId: "brigade-4", periodStart: "2026-07-08", periodEnd: "2026-07-28", amount: 118000, status: "active", progress: 45 },
];

export const mockAssignments: Assignment[] = RAW_ASSIGNMENTS.map((raw, index) => {
  const object = findObject(raw.objectId);
  const brigade = findBrigade(raw.brigadeId);
  return {
    id: `assignment-${index + 1}`,
    number: index + 1,
    objectId: object.id,
    objectName: object.name,
    objectType: object.objectType,
    imageUrl: object.imageUrl,
    workTitle: raw.workTitle,
    brigadeId: brigade.id,
    brigadeName: brigade.name,
    foremanName: brigade.foremanName,
    foremanRole: "Прораб",
    periodStart: raw.periodStart,
    periodEnd: raw.periodEnd,
    amount: raw.amount,
    status: raw.status,
    progress: raw.progress,
  };
});

export const assignmentKpis = {
  total: mockAssignments.length,
  active: mockAssignments.filter((a) => a.status === "active").length,
  completed: mockAssignments.filter((a) => a.status === "completed").length,
  cancelledOrOverdue: mockAssignments.filter((a) => a.status === "cancelled" || a.status === "overdue").length,
};
