import type { Brigade, Employee } from "../types";

export interface BrigadirScope {
  brigade: Brigade;
  /** The brigadir's own employee record (memberRole "brigadir") within that brigade. */
  leadEmployee: Employee;
}

/**
 * Resolves the single brigade a "brigadir"-role session user leads, via the stable
 * `employeeId` on their UserAccount/SessionUser (see types.ts) — never by matching names,
 * which can collide or drift out of sync across modules. Returns null if no such link exists
 * (e.g. a brigadir account with no linked Employee record) so callers can render a real
 * missing-reference state instead of crashing or silently showing empty/wrong data.
 */
export function findBrigadirScope(employees: Employee[], brigades: Brigade[], employeeId: string | null): BrigadirScope | null {
  if (!employeeId) return null;
  const leadEmployee = employees.find((e) => e.id === employeeId && e.memberRole === "brigadir");
  if (!leadEmployee?.brigadeId) return null;
  const brigade = brigades.find((b) => b.id === leadEmployee.brigadeId);
  if (!brigade) return null;
  return { brigade, leadEmployee };
}
