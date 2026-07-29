import type { EmployeeDocument } from "../types";

/** Real personnel documents for employee-1 (Рустам Саидов, the worker demo account) — no other
 * employee needs these yet, same scope as the personnel-record fields in mockEmployees.ts. */
export const mockEmployeeDocuments: EmployeeDocument[] = [
  {
    id: "empdoc-1",
    employeeId: "employee-1",
    type: "identity",
    title: "Удостоверение",
    fileName: "udostoverenie-saidov.pdf",
    uploadedDate: "2019-04-10",
    validUntil: null,
  },
  {
    id: "empdoc-2",
    employeeId: "employee-1",
    type: "safetyInstruction",
    title: "Инструктаж по ТБ",
    fileName: "instruktazh-tb-saidov.pdf",
    uploadedDate: "2026-03-20",
    validUntil: "2027-03-20",
  },
  {
    id: "empdoc-3",
    employeeId: "employee-1",
    type: "contract",
    title: "Договор",
    fileName: "dogovor-saidov.pdf",
    uploadedDate: "2019-04-03",
    validUntil: "2026-12-31",
  },
];
