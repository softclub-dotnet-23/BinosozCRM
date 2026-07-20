import type { AttendanceRecord, CategorySpend, PayrollRecord, PayrollStatus, PayrollSummary, StaffMember } from "../types";
import { payrollStatusLabel } from "../components/payroll/PayrollStatusBadge";

export function countWorkingDays(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  let count = 0;
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return Math.max(count, 1);
}

/** Days actually attended in the period, or null if no attendance is tracked for this person. */
export function countAttendedDays(
  employeeName: string,
  periodStart: string,
  periodEnd: string,
  attendance: AttendanceRecord[],
): number | null {
  const records = attendance.filter(
    (a) => a.employeeName === employeeName && a.date >= periodStart && a.date <= periodEnd && a.status !== "absent",
  );
  const anyTrackedInPeriod = attendance.some((a) => a.employeeName === employeeName && a.date >= periodStart && a.date <= periodEnd);
  return anyTrackedInPeriod ? records.length : null;
}

const DEFAULT_TAX_RATE = 0.08;

export interface PayrollGenerationOptions {
  overtimeHours: number;
  overtimeRate: number;
  bonuses: number;
  allowances: number;
  advanceDeduction: number;
  otherDeductions: number;
  taxRate: number;
}

export const DEFAULT_GENERATION_OPTIONS: PayrollGenerationOptions = {
  overtimeHours: 0,
  overtimeRate: 0,
  bonuses: 0,
  allowances: 0,
  advanceDeduction: 0,
  otherDeductions: 0,
  taxRate: DEFAULT_TAX_RATE,
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Builds one payroll line for a staff member in "prepared" status. Does not persist. */
export function calculatePayrollRecord(params: {
  staff: StaffMember;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  attendance: AttendanceRecord[];
  options: Partial<PayrollGenerationOptions>;
  preparedBy: string;
  number: number;
}): PayrollRecord {
  const { staff, periodStart, periodEnd, periodLabel, attendance, preparedBy, number } = params;
  const options = { ...DEFAULT_GENERATION_OPTIONS, ...params.options };

  const totalDays = countWorkingDays(periodStart, periodEnd);
  const attended = countAttendedDays(staff.fullName, periodStart, periodEnd, attendance);
  const workedDays = attended ?? totalDays;
  const dailyRate = staff.salary / totalDays;
  const absenceDeduction = round2(dailyRate * Math.max(0, totalDays - workedDays));
  const overtimeAmount = round2(options.overtimeHours * options.overtimeRate);

  const totalAccrued = round2(staff.salary + overtimeAmount + options.bonuses + options.allowances);
  const taxDeduction = round2(totalAccrued * options.taxRate);
  const totalDeductions = round2(absenceDeduction + taxDeduction + options.advanceDeduction + options.otherDeductions);
  const netPayable = round2(totalAccrued - totalDeductions);

  const now = new Date().toISOString();
  return {
    id: `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    number,
    staffId: staff.id,
    employeeName: staff.fullName,
    position: staff.position,
    category: staff.category,
    brigadeName: staff.brigadeName,
    department: staff.department,
    periodStart,
    periodEnd,
    periodLabel,
    baseSalary: staff.salary,
    totalDays,
    workedDays,
    overtimeHours: options.overtimeHours,
    overtimeAmount,
    bonuses: options.bonuses,
    allowances: options.allowances,
    absenceDeduction,
    taxDeduction,
    advanceDeduction: options.advanceDeduction,
    otherDeductions: options.otherDeductions,
    totalAccrued,
    totalDeductions,
    netPayable,
    status: "prepared",
    paymentDate: null,
    paymentMethod: null,
    paymentReference: null,
    preparedBy,
    preparedAt: now,
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    returnedBy: null,
    returnedAt: null,
    returnReason: null,
    paidAt: null,
    note: "",
    createdAt: now,
    updatedAt: now,
    statusHistory: [{ id: `${now}-created`, status: "prepared", date: now, actor: preparedBy, comment: "Расчёт сформирован" }],
  };
}

export interface PayrollKpis {
  totalPayable: number;
  employeeCount: number;
  totalAccrued: number;
  totalDeductions: number;
}

export function computePayrollKpis(records: PayrollRecord[]): PayrollKpis {
  return {
    totalPayable: records.reduce((sum, r) => sum + r.netPayable, 0),
    employeeCount: new Set(records.map((r) => r.staffId)).size,
    totalAccrued: records.reduce((sum, r) => sum + r.totalAccrued, 0),
    totalDeductions: records.reduce((sum, r) => sum + r.totalDeductions, 0),
  };
}

const STATUS_CHART_COLOR: Partial<Record<PayrollStatus, string>> = {
  paid: "#22A447",
  pending_approval: "#F58A1F",
  prepared: "#2869C9",
  needs_review: "#E83939",
  approved: "#9333EA",
  returned: "#E83939",
  cancelled: "#9CA3AF",
};

/** Status buckets for the "Статусы выплат" donut — every record counted exactly once. */
export function computePayrollStatusBuckets(records: PayrollRecord[]): CategorySpend[] {
  const counts = new Map<PayrollStatus, number>();
  for (const r of records) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([status, count]) => ({ category: payrollStatusLabel(status), amount: count, color: STATUS_CHART_COLOR[status] ?? "#9CA3AF" }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * The Dashboard's payroll widget shows one "current batch" — the most recent
 * period that still has something for the Owner to act on (pending approval,
 * or already returned), falling back to the latest period overall. Returns
 * null if there's no payroll data at all.
 */
export function getDashboardPayrollSummary(records: PayrollRecord[]): PayrollSummary | null {
  if (records.length === 0) return null;

  const byPeriod = new Map<string, PayrollRecord[]>();
  for (const r of records) {
    const key = `${r.periodStart}|${r.periodEnd}`;
    byPeriod.set(key, [...(byPeriod.get(key) ?? []), r]);
  }

  const periods = Array.from(byPeriod.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const actionable = periods.find(([, rows]) => rows.some((r) => r.status === "pending_approval" || r.status === "returned"));
  const [, rows] = actionable ?? periods[0];

  const relevant = rows.filter((r) => r.status !== "cancelled");
  if (relevant.length === 0) return null;

  const status: PayrollSummary["status"] = relevant.some((r) => r.status === "returned")
    ? "returned"
    : relevant.every((r) => r.status === "approved" || r.status === "paid")
      ? "approved"
      : "pending";

  return {
    period: relevant[0].periodLabel,
    employeeCount: relevant.length,
    accrued: relevant.reduce((sum, r) => sum + r.totalAccrued, 0),
    deductions: relevant.reduce((sum, r) => sum + r.totalDeductions, 0),
    toPay: relevant.reduce((sum, r) => sum + r.netPayable, 0),
    preparedBy: relevant[0].preparedBy,
    status,
  };
}

/** Approved-but-unpaid records with a planned payment date, soonest first. */
export function getUpcomingPayments(records: PayrollRecord[], limit = 4): PayrollRecord[] {
  return records
    .filter((r) => r.status === "approved" && r.paymentDate)
    .sort((a, b) => (a.paymentDate! < b.paymentDate! ? -1 : 1))
    .slice(0, limit);
}
