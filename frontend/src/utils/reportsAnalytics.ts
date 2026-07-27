import type {
  AttendanceRecord,
  Brigade,
  CategorySpend,
  ConstructionObject,
  MaterialReceipt,
  MaterialWriteOff,
  PayrollRecord,
  Work,
} from "../types";

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime();
  const to = new Date(`${toIso}T00:00:00`).getTime();
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
}

function eachDate(fromIso: string, toIso: string): string[] {
  const dates: string[] = [];
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Shifts a [from, to] range back by its own length, for period-over-period comparison. */
export function previousPeriod(dateFrom: string, dateTo: string): { from: string; to: string } {
  const span = daysBetween(dateFrom, dateTo);
  const from = new Date(`${dateFrom}T00:00:00`);
  from.setDate(from.getDate() - span);
  const to = new Date(`${dateFrom}T00:00:00`);
  to.setDate(to.getDate() - 1);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return round(((current - previous) / previous) * 100, 1);
}

// ---------------------------------------------------------------------------
// Financial report
// ---------------------------------------------------------------------------

export interface FinancialSummaryRow {
  objectId: string;
  objectName: string;
  income: number;
  expense: number;
  profit: number;
}

/** Per-object income/expense using the object's contract budget as revenue and actual spend as cost. */
export function computeFinancialSummary(objects: ConstructionObject[]): FinancialSummaryRow[] {
  return objects.map((o) => ({ objectId: o.id, objectName: o.name, income: o.budget, expense: o.spent, profit: o.budget - o.spent }));
}

export interface FinancialKpis {
  income: number;
  expense: number;
  profit: number;
  profitability: number;
}

export function computeFinancialKpis(rows: FinancialSummaryRow[]): FinancialKpis {
  const income = rows.reduce((sum, r) => sum + r.income, 0);
  const expense = rows.reduce((sum, r) => sum + r.expense, 0);
  const profit = income - expense;
  return { income, expense, profit, profitability: income > 0 ? round((profit / income) * 100, 1) : 0 };
}

export interface DailyFinancePoint {
  date: string;
  label: string;
  income: number;
  expense: number;
}

/**
 * Real daily series built from actual dated records: expense = materials received that
 * day (cost incurred) plus payroll accrued for periods ending that day; income = each
 * active object's contract budget recognized on a straight-line basis over its own
 * project duration. There's no invoicing/revenue ledger in this app, so this is an
 * explicit, deterministic modeling choice grounded in real object data — not a random
 * or hardcoded series.
 */
export function computeDailyFinanceSeries(
  objects: ConstructionObject[],
  receipts: MaterialReceipt[],
  payroll: PayrollRecord[],
  dateFrom: string,
  dateTo: string,
): DailyFinancePoint[] {
  const dates = eachDate(dateFrom, dateTo);

  const expenseByDate = new Map<string, number>();
  for (const r of receipts) {
    if (r.date < dateFrom || r.date > dateTo) continue;
    const total = r.lines.reduce((sum, l) => sum + l.lineTotal, 0);
    expenseByDate.set(r.date, (expenseByDate.get(r.date) ?? 0) + total);
  }
  for (const p of payroll) {
    if (p.status === "cancelled") continue;
    const date = p.paymentDate ?? p.periodEnd;
    if (date < dateFrom || date > dateTo) continue;
    expenseByDate.set(date, (expenseByDate.get(date) ?? 0) + p.totalAccrued);
  }

  const incomeByDate = new Map<string, number>();
  for (const o of objects) {
    const durationDays = daysBetween(o.startDate, o.deadline);
    const dailyIncome = o.budget / durationDays;
    for (const date of eachDate(o.startDate, o.deadline)) {
      if (date < dateFrom || date > dateTo) continue;
      incomeByDate.set(date, (incomeByDate.get(date) ?? 0) + dailyIncome);
    }
  }

  return dates.map((date) => ({
    date,
    label: date.slice(8, 10) + "." + date.slice(5, 7),
    income: round(incomeByDate.get(date) ?? 0),
    expense: round(expenseByDate.get(date) ?? 0),
  }));
}

const EXPENSE_STRUCTURE_COLORS = { materials: "#22A447", payroll: "#F58A1F", other: "#9CA3AF" };

/**
 * Only categories with real backing data are shown (materials from receipts, payroll
 * from the payroll ledger); everything else real spend that isn't itemized elsewhere
 * (equipment rental, transport, subcontractors, ...) is grouped as "Прочие" rather than
 * inventing numbers for cost categories this CRM doesn't actually track.
 */
export function computeExpenseStructure(
  totalExpense: number,
  receipts: MaterialReceipt[],
  payroll: PayrollRecord[],
  dateFrom: string,
  dateTo: string,
): CategorySpend[] {
  const materials = receipts
    .filter((r) => r.date >= dateFrom && r.date <= dateTo)
    .reduce((sum, r) => sum + r.lines.reduce((s, l) => s + l.lineTotal, 0), 0);
  const payrollTotal = payroll
    .filter((p) => p.status !== "cancelled" && (p.paymentDate ?? p.periodEnd) >= dateFrom && (p.paymentDate ?? p.periodEnd) <= dateTo)
    .reduce((sum, p) => sum + p.totalAccrued, 0);
  const other = Math.max(0, totalExpense - materials - payrollTotal);

  return [
    { category: "Материалы", amount: round(materials), color: EXPENSE_STRUCTURE_COLORS.materials },
    { category: "Зарплаты", amount: round(payrollTotal), color: EXPENSE_STRUCTURE_COLORS.payroll },
    { category: "Прочие", amount: round(other), color: EXPENSE_STRUCTURE_COLORS.other },
  ].filter((c) => c.amount > 0);
}

export function getTopObjectsByProfit(rows: FinancialSummaryRow[], limit = 3): FinancialSummaryRow[] {
  return [...rows].sort((a, b) => b.profit - a.profit).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Works report
// ---------------------------------------------------------------------------

export interface ObjectProgressRow {
  objectName: string;
  averageProgress: number;
  workCount: number;
}

export function computeProgressByObject(works: Work[]): ObjectProgressRow[] {
  const byObject = new Map<string, Work[]>();
  for (const w of works) byObject.set(w.objectName, [...(byObject.get(w.objectName) ?? []), w]);
  return Array.from(byObject.entries())
    .map(([objectName, rows]) => ({
      objectName,
      workCount: rows.length,
      averageProgress: Math.round(rows.reduce((sum, w) => sum + w.progress, 0) / rows.length),
    }))
    .sort((a, b) => b.averageProgress - a.averageProgress);
}

export interface ResponsibleWorkRow {
  name: string;
  total: number;
  completed: number;
  overdue: number;
}

export function computeResponsibleStats(works: Work[], limit = 5): ResponsibleWorkRow[] {
  const byName = new Map<string, Work[]>();
  for (const w of works) byName.set(w.responsible.name, [...(byName.get(w.responsible.name) ?? []), w]);
  return Array.from(byName.entries())
    .map(([name, rows]) => ({
      name,
      total: rows.length,
      completed: rows.filter((w) => w.status === "completed").length,
      overdue: rows.filter((w) => w.status === "overdue").length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Brigades report
// ---------------------------------------------------------------------------

export interface BrigadeWorkloadRow {
  brigadeName: string;
  membersCount: number;
  workCount: number;
  averageProgress: number;
  efficiency: number;
}

export function computeBrigadeWorkload(brigades: Brigade[], works: Work[]): BrigadeWorkloadRow[] {
  return brigades
    .map((b) => {
      const brigadeWorks = works.filter((w) => w.brigadeId === b.id);
      return {
        brigadeName: b.name,
        membersCount: b.membersCount,
        workCount: brigadeWorks.length,
        averageProgress:
          brigadeWorks.length > 0 ? Math.round(brigadeWorks.reduce((sum, w) => sum + w.progress, 0) / brigadeWorks.length) : 0,
        efficiency: b.efficiency,
      };
    })
    .sort((a, b) => b.efficiency - a.efficiency);
}

export function computeAttendanceRateByBrigade(records: AttendanceRecord[]): { brigadeName: string; rate: number }[] {
  const byBrigade = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const key = r.brigadeName ?? "Без бригады";
    byBrigade.set(key, [...(byBrigade.get(key) ?? []), r]);
  }
  return Array.from(byBrigade.entries())
    .map(([brigadeName, rows]) => ({
      brigadeName,
      rate: Math.round((rows.filter((r) => r.status !== "absent").length / rows.length) * 100),
    }))
    .sort((a, b) => b.rate - a.rate);
}

// ---------------------------------------------------------------------------
// Write-off cost (used by the warehouse report's KPI row)
// ---------------------------------------------------------------------------

export function sumReceiptsValue(receipts: MaterialReceipt[]): number {
  return receipts.reduce((sum, r) => sum + r.lines.reduce((s, l) => s + l.lineTotal, 0), 0);
}

export function sumWriteOffsValue(writeOffs: MaterialWriteOff[]): number {
  return writeOffs.reduce((sum, w) => sum + w.lines.reduce((s, l) => s + l.lineTotal, 0), 0);
}
