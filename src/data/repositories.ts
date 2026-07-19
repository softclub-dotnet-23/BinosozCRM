import { createCollectionRepository } from "../lib/storage/createCollectionRepository";
import type {
  Assignment,
  AttendanceRecord,
  Brigade,
  BudgetLine,
  Employee,
  Estimate,
  Material,
  MaterialReceipt,
  MaterialTransfer,
  MaterialWriteOff,
  ConstructionObject,
  StaffMember,
  Work,
} from "../types";
import { mockObjects } from "./mockObjects";
import { mockEstimates } from "./mockEstimates";
import { mockBudgetLines } from "./mockBudgets";
import { mockWorks } from "./mockWorks";
import { mockBrigades } from "./mockBrigades";
import { mockEmployees } from "./mockEmployees";
import { mockAssignments } from "./mockAssignments";
import { mockStaff } from "./mockStaff";
import { mockAttendance } from "./mockAttendance";
import { mockMaterials } from "./mockMaterials";
import { mockMaterialReceipts } from "./mockMaterialReceipts";
import { mockMaterialWriteOffs } from "./mockMaterialWriteOffs";
import { mockMaterialTransfers } from "./mockMaterialTransfers";

/**
 * Single source of truth for every persisted entity collection in the app.
 * Each repository is seeded once from the existing mock data and from then
 * on reads/writes through the shared localStorage-backed repository, so a
 * change made on one page (e.g. editing an object) is immediately visible
 * on every other page that reads the same repository, and survives a
 * browser refresh. When a real backend is ready, only this file needs to
 * change: swap createCollectionRepository(...) for an HTTP-backed
 * implementation of the same CollectionRepository interface.
 */
export const objectsRepository = createCollectionRepository<ConstructionObject>("objects.v1", mockObjects);
export const estimatesRepository = createCollectionRepository<Estimate>("estimates.v1", mockEstimates);
export const budgetsRepository = createCollectionRepository<BudgetLine>("budgets.v1", mockBudgetLines);
export const worksRepository = createCollectionRepository<Work>("works.v1", mockWorks);
export const brigadesRepository = createCollectionRepository<Brigade>("brigades.v1", mockBrigades);
export const employeesRepository = createCollectionRepository<Employee>("employees.v1", mockEmployees);
export const assignmentsRepository = createCollectionRepository<Assignment>("assignments.v1", mockAssignments);
export const staffRepository = createCollectionRepository<StaffMember>("staff.v1", mockStaff);
export const attendanceRepository = createCollectionRepository<AttendanceRecord>("attendance.v1", mockAttendance);
export const materialsRepository = createCollectionRepository<Material>("materials.v1", mockMaterials);
export const materialReceiptsRepository = createCollectionRepository<MaterialReceipt>(
  "material-receipts.v1",
  mockMaterialReceipts,
);
export const materialWriteOffsRepository = createCollectionRepository<MaterialWriteOff>(
  "material-write-offs.v1",
  mockMaterialWriteOffs,
);
export const materialTransfersRepository = createCollectionRepository<MaterialTransfer>(
  "material-transfers.v1",
  mockMaterialTransfers,
);
