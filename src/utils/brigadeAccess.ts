import type { Brigade, Employee } from "../types";

export interface BrigadirScope {
  brigade: Brigade;
  /** The brigadir's own employee record (memberRole "brigadir") within that brigade. */
  leadEmployee: Employee;
}

/**
 * Resolves the single brigade a "brigadir"-role session user leads, via the Employee record
 * with memberRole "brigadir" whose name matches the logged-in user. Returns null if no such
 * link exists (e.g. a brigadir account with no matching Employee record) so callers can render
 * a real missing-reference state instead of crashing or silently showing empty/wrong data.
 */
export function findBrigadirScope(employees: Employee[], brigades: Brigade[], fullName: string): BrigadirScope | null {
  const leadEmployee = employees.find((e) => e.memberRole === "brigadir" && e.fullName === fullName);
  if (!leadEmployee?.brigadeId) return null;
  const brigade = brigades.find((b) => b.id === leadEmployee.brigadeId);
  if (!brigade) return null;
  return { brigade, leadEmployee };
}
