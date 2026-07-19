export type ObjectStatus = "in_progress" | "at_risk" | "almost_done" | "completed";

export type ObjectType =
  | "residential"
  | "business"
  | "cottage"
  | "warehouse"
  | "school"
  | "clinic"
  | "mall"
  | "service"
  | "hotel"
  | "sport"
  | "factory"
  | "infrastructure";

export interface ConstructionObject {
  id: string;
  name: string;
  objectType: ObjectType;
  imageUrl: string;
  city: string;
  address: string;
  foreman: string;
  progress: number;
  budget: number;
  spent: number;
  startDate: string;
  deadline: string;
  status: ObjectStatus;
  description: string;
}

export type TaskUrgency = "overdue" | "today" | "planned";

export interface UpcomingTask {
  id: string;
  title: string;
  responsible: string;
  date: string;
  urgency: TaskUrgency;
  objectId: string;
}

export type AlertSeverity = "red" | "orange" | "blue";
export type AlertIcon = "clock" | "bolt" | "box" | "users";

export interface AttentionItem {
  id: string;
  title: string;
  objectName: string;
  responsible: string;
  alertLabel: string;
  severity: AlertSeverity;
  icon: AlertIcon;
}

export interface ObjectSummaryRow {
  id: string;
  name: string;
  foreman: string;
  progress: number;
  budget: number;
  status: ObjectStatus;
}

export interface BudgetPoint {
  date: string;
  planned: number;
  spent: number;
}

export interface ObjectProgressPoint {
  objectName: string;
  planned: number;
  actual: number;
}

export type PeriodFilter = "week" | "month" | "quarter" | "year";

export interface PayrollSummary {
  period: string;
  employeeCount: number;
  accrued: number;
  deductions: number;
  toPay: number;
  preparedBy: string;
  status: "pending" | "approved" | "returned";
}

export interface ObjectFilters {
  statuses: ObjectStatus[];
  city: string;
  foreman: string;
  minProgress: string;
  maxProgress: string;
  startDate: string;
  deadline: string;
  minBudget: string;
  maxBudget: string;
}

export interface DashboardKpis {
  totalBudget: number;
  spentBudget: number;
  activeObjects: number;
  inProgressObjects: number;
  completedObjects: number;
  payrollDebt: number;
  nextPayoutDate: string;
  completedWorksPercent: number;
}

export type EstimateStatus = "draft" | "pending_review" | "approved";

export interface Estimate {
  id: string;
  number: string;
  objectName: string;
  objectType: ObjectType;
  imageUrl: string;
  date: string;
  updatedDate: string;
  version: string;
  amount: number;
  spent: number;
  usagePercent: number;
  status: EstimateStatus;
  responsible: string;
  responsibleRole: string;
}

export type BudgetLineStatus = "in_progress" | "over_budget" | "completed" | "pending_approval" | "draft";

export interface BudgetLine {
  id: string;
  objectId: string;
  objectName: string;
  objectType: ObjectType;
  imageUrl: string;
  totalBudget: number;
  spent: number;
  status: BudgetLineStatus;
  responsible: string;
  responsibleRole: string;
  periodStart: string;
  periodEnd: string;
  createdDate: string;
  updatedDate: string;
}

export interface CategorySpend {
  category: string;
  amount: number;
  color: string;
}

export type RiskSeverity = "red" | "orange" | "blue";
export type RiskIcon = "trend" | "clock" | "file";

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  badgeLabel: string;
  severity: RiskSeverity;
  icon: RiskIcon;
}

export interface BudgetOperation {
  id: string;
  date: string;
  objectName: string;
  action: string;
  amount: number | null;
  responsible: string;
}

export type BrigadeStatus = "active" | "paused" | "inactive" | "forming" | "overloaded";

export interface Brigade {
  id: string;
  number: number;
  name: string;
  specialization: string;
  foremanName: string;
  membersCount: number;
  workersCount: number;
  helpersCount: number;
  objectId: string;
  objectName: string;
  objectType: ObjectType;
  imageUrl: string;
  sectionName: string;
  currentWork: string;
  workProgress: number;
  remainingDays: number;
  efficiency: number;
  status: BrigadeStatus;
  createdDate: string;
  staffingCapacity: number;
}

export type EmployeeStatus = "on_shift" | "on_site" | "available" | "on_trip" | "absent" | "on_leave" | "sick_leave";

export type WorkShift = "day" | "evening" | "night" | "day_off";

export type BrigadeMemberRole = "foreman" | "worker" | "helper";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  specialty: string;
  qualificationGrade: number;
  brigadeId: string | null;
  brigadeName: string | null;
  memberRole: BrigadeMemberRole;
  objectId: string | null;
  objectName: string | null;
  shift: WorkShift;
  status: EmployeeStatus;
  assignedDate: string;
}

export interface CompositionChange {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  fromBrigadeName: string;
  toBrigadeName: string;
  changeType: "transfer" | "assignment" | "replacement";
}

export type AssignmentStatus = "active" | "completed" | "cancelled" | "overdue";

export type WorkSectionKey = "prep" | "foundation" | "structure" | "finishing" | "engineering" | "other";

export interface WorkSection {
  id: WorkSectionKey;
  name: string;
}

export type WorkStatus = "completed" | "in_progress" | "overdue" | "planned" | "on_review" | "paused" | "cancelled";

export type WorkPriority = "low" | "medium" | "high" | "critical";

export interface WorkAssignee {
  name: string;
  role: string;
}

export interface WorkComment {
  id: string;
  author: string;
  text: string;
  date: string;
}

export interface WorkProgressHistoryEntry {
  id: string;
  date: string;
  progress: number;
  note: string;
  author: string;
}

