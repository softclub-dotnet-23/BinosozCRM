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

export interface Brigade {
  id: string;
  name: string;
  specialization: string;
  foremanName: string;
  membersCount: number;
}

export type AssignmentStatus = "active" | "completed" | "cancelled" | "overdue";

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
