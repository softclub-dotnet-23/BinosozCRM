import type { Employee } from "../types";

/**
 * Inventory records store `responsible`/`createdBy` as a plain string that may be
 * either an Employee.id (new records) or a legacy full-name string (records saved
 * before responsible-person selectors were centralized). Resolving both keeps old
 * localStorage data readable without a migration.
 */
export function findEmployeeByIdOrName(value: string | null | undefined, employees: Employee[]): Employee | undefined {
  if (!value) return undefined;
  return employees.find((e) => e.id === value) ?? employees.find((e) => e.fullName === value);
}

export function responsiblePersonName(value: string | null | undefined, employees: Employee[]): string {
  if (!value) return "—";
  return findEmployeeByIdOrName(value, employees)?.fullName ?? value;
}
