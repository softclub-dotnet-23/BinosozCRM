import { useMemo } from "react";
import type { Brigade, ConstructionObject, Employee, SessionUser, UserAccount, Work } from "../types";
import { brigadesRepository, employeesRepository, objectsRepository, usersRepository, worksRepository } from "../data/repositories";
import { useRepositorySnapshot } from "../hooks/useRepositoryState";

export interface WorkerScope {
  employee: Employee | null;
  brigade: Brigade | null;
  object: ConstructionObject | null;
  prorab: UserAccount | null;
  /** Every Work belonging to the worker's brigade — Work has no individual-employee assignee field
   * anywhere in this app's data model (confirmed: only brigadeId), so a crew member's task list is,
   * honestly, the same brigade-scoped list a Brigadir already sees — the real constraint, not a
   * shortcut. */
  brigadeWorks: Work[];
}

/** Resolves the authenticated Worker's real identity chain by stable id — never by name-matching —
 * the same employeeId → Employee → Brigade → Object chain the Brigadir role already resolves
 * through, one level down. */
export function useWorkerScope(user: SessionUser | null): WorkerScope {
  const employees = useRepositorySnapshot(employeesRepository);
  const brigades = useRepositorySnapshot(brigadesRepository);
  const objects = useRepositorySnapshot(objectsRepository);
  const users = useRepositorySnapshot(usersRepository);
  const works = useRepositorySnapshot(worksRepository);

  return useMemo(() => {
    const employee = user?.employeeId ? (employees.find((e) => e.id === user.employeeId) ?? null) : null;
    const brigade = employee?.brigadeId ? (brigades.find((b) => b.id === employee.brigadeId) ?? null) : null;
    const object = brigade?.objectId ? (objects.find((o) => o.id === brigade.objectId) ?? null) : null;
    const prorab = users.find((u) => u.role === "prorab") ?? null;
    const brigadeWorks = brigade ? works.filter((w) => w.brigadeId === brigade.id) : [];
    return { employee, brigade, object, prorab, brigadeWorks };
  }, [user, employees, brigades, objects, users, works]);
}