export interface Work {
  id: string;
  code: string;
  title: string;
  description: string;
  objectId: string;
  objectName: string;
  objectType: ObjectType;
  imageUrl: string;
  sectionId: WorkSectionKey;
  sectionName: string;
  responsible: WorkAssignee;
  brigadeId: string;
  brigadeName: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  plannedDurationDays: number;
  progress: number;
  status: WorkStatus;
  priority: WorkPriority;
  budget: number;
  parentWorkId: string | null;
  dependencyIds: string[];
  attachments: string[];
  comments: WorkComment[];
  progressHistory: WorkProgressHistoryEntry[];
}

export interface CriticalWork {
  work: Work;
  overdueDays: number;
}

export interface WorkAnalytics {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  planned: number;
  onReview: number;
  paused: number;
  cancelled: number;
  completedPercent: number;
  inProgressPercent: number;
  overduePercent: number;
  plannedPercent: number;
  averageProgress: number;
}

export interface WorkSectionBreakdown {
  section: WorkSection;
  workCount: number;
  averageProgress: number;
}

export type StaffCategory = "worker" | "engineer" | "admin";
export type StaffStatus = "active" | "vacation" | "dismissed";

export interface StaffMember {
  id: string;
  fullName: string;
  position: string;
  category: StaffCategory;
  brigadeName: string | null;
  brigadeSpecialization: string | null;
  department: string | null;
  phone: string;
  status: StaffStatus;
  hireDate: string;
  email: string;
  birthDate: string;
  address: string;
  employmentType: string;
  salary: number;
  passportNumber: string;
  inn: string;
  hasContract: boolean;
}

export interface StaffFilters {
  categories: StaffCategory[];
  hireDateFrom: string;
  hireDateTo: string;
}

export type AttendanceStatus = "present" | "late" | "absent";

export interface AttendanceRecord {
  id: string;
  date: string;
  employeeName: string;
  position: string;
  brigadeName: string | null;
  brigadeSpecialization: string | null;
  department: string | null;
  objectName: string;
  city: string;
  arrivalTime: string | null;
  departureTime: string | null;
  status: AttendanceStatus;
  note: string;
}

export interface AttendanceFilters {
  objectName: string;
  brigadeName: string;
  employeeName: string;
  status: AttendanceStatus | "all";
  dateFrom: string;
  dateTo: string;
}

export type MaterialStatus = "normal" | "low" | "critical";

export interface Material {
  id: string;
  number: number;
  name: string;
  supplier: string;
  category: string;
  unit: string;
  unitDetail: string | null;
  imageUrl: string;
  stock: number;
  minStock: number;
  price: number;
  warehouse: string;
  note: string;
}

export interface MaterialFilters {
  search: string;
  category: string;
  status: MaterialStatus | "all";
  supplier: string;
}

export type ReceiptStatus = "completed" | "pending" | "cancelled";

export interface MaterialReceiptLine {
  materialName: string;
  quantity: number;
  unit: string;
  price: number;
  lineTotal: number;
}

export interface MaterialReceipt {
  id: string;
  number: number;
  documentNumber: string;
  date: string;
  supplier: string;
  objectName: string;
  brigadeName: string | null;
  warehouse: string;
  responsible: string;
  invoiceNumber: string;
  note: string;
  lines: MaterialReceiptLine[];
  status: ReceiptStatus;
  createdDate: string;
  createdBy: string;
}

export interface ReceiptFilters {
  supplier: string;
  objectName: string;
  brigadeName: string;
  dateFrom: string;
  dateTo: string;
}

export type WriteOffReason = "construction_works" | "damage" | "finishing_works" | "defect" | "other_works";

export interface MaterialWriteOffLine {
  materialName: string;
  quantity: number;
  unit: string;
  price: number;
  lineTotal: number;
}

export interface MaterialWriteOff {
  id: string;
  number: number;
  documentNumber: string;
  date: string;
  objectName: string;
  brigadeName: string | null;
  warehouse: string;
  responsible: string;
  reason: WriteOffReason;
  basis: string;
  note: string;
  requiresReview: boolean;
  lines: MaterialWriteOffLine[];
  createdDate: string;
  createdBy: string;
}

export interface WriteOffFilters {
  objectName: string;
  brigadeName: string;
  reason: WriteOffReason | "all";
  dateFrom: string;
  dateTo: string;
}

export type TransferStatus = "completed" | "in_transit" | "pending" | "cancelled";

export interface MaterialTransferLine {
  materialName: string;
  quantity: number;
  unit: string;
  price: number;
  lineTotal: number;
}

export interface MaterialTransfer {
  id: string;
  number: number;
  documentNumber: string;
  date: string;
  fromWarehouse: string;
  toWarehouse: string;
  objectName: string | null;
  responsible: string;
  basis: string;
  note: string;
  status: TransferStatus;
  lines: MaterialTransferLine[];
  createdDate: string;
  createdBy: string;
}

export interface TransferFilters {
  fromWarehouse: string;
  toWarehouse: string;
  objectName: string;
  dateFrom: string;
  dateTo: string;
}

export interface MaterialStockRow {
  id: string;
  materialName: string;
  category: string;
  warehouse: string;
  unit: string;
  quantity: number;
  reserved: number;
  available: number;
  minStock: number;
}

export interface Assignment {
  id: string;
  number: number;
  objectId: string;
  objectName: string;
  objectType: ObjectType;
  imageUrl: string;
  workTitle: string;
  brigadeId: string;
  brigadeName: string;
  foremanName: string;
  foremanRole: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  status: AssignmentStatus;
  progress: number;
}
