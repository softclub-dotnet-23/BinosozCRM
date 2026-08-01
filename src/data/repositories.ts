import { createCollectionRepository } from "../lib/storage/createCollectionRepository";
import { OBJECT_TYPE_IMAGE_FALLBACK } from "../utils/objectImages";
import type {
  Assignment,
  AttendanceRecord,
  Brigade,
  BudgetLine,
  Employee,
  Estimate,
  Material,
  MaterialReceipt,
  MaterialRequest,
  MaterialTransfer,
  MaterialWriteOff,
  ConstructionObject,
  EmployeeDocument,
  PayrollRecord,
  PhotoReport,
  PhotoReportComment,
  ProblemReport,
  StaffMember,
  StockAdjustment,
  StockReservation,
  UserAccount,
  Work,
  WorkerDocument,
  WorkerMessage,
  WorkerNotification,
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
import { mockMaterials, CATEGORY_IMAGE } from "./mockMaterials";
import { mockMaterialReceipts } from "./mockMaterialReceipts";
import { mockMaterialWriteOffs } from "./mockMaterialWriteOffs";
import { mockMaterialTransfers } from "./mockMaterialTransfers";
import { mockMaterialRequests } from "./mockMaterialRequests";
import { mockStockReservations } from "./mockStockReservations";
import { mockStockAdjustments } from "./mockStockAdjustments";
import { mockPayroll } from "./mockPayroll";
import { mockUsers } from "./mockUsers";
import { mockNotifications } from "./mockNotifications";
import { mockWorkerDocuments } from "./mockWorkerDocuments";
import { mockEmployeeDocuments } from "./mockEmployeeDocuments";
import { mockProblemReports } from "./mockProblemReports";
import { mockWorkerMessages } from "./mockWorkerMessages";
import { mockPhotoReports } from "./mockPhotoReports";
import { mockPhotoReportComments } from "./mockPhotoReportComments";

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

// One-time migration: a browser that persisted "objects.v1" before the image-upload fix in
// AddObjectModal (blob: URL -> data: URL) may still have an object whose imageUrl is a blob:
// reference from a previous page session — that reference can never resolve again (the browser
// only keeps it alive for the tab that created it), so it would otherwise render as a permanently
// broken image. Fall back to the type's default photo instead of leaving it dead.
(() => {
  const snapshot = objectsRepository.getSnapshot();
  const needsMigration = snapshot.some((o) => o.imageUrl?.startsWith("blob:"));
  if (needsMigration) {
    void objectsRepository.setAll(
      snapshot.map((o) => (o.imageUrl?.startsWith("blob:") ? { ...o, imageUrl: OBJECT_TYPE_IMAGE_FALLBACK[o.objectType] } : o)),
    );
  }
})();
export const estimatesRepository = createCollectionRepository<Estimate>("estimates.v1", mockEstimates);
export const budgetsRepository = createCollectionRepository<BudgetLine>("budgets.v1", mockBudgetLines);
// v2: brigade/object assignment in the generated seed rows was fixed (previously every brigade's
// generated works were pinned to a single object because the object/brigade cycles were correlated)
// and three more featured works were added — browsers that had already cached "works.v1" would
// otherwise keep seeing the old, single-object dataset forever.
export const worksRepository = createCollectionRepository<Work>("works.v2", mockWorks);
export const brigadesRepository = createCollectionRepository<Brigade>("brigades.v1", mockBrigades);
// v2: added optional personnel-record fields (birthDate/address/passportNumber/hiredAt/
// currentSection/emergencyContact/skills) for the Profile page — bump forces a reseed so the
// worker demo account (employee-1) picks up its new real values.
export const employeesRepository = createCollectionRepository<Employee>("employees.v2", mockEmployees);
export const assignmentsRepository = createCollectionRepository<Assignment>("assignments.v1", mockAssignments);
export const staffRepository = createCollectionRepository<StaffMember>("staff.v1", mockStaff);
export const attendanceRepository = createCollectionRepository<AttendanceRecord>("attendance.v1", mockAttendance);
export const materialsRepository = createCollectionRepository<Material>("materials.v1", mockMaterials);

// One-time migration: browsers that persisted "materials.v1" before the `updatedAt`
// field existed have materials without it. Backfill instead of crashing every reader
// that formats it (Stock page, detail drawers, exports).
(() => {
  const snapshot = materialsRepository.getSnapshot();
  const needsMigration = snapshot.some((m) => !m.updatedAt);
  if (needsMigration) {
    void materialsRepository.setAll(
      snapshot.map((m) => (m.updatedAt ? m : { ...m, updatedAt: new Date().toISOString() })),
    );
  }
})();

// One-time migration: same blob: URL problem as "objects.v1" above, for materials uploaded
// through MaterialFormModal before it switched to persisting a data: URL.
(() => {
  const snapshot = materialsRepository.getSnapshot();
  const needsMigration = snapshot.some((m) => m.imageUrl?.startsWith("blob:"));
  if (needsMigration) {
    void materialsRepository.setAll(
      snapshot.map((m) =>
        m.imageUrl?.startsWith("blob:") ? { ...m, imageUrl: CATEGORY_IMAGE[m.category] ?? "/images/materials/cement-m400.jpg" } : m,
      ),
    );
  }
})();
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
export const materialRequestsRepository = createCollectionRepository<MaterialRequest>(
  "material-requests.v1",
  mockMaterialRequests,
);
export const stockReservationsRepository = createCollectionRepository<StockReservation>(
  "stock-reservations.v1",
  mockStockReservations,
);
export const stockAdjustmentsRepository = createCollectionRepository<StockAdjustment>(
  "stock-adjustments.v1",
  mockStockAdjustments,
);
export const payrollRepository = createCollectionRepository<PayrollRecord>("payroll.v1", mockPayroll);
// v2: seed data gained phone/email fields after some browsers had already cached the v1
// shape, which rendered as permanently-blank Phone/Email columns on the Users page.
// v3: added the Worker demo account (rustam.saidov) — browsers that had already cached "users.v2"
// would otherwise never see it, so the login would fail with "invalid login or password" even
// though the credentials are correct, because the account simply isn't in their cached list yet.
export const usersRepository = createCollectionRepository<UserAccount>("users.v3", mockUsers);

// Worker role collections — notifications, documents, problem reports, messages to the Прораб,
// and photo reports. None of these existed anywhere in the app before the Worker role.
// v2: widened with priority, photo_report_approved/rejected + reminder/system types, and
// relatedPhotoReportId/relatedMaterialRequestId link fields for the Notifications page.
export const notificationsRepository = createCollectionRepository<WorkerNotification>("notifications.v2", mockNotifications);
export const workerDocumentsRepository = createCollectionRepository<WorkerDocument>("worker-documents.v1", mockWorkerDocuments);
export const employeeDocumentsRepository = createCollectionRepository<EmployeeDocument>("employee-documents.v1", mockEmployeeDocuments);
export const problemReportsRepository = createCollectionRepository<ProblemReport>("problem-reports.v1", mockProblemReports);
export const workerMessagesRepository = createCollectionRepository<WorkerMessage>("worker-messages.v1", mockWorkerMessages);
// v2: PhotoReport widened to a real multi-image + approval-status shape (images[], status,
// reviewerComment) — the v1 shape (single imageUrl, no status) can't seed under the new type, so
// this bump forces a clean reseed the same way other mock-data-shape changes in this app do.
export const photoReportsRepository = createCollectionRepository<PhotoReport>("photo-reports.v2", mockPhotoReports);
export const photoReportCommentsRepository = createCollectionRepository<PhotoReportComment>("photo-report-comments.v1", mockPhotoReportComments);
