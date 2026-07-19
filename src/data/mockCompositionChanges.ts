import type { CompositionChange } from "../types";

export const mockCompositionChanges: CompositionChange[] = [
  {
    id: "cc-1",
    date: "2026-08-02",
    employeeId: "free-1",
    employeeName: "Далер Юсупов",
    fromBrigadeName: "Бригада №5",
    toBrigadeName: "Бригада №1",
    changeType: "transfer",
  },
  {
    id: "cc-2",
    date: "2026-08-03",
    employeeId: "employee-4",
    employeeName: "Шариф Давлатов",
    fromBrigadeName: "Бригада №3",
    toBrigadeName: "Бригада №2",
    changeType: "assignment",
  },
  {
    id: "cc-3",
    date: "2026-08-04",
    employeeId: "employee-7",
    employeeName: "Нозим Икромов",
    fromBrigadeName: "Бригада №6",
    toBrigadeName: "Бригада №4",
    changeType: "replacement",
  },
];
