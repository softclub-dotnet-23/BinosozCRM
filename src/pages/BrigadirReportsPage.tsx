import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import {
  AlertTriangle,
  CircleCheck,
  ClipboardList,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Settings2,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { MetricCard } from "../components/ui/MetricCard";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { DonutChart } from "../components/charts/DonutChart";
import { ReportGenerateModal, type ReportGenerateOptions } from "../components/reports/ReportGenerateModal";
import {
  worksRepository,
  employeesRepository,
  brigadesRepository,
  objectsRepository,
  materialsRepository,
  materialRequestsRepository,
  materialReceiptsRepository,
  materialWriteOffsRepository,
  attendanceRepository,
  budgetsRepository,
  payrollRepository,
} from "../data/repositories";
import { useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { computeWorkAnalytics } from "../utils/workAnalytics";
import { computeSpecializationDistribution } from "../utils/brigadeAnalytics";
import { computeAttendanceKpis, computeAttendanceStatusSlices } from "../utils/attendanceAnalytics";
import { getMaterialStatus } from "../utils/materialAnalytics";
import { WORK_STATUS_CONFIG, workStatusLabel } from "../utils/workStatus";
import { previousPeriod } from "../utils/reportsAnalytics";
import {
  computeWorkDynamicsSeries,
  computeWorkStatusBreakdown,
  workStatusBucketToDonut,
  computeWorkPriorityBreakdown,
  computeTopObjectsProgress,
  computeExpensesByCategory,
  computePeriodDeltas,
  computeWorkingDays,
  isWorkInPeriod,
  type WorkStatusBucketKey,
} from "../utils/brigadirReportsAnalytics";
import { formatCurrency, formatNumber } from "../utils/format";
import { formatDateShort } from "../utils/date";
import { cn } from "../utils/cn";
import type { AppStrings } from "../lib/i18n/appStrings";

type TabKey = "overview" | "works" | "materials" | "finance" | "brigade" | "attendance";
type BrigadirReportsStrings = AppStrings["brigadirReports"];

const DEFAULT_DATE_FROM = "2026-07-01";
const DEFAULT_DATE_TO = "2026-07-30";

function daysInclusive(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`).getTime();
  const to = new Date(`${toIso}T00:00:00`).getTime();
  return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
}

function downloadCsv(filename: string, blocks: { header: string[]; rows: (string | number)[][] }[]) {
  const csv = blocks
    .map(({ header, rows }) => [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n"))
    .join("\n\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DeltaFooter({ value, unit = "%", invert = false, s }: { value: number | null; unit?: string; invert?: boolean; s: BrigadirReportsStrings }) {
  if (value === null) return null;
  const rounded = Math.round(value * 10) / 10;
  const isGood = invert ? rounded <= 0 : rounded >= 0;
  const colorClass = rounded === 0 ? "text-ink-secondary" : isGood ? "text-green" : "text-red";
  const sign = rounded > 0 ? "+" : "";
  return (
    <span className={colorClass}>
      {sign}
      {rounded}
      {unit} {s.vsPreviousPeriod}
    </span>
  );
}

export default function BrigadirReportsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { strings } = useLanguage();
  const s = strings.brigadirReports;
  const navigate = useNavigate();
  const reduceMotion = usePrefersReducedMotion();

  const employees = useRepositorySnapshot(employeesRepository);
  const brigades = useRepositorySnapshot(brigadesRepository);
  const objects = useRepositorySnapshot(objectsRepository);
  const allWorks = useRepositorySnapshot(worksRepository);
  const materials = useRepositorySnapshot(materialsRepository);
  const materialRequests = useRepositorySnapshot(materialRequestsRepository);
  const receipts = useRepositorySnapshot(materialReceiptsRepository);
  const writeOffs = useRepositorySnapshot(materialWriteOffsRepository);
  const allAttendance = useRepositorySnapshot(attendanceRepository);
  const budgets = useRepositorySnapshot(budgetsRepository);
  const payrollRecords = useRepositorySnapshot(payrollRepository);

  const currentEmployee = useMemo(() => employees.find((e) => e.id === user?.employeeId) ?? null, [employees, user]);
  const currentBrigade = useMemo(() => brigades.find((b) => b.id === currentEmployee?.brigadeId) ?? null, [brigades, currentEmployee]);
  const brigadeMembers = useMemo(() => employees.filter((e) => currentBrigade && e.brigadeId === currentBrigade.id), [employees, currentBrigade]);
  const object = useMemo(() => objects.find((o) => o.id === currentBrigade?.objectId) ?? null, [objects, currentBrigade]);
  const budget = useMemo(() => budgets.find((b) => b.objectId === currentBrigade?.objectId) ?? null, [budgets, currentBrigade]);

  const [tab, setTab] = usePersistentState<TabKey>("reports.brigadir.tab", "overview");
  const [dateFrom, setDateFrom] = usePersistentState("filters.brigadirReports.dateFrom", DEFAULT_DATE_FROM);
  const [dateTo, setDateTo] = usePersistentState("filters.brigadirReports.dateTo", DEFAULT_DATE_TO);
  const [objectFilter, setObjectFilter] = usePersistentState("filters.brigadirReports.object", "all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [generateOpen, setGenerateOpen] = useState(false);

  // Single source of truth: every KPI/chart/table below reads from `brigadeWorks` (or the
  // period-matched receipts/write-offs/payroll/attendance derived the same way) — nothing
  // recomputes its own private slice of the data.
  const brigadeWorksAll = useMemo(() => allWorks.filter((w) => currentBrigade && w.brigadeId === currentBrigade.id), [allWorks, currentBrigade]);
  const brigadeWorksInPeriod = useMemo(() => brigadeWorksAll.filter((w) => isWorkInPeriod(w, dateFrom, dateTo)), [brigadeWorksAll, dateFrom, dateTo]);
  const brigadeObjectNames = useMemo(
    () => Array.from(new Set(brigadeWorksInPeriod.map((w) => w.objectName))).sort((a, b) => a.localeCompare(b, "ru")),
    [brigadeWorksInPeriod],
  );
  const brigadeWorks = useMemo(
    () =>
      brigadeWorksInPeriod.filter((w) => {
        if (objectFilter !== "all" && w.objectName !== objectFilter) return false;
        if (statusFilter !== "all" && w.status !== statusFilter) return false;
        return true;
      }),
    [brigadeWorksInPeriod, objectFilter, statusFilter],
  );

  const { from: prevFrom, to: prevTo } = useMemo(() => previousPeriod(dateFrom, dateTo), [dateFrom, dateTo]);

  const brigadeReceipts = useMemo(
    () => receipts.filter((r) => currentBrigade && r.brigadeName === currentBrigade.name && r.date >= dateFrom && r.date <= dateTo),
    [receipts, currentBrigade, dateFrom, dateTo],
  );
  const brigadeWriteOffs = useMemo(
    () => writeOffs.filter((w) => currentBrigade && w.brigadeName === currentBrigade.name && w.date >= dateFrom && w.date <= dateTo),
    [writeOffs, currentBrigade, dateFrom, dateTo],
  );
  const brigadePayroll = useMemo(
    () => payrollRecords.filter((p) => currentBrigade && p.brigadeName === currentBrigade.name && p.status !== "cancelled" && p.periodEnd >= dateFrom && p.periodStart <= dateTo),
    [payrollRecords, currentBrigade, dateFrom, dateTo],
  );
  const prevBrigadeReceipts = useMemo(
    () => receipts.filter((r) => currentBrigade && r.brigadeName === currentBrigade.name && r.date >= prevFrom && r.date <= prevTo),
    [receipts, currentBrigade, prevFrom, prevTo],
  );
  const prevBrigadeWriteOffs = useMemo(
    () => writeOffs.filter((w) => currentBrigade && w.brigadeName === currentBrigade.name && w.date >= prevFrom && w.date <= prevTo),
    [writeOffs, currentBrigade, prevFrom, prevTo],
  );
  const prevBrigadePayroll = useMemo(
    () => payrollRecords.filter((p) => currentBrigade && p.brigadeName === currentBrigade.name && p.status !== "cancelled" && p.periodEnd >= prevFrom && p.periodStart <= prevTo),
    [payrollRecords, currentBrigade, prevFrom, prevTo],
  );
  const brigadeAttendance = useMemo(
    () => allAttendance.filter((a) => currentBrigade && a.brigadeName === currentBrigade.name && a.date >= dateFrom && a.date <= dateTo),
    [allAttendance, currentBrigade, dateFrom, dateTo],
  );

  const kpis = useMemo(() => computeWorkAnalytics(brigadeWorks), [brigadeWorks]);
  const dynamics = useMemo(() => computeWorkDynamicsSeries(brigadeWorks, dateFrom, dateTo), [brigadeWorks, dateFrom, dateTo]);
  const statusBreakdown = useMemo(() => computeWorkStatusBreakdown(brigadeWorks), [brigadeWorks]);
  const priorityRows = useMemo(() => computeWorkPriorityBreakdown(brigadeWorks), [brigadeWorks]);
  const topObjects = useMemo(() => computeTopObjectsProgress(brigadeWorks, dateFrom), [brigadeWorks, dateFrom]);

  const materialsActual = useMemo(
    () => brigadeReceipts.reduce((sum, r) => sum + r.lines.reduce((s2, l) => s2 + l.lineTotal, 0), 0) + brigadeWriteOffs.reduce((sum, w) => sum + w.lines.reduce((s2, l) => s2 + l.lineTotal, 0), 0),
    [brigadeReceipts, brigadeWriteOffs],
  );
  const laborActual = useMemo(() => brigadePayroll.reduce((sum, p) => sum + p.totalAccrued, 0), [brigadePayroll]);
  const totalActualExpense = materialsActual + laborActual;

  const prevMaterialsActual = useMemo(
    () => prevBrigadeReceipts.reduce((sum, r) => sum + r.lines.reduce((s2, l) => s2 + l.lineTotal, 0), 0) + prevBrigadeWriteOffs.reduce((sum, w) => sum + w.lines.reduce((s2, l) => s2 + l.lineTotal, 0), 0),
    [prevBrigadeReceipts, prevBrigadeWriteOffs],
  );
  const prevLaborActual = useMemo(() => prevBrigadePayroll.reduce((sum, p) => sum + p.totalAccrued, 0), [prevBrigadePayroll]);
  const prevTotalActualExpense = prevMaterialsActual + prevLaborActual;

  // Real budget (BudgetLine has no per-category split anywhere in this app), time-prorated for the
  // selected period the same way computeDailyFinanceSeries prorates object income — see
  // computeExpensesByCategory's own comment for the full reasoning.
  const plannedForPeriod = useMemo(() => {
    if (!budget || !object) return 0;
    const periodDays = daysInclusive(dateFrom, dateTo);
    const projectDurationDays = daysInclusive(object.startDate, object.deadline);
    return budget.totalBudget * (periodDays / projectDurationDays);
  }, [budget, object, dateFrom, dateTo]);

  const expensesByCategory = useMemo(
    () => computeExpensesByCategory(materialsActual, laborActual, plannedForPeriod),
    [materialsActual, laborActual, plannedForPeriod],
  );

  const deltas = useMemo(
    () => computePeriodDeltas(brigadeWorksAll, kpis.averageProgress, totalActualExpense, prevTotalActualExpense, dateFrom, dateTo),
    [brigadeWorksAll, kpis.averageProgress, totalActualExpense, prevTotalActualExpense, dateFrom, dateTo],
  );

  const attendanceKpis = useMemo(() => computeAttendanceKpis(brigadeAttendance), [brigadeAttendance]);
  const attendanceSlices = useMemo(() => computeAttendanceStatusSlices(attendanceKpis), [attendanceKpis]);
  const specialtyDistribution = useMemo(() => computeSpecializationDistribution(brigadeMembers), [brigadeMembers]);
  const lowStockMaterials = useMemo(() => materials.filter((m) => getMaterialStatus(m) !== "normal").length, [materials]);

  const workingDays = useMemo(() => computeWorkingDays(dateFrom, dateTo), [dateFrom, dateTo]);
  const distinctObjects = useMemo(() => new Set(brigadeWorks.map((w) => w.objectName)).size, [brigadeWorks]);
  const distinctEmployees = useMemo(() => {
    const fromAttendance = new Set(brigadeAttendance.map((a) => a.employeeId)).size;
    return fromAttendance > 0 ? fromAttendance : currentBrigade?.membersCount ?? 0;
  }, [brigadeAttendance, currentBrigade]);

  const statusBucketLabel: Record<WorkStatusBucketKey, string> = {
    completed: s.workStatusCompleted,
    in_progress: s.workStatusInProgress,
    on_review: s.workStatusOnReview,
    overdue: s.workStatusOverdue,
    other: s.workStatusOther,
  };
  const priorityLabel: Record<"high" | "medium" | "low", string> = { high: s.priorityHigh, medium: s.priorityMedium, low: s.priorityLow };

  function handleExportCsv() {
    downloadCsv("otchet-brigady.csv", [
      {
        header: [s.kpiTotalWorks, s.kpiCompletedWorks, s.kpiOverdueWorks, s.kpiAverageProgress, s.kpiTotalExpenses],
        rows: [[kpis.total, kpis.completed, kpis.overdue, `${kpis.averageProgress}%`, formatNumber(Math.round(totalActualExpense))]],
      },
      {
        header: [s.colCategory, s.colAmount],
        rows: statusBreakdown.map((b) => [statusBucketLabel[b.key], `${b.count} (${b.percent}%)`]),
      },
      {
        header: [s.colCategory, s.colAmount],
        rows: priorityRows.map((r) => [priorityLabel[r.key], `${r.count} (${r.percent}%)`]),
      },
      {
        header: [s.colObject, s.colTotalWorks, s.colCompleted, s.colProgress, s.colChange],
        rows: topObjects.map((r) => [r.objectName, r.totalWorks, r.completedWorks, `${r.averageProgress}%`, `${r.changePoints >= 0 ? "+" : ""}${r.changePoints}%`]),
      },
      {
        header: [s.colCategory, s.financeTabPlanLabel, s.financeTabActualLabel, s.financeTabVarianceLabel],
        rows: expensesByCategory.map((r) => [r.category, r.planned, r.actual, r.variance]),
      },
    ]);
    showToast(s.csvExportedToast);
  }

  function handlePrint() {
    window.print();
    showToast(s.printPreparedToast);
  }

  function handleGenerateConfirm(options: ReportGenerateOptions) {
    if (options.format === "print") handlePrint();
    else handleExportCsv();
    setGenerateOpen(false);
  }

  if (!currentBrigade) {
    return (
      <AppLayout title={s.pageTitle} subtitle={s.pageSubtitle} titleBelowHeader contentMaxWidth="1600px">
        <Card className="p-10">
          <EmptyState icon={AlertTriangle} title={s.noBrigadeTitle} description={s.noBrigadeDescription} />
        </Card>
      </AppLayout>
    );
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: s.tabOverview },
    { key: "works", label: s.tabWorks },
    { key: "materials", label: s.tabMaterials },
    { key: "finance", label: s.tabFinance },
    { key: "brigade", label: s.tabBrigade },
    { key: "attendance", label: s.tabAttendance },
  ];

  function rowInStyle(index: number): React.CSSProperties | undefined {
    if (reduceMotion) return undefined;
    return { animation: "reportRowIn 260ms ease-out both", animationDelay: `${Math.min(index, 8) * 30}ms` };
  }

  return (
    <AppLayout title={s.pageTitle} subtitle={s.pageSubtitle} titleBelowHeader contentMaxWidth="1600px">
      {!reduceMotion && (
        <style>{`
          @keyframes reportRowIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: none; }
          }
        `}</style>
      )}

      <Card className="overflow-hidden">
        <div className="flex overflow-x-auto px-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "relative whitespace-nowrap px-4 py-3.5 text-sm font-semibold transition-colors",
                tab === t.key ? "text-primary" : "text-ink-secondary hover:text-ink",
              )}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </Card>

      {tab === "overview" && (
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard
              label={s.kpiTotalWorks}
              value={String(kpis.total)}
              numericValue={kpis.total}
              valueFormatter={(v) => String(Math.round(v))}
              icon={ClipboardList}
              tone="blue"
              footer={<DeltaFooter value={deltas.totalWorksPercent} s={s} />}
            />
            <MetricCard
              label={s.kpiCompletedWorks}
              value={String(kpis.completed)}
              numericValue={kpis.completed}
              valueFormatter={(v) => String(Math.round(v))}
              icon={CircleCheck}
              tone="green"
              footer={s.kpiCompletedWorksFooter(kpis.completedPercent)}
            />
            <MetricCard
              label={s.kpiOverdueWorks}
              value={String(kpis.overdue)}
              numericValue={kpis.overdue}
              valueFormatter={(v) => String(Math.round(v))}
              icon={AlertTriangle}
              tone="orange"
              footer={<DeltaFooter value={deltas.overdueWorksCountDelta} unit="" invert s={s} />}
            />
            <MetricCard
              label={s.kpiAverageProgress}
              value={`${kpis.averageProgress}%`}
              numericValue={kpis.averageProgress}
              valueFormatter={(v) => `${Math.round(v)}%`}
              icon={Clock}
              tone="purple"
              footer={<DeltaFooter value={deltas.averageProgressPoints} s={s} />}
            />
            <MetricCard
              label={s.kpiTotalExpenses}
              value={formatNumber(Math.round(totalActualExpense))}
              numericValue={totalActualExpense}
              valueFormatter={(v) => formatNumber(Math.round(v))}
              icon={Database}
              tone="blue"
              footer={<DeltaFooter value={deltas.totalExpensePercent} s={s} />}
            />
          </div>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-9 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-3 text-xs">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-27.5 bg-transparent text-ink focus:outline-none" />
                <span>–</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-27.5 bg-transparent text-ink focus:outline-none" />
              </div>
              <div className="min-w-[150px]">
                <CustomSelect
                  size="sm"
                  value={objectFilter}
                  onValueChange={setObjectFilter}
                  options={[{ value: "all", label: s.allObjectsOption }, ...brigadeObjectNames.map((o) => ({ value: o, label: o }))]}
                />
              </div>
              <div className="min-w-[150px]">
                <CustomSelect size="sm" value={currentBrigade.name} onValueChange={() => {}} options={[{ value: currentBrigade.name, label: currentBrigade.name }]} />
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((v) => !v)}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-[10px] border px-3 text-sm font-medium transition-colors",
                    statusFilter !== "all" ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-ink-secondary hover:bg-surface-3",
                  )}
                >
                  <Filter size={14} /> {s.filterButton}
                </button>
                {filterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} aria-hidden="true" />
                    <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-card p-3.5 shadow-[var(--shadow-popover)]">
                      <p className="text-xs font-semibold text-ink-secondary">{strings.works.filterStatusAriaLabel}</p>
                      <div className="mt-1.5">
                        <CustomSelect
                          value={statusFilter}
                          onValueChange={(v) => {
                            setStatusFilter(v);
                            setFilterOpen(false);
                          }}
                          options={[
                            { value: "all", label: strings.works.statusAllLabel },
                            { value: "completed", label: strings.works.statusCompleted },
                            { value: "in_progress", label: strings.works.statusInProgress },
                            { value: "on_review", label: strings.works.statusOnReview },
                            { value: "overdue", label: strings.works.statusOverdue },
                            { value: "planned", label: strings.works.statusPlanned },
                          ]}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download size={14} /> {s.exportButton}
            </Button>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card className="min-w-0 p-5">
              <h2 className="text-lg font-bold text-ink">{s.dynamicsTitle}</h2>
              {dynamics.length > 1 ? (
                <DynamicsChart data={dynamics} s={s} reduceMotion={reduceMotion} />
              ) : (
                <p className="mt-4 text-sm text-ink-muted">{s.emptyChartData}</p>
              )}
            </Card>

            <div className="grid gap-4">
              <Card className="p-5">
                <h2 className="text-base font-bold text-ink">{s.statusDistributionTitle}</h2>
                {statusBreakdown.length > 0 ? (
                  <div className="mt-4 flex flex-col items-center sm:flex-row sm:gap-5">
                    <DonutChart
                      data={workStatusBucketToDonut(statusBreakdown, (key) => statusBucketLabel[key])}
                      centerLabel={s.kpiTotalWorks}
                      centerValue={String(kpis.total)}
                      animatedCenterValue={kpis.total}
                      size={128}
                      valueFormatter={(v) => formatNumber(v)}
                      animate={!reduceMotion}
                    />
                    <ul className="mt-4 w-full space-y-2 sm:mt-0">
                      {statusBreakdown.map((b) => (
                        <li key={b.key} className="flex items-center gap-2 text-xs">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                          <span className="flex-1 text-ink-secondary">{statusBucketLabel[b.key]}</span>
                          <b className="text-ink">
                            {b.count} ({b.percent}%)
                          </b>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-ink-muted">{s.emptyChartData}</p>
                )}
              </Card>

              <Card className="p-5">
                <h2 className="text-base font-bold text-ink">{s.priorityTitle}</h2>
                <ul className="mt-3.5 space-y-3">
                  {priorityRows.map((row) => (
                    <li key={row.key}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-secondary">{priorityLabel[row.key]}</span>
                        <span className="font-semibold tabular text-ink">
                          {row.count} ({row.percent}%)
                        </span>
                      </div>
                      <ProgressBar
                        value={row.percent}
                        className="mt-1.5"
                        tone={row.key === "high" ? "red" : row.key === "medium" ? "orange" : "green"}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base font-bold text-ink">{s.topObjectsTitle}</h2>
                <button type="button" onClick={() => setObjectFilter("all")} className="text-xs font-semibold text-primary">
                  {s.allObjectsLink}
                </button>
              </div>
              {topObjects.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-ink-secondary">
                        <th className="px-5 py-2.5 font-medium">{s.colObject}</th>
                        <th className="px-2 py-2.5 text-right font-medium">{s.colTotalWorks}</th>
                        <th className="px-2 py-2.5 text-right font-medium">{s.colCompleted}</th>
                        <th className="px-2 py-2.5 font-medium">{s.colProgress}</th>
                        <th className="px-5 py-2.5 text-right font-medium">{s.colChange}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topObjects.map((r, i) => (
                        <tr key={r.objectName} className="border-b border-border last:border-0" style={rowInStyle(i)}>
                          <td className="max-w-[140px] truncate px-5 py-2.5 text-ink">{r.objectName}</td>
                          <td className="px-2 py-2.5 text-right tabular text-ink-secondary">{r.totalWorks}</td>
                          <td className="px-2 py-2.5 text-right tabular text-ink-secondary">{r.completedWorks}</td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center gap-2">
                              <ProgressBar value={r.averageProgress} className="w-14" />
                              <span className="shrink-0 tabular text-xs font-semibold text-ink">{r.averageProgress}%</span>
                            </div>
                          </td>
                          <td className={cn("px-5 py-2.5 text-right tabular font-semibold", r.changePoints > 0 ? "text-green" : r.changePoints < 0 ? "text-red" : "text-ink-secondary")}>
                            {r.changePoints >= 0 ? "+" : ""}
                            {r.changePoints}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">{s.emptyTableData}</p>
              )}
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 className="text-base font-bold text-ink">{s.expensesByCategoryTitle}</h2>
                <button type="button" onClick={() => setTab("finance")} className="text-xs font-semibold text-primary">
                  {s.expensesDetailsLink}
                </button>
              </div>
              {expensesByCategory.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[340px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-ink-secondary">
                        <th className="px-5 py-2.5 font-medium">{s.colCategory}</th>
                        <th className="px-2 py-2.5 text-right font-medium">{s.financeTabPlanLabel}</th>
                        <th className="px-2 py-2.5 text-right font-medium">{s.financeTabActualLabel}</th>
                        <th className="px-5 py-2.5 text-right font-medium">{s.financeTabVarianceLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesByCategory.map((row, i) => (
                        <tr key={row.category} className="border-b border-border last:border-0" style={rowInStyle(i)}>
                          <td className="px-5 py-2.5 text-ink">{row.category}</td>
                          <td className="px-2 py-2.5 text-right tabular text-ink-secondary">{formatNumber(row.planned)}</td>
                          <td className="px-2 py-2.5 text-right tabular text-ink-secondary">{formatNumber(row.actual)}</td>
                          <td className={cn("px-5 py-2.5 text-right tabular font-semibold", row.variance > 0 ? "text-red" : row.variance < 0 ? "text-green" : "text-ink-secondary")}>
                            {row.variance >= 0 ? "+" : ""}
                            {formatNumber(row.variance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 py-8 text-center text-sm text-ink-muted">{s.emptyTableData}</p>
              )}
            </Card>

            <div className="grid gap-4">
              <Card className="p-5">
                <h2 className="text-base font-bold text-ink">{s.periodSummaryTitle}</h2>
                <dl className="mt-3.5 space-y-2 text-sm">
                  <Row label={s.summaryPeriod} value={`${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`} />
                  <Row label={s.summaryObjects} value={String(distinctObjects)} />
                  <Row label={s.summaryBrigades} value="1" />
                  <Row label={s.summaryWorkers} value={String(distinctEmployees)} />
                  <Row label={s.summaryWorkDays} value={String(workingDays)} />
                </dl>
              </Card>

              <Card className="p-5">
                <h2 className="text-base font-bold text-ink">{s.exportPanelTitle}</h2>
                <p className="mt-1 text-xs text-ink-muted">{s.exportPanelHint}</p>
                <div className="mt-3.5 grid grid-cols-3 gap-2">
                  <button type="button" onClick={handlePrint} className="flex flex-col items-center gap-1 rounded-lg border border-border-strong py-2.5 text-xs font-medium text-ink-secondary hover:bg-surface-3">
                    <FileText size={16} className="text-red" /> {s.exportPdf}
                  </button>
                  <button type="button" onClick={handleExportCsv} className="flex flex-col items-center gap-1 rounded-lg border border-border-strong py-2.5 text-xs font-medium text-ink-secondary hover:bg-surface-3">
                    <FileSpreadsheet size={16} className="text-green" /> {s.exportExcel}
                  </button>
                  <button type="button" onClick={handleExportCsv} className="flex flex-col items-center gap-1 rounded-lg border border-border-strong py-2.5 text-xs font-medium text-ink-secondary hover:bg-surface-3">
                    <Download size={16} className="text-blue" /> {s.exportCsv}
                  </button>
                </div>
                <Button className="mt-3.5 w-full" onClick={() => setGenerateOpen(true)}>
                  <Settings2 size={15} /> {s.configureReportButton}
                </Button>
              </Card>
            </div>
          </div>
        </div>
      )}

      {tab === "works" && (
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MetricCard label={s.kpiTotalWorks} value={String(kpis.total)} numericValue={kpis.total} valueFormatter={(v) => String(Math.round(v))} icon={ClipboardList} tone="blue" />
            <MetricCard label={s.kpiCompletedWorks} value={String(kpis.completed)} numericValue={kpis.completed} valueFormatter={(v) => String(Math.round(v))} icon={CircleCheck} tone="green" />
            <MetricCard label={strings.works.statusInProgress} value={String(kpis.inProgress)} numericValue={kpis.inProgress} valueFormatter={(v) => String(Math.round(v))} icon={Clock} tone="purple" />
            <MetricCard label={s.kpiOverdueWorks} value={String(kpis.overdue)} numericValue={kpis.overdue} valueFormatter={(v) => String(Math.round(v))} icon={AlertTriangle} tone="orange" />
          </div>
          <Card className="overflow-hidden p-0">
            {brigadeWorks.length > 0 ? (
              <div className="divide-y divide-border">
                {brigadeWorks.map((w, i) => (
                  <div key={w.id} className="flex items-center gap-3 p-4" style={rowInStyle(i)}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{w.title}</p>
                      <p className="text-xs text-ink-secondary">{w.objectName}</p>
                      <ProgressBar value={w.progress} className="mt-1.5 max-w-56" />
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", WORK_STATUS_CONFIG[w.status].className)}>
                      {workStatusLabel(strings.works, w.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={ClipboardList} title={s.emptyTableData} />
            )}
          </Card>
        </div>
      )}

      {tab === "materials" && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label={s.materialsTabTotal} value={String(materials.length)} icon={Database} tone="blue" />
          <MetricCard label={s.materialsTabLowStock} value={String(lowStockMaterials)} icon={AlertTriangle} tone="orange" />
          <MetricCard label={s.materialsTabRequests} value={String(materialRequests.length)} icon={ClipboardList} tone="purple" />
          <div className="sm:col-span-3">
            <Button onClick={() => navigate("/inventory/materials")}>{s.materialsTabOpenButton}</Button>
          </div>
        </div>
      )}

      {tab === "finance" && (
        <div className="mt-4 grid grid-cols-1 gap-4">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-ink">{s.financeTabBudgetTitle}</h2>
            {budget ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Row label={s.financeTabPlanLabel} value={formatCurrency(budget.totalBudget)} />
                <Row label={s.financeTabActualLabel} value={formatCurrency(budget.spent)} />
                <Row
                  label={s.financeTabVarianceLabel}
                  value={formatCurrency(budget.totalBudget - budget.spent)}
                  valueClassName={budget.totalBudget - budget.spent >= 0 ? "text-green" : "text-red"}
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">{s.financeTabNoBudget}</p>
            )}
          </Card>
          <Card className="overflow-hidden p-0">
            <div className="p-5 pb-0">
              <h2 className="text-lg font-bold text-ink">{s.expensesByCategoryTitle}</h2>
            </div>
            {expensesByCategory.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[340px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-ink-secondary">
                      <th className="px-5 py-2.5 font-medium">{s.colCategory}</th>
                      <th className="px-2 py-2.5 text-right font-medium">{s.financeTabPlanLabel}</th>
                      <th className="px-2 py-2.5 text-right font-medium">{s.financeTabActualLabel}</th>
                      <th className="px-5 py-2.5 text-right font-medium">{s.financeTabVarianceLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesByCategory.map((row) => (
                      <tr key={row.category} className="border-b border-border last:border-0">
                        <td className="px-5 py-2.5 text-ink">{row.category}</td>
                        <td className="px-2 py-2.5 text-right tabular text-ink-secondary">{formatNumber(row.planned)}</td>
                        <td className="px-2 py-2.5 text-right tabular text-ink-secondary">{formatNumber(row.actual)}</td>
                        <td className={cn("px-5 py-2.5 text-right tabular font-semibold", row.variance > 0 ? "text-red" : row.variance < 0 ? "text-green" : "text-ink-secondary")}>
                          {row.variance >= 0 ? "+" : ""}
                          {formatNumber(row.variance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-ink-muted">{s.emptyTableData}</p>
            )}
          </Card>
        </div>
      )}

      {tab === "brigade" && (
        <div className="mt-4 grid grid-cols-1 gap-4">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-ink">{s.brigadeTabTitle}</h2>
            <dl className="mt-3.5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Row label={s.brigadeTabMembers} value={String(currentBrigade.membersCount)} />
              <Row label={s.brigadeTabEfficiency} value={`${currentBrigade.efficiency}%`} />
              <Row label={s.brigadeTabForeman} value={currentBrigade.foremanName} />
              <Row label={s.brigadeTabObject} value={object?.name ?? currentBrigade.objectName} />
            </dl>
          </Card>
          <Card className="p-5">
            <h2 className="text-base font-bold text-ink">{s.specialtiesTitle}</h2>
            <ul className="mt-3.5 space-y-2.5 text-sm">
              {specialtyDistribution
                .filter((r) => r.value > 0)
                .map((row) => (
                  <li key={row.key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                    <span className="flex-1 text-ink-secondary">{row.label}</span>
                    <b className="tabular text-ink">
                      {row.value} ({row.percent}%)
                    </b>
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "attendance" && (
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="grid grid-cols-3 gap-4">
            <MetricCard label={s.attendanceTabPresent} value={String(attendanceKpis.present)} icon={CircleCheck} tone="green" footer={`${attendanceKpis.presentPercent}%`} />
            <MetricCard label={s.attendanceTabLate} value={String(attendanceKpis.late)} icon={Clock} tone="orange" footer={`${attendanceKpis.latePercent}%`} />
            <MetricCard label={s.attendanceTabAbsent} value={String(attendanceKpis.absent)} icon={AlertTriangle} tone="red" footer={`${attendanceKpis.absentPercent}%`} />
          </div>
          {attendanceSlices.some((sl) => sl.value > 0) ? (
            <Card className="p-5">
              <div className="flex flex-col items-center sm:flex-row sm:gap-6">
                <DonutChart
                  data={attendanceSlices.map((sl) => ({ category: sl.label, amount: sl.value, color: sl.color }))}
                  centerLabel={s.summaryWorkDays}
                  centerValue={String(workingDays)}
                  size={140}
                  valueFormatter={(v) => formatNumber(v)}
                />
                <ul className="mt-4 w-full space-y-2 sm:mt-0">
                  {attendanceSlices.map((sl) => (
                    <li key={sl.key} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: sl.color }} />
                      <span className="flex-1 text-ink-secondary">{sl.label}</span>
                      <b className="tabular text-ink">
                        {sl.value} ({sl.percent}%)
                      </b>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ) : (
            <EmptyState icon={ClipboardList} title={s.emptyTableData} />
          )}
        </div>
      )}

      <ReportGenerateModal
        open={generateOpen}
        reportLabel={s.pageTitle}
        periodLabel={`${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`}
        hasData={topObjects.length > 0}
        preview={[
          { label: s.kpiTotalWorks, value: String(kpis.total) },
          { label: s.kpiCompletedWorks, value: String(kpis.completed) },
          { label: s.kpiTotalExpenses, value: formatCurrency(totalActualExpense) },
        ]}
        onClose={() => setGenerateOpen(false)}
        onGenerate={handleGenerateConfirm}
      />
    </AppLayout>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-secondary">{label}</dt>
      <dd className={cn("mt-0.5 font-semibold tabular text-ink", valueClassName)}>{value}</dd>
    </div>
  );
}

function DynamicsTooltip({ active, payload, label, s }: TooltipContentProps & { s: BrigadirReportsStrings }) {
  if (!active || !payload || payload.length === 0) return null;
  const planned = payload.find((p) => p.dataKey === "planned")?.value as number | undefined;
  const actual = payload.find((p) => p.dataKey === "actual")?.value as number | undefined;
  const rate = payload.find((p) => p.dataKey === "rate")?.value as number | undefined;
  return (
    <div className="min-w-40 rounded-xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-popover)]">
      <p className="mb-2 text-xs font-semibold text-ink">{label}</p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-blue" />
          <span className="text-ink-secondary">{s.seriesPlanned}:</span>
          <span className="ml-auto font-semibold tabular text-ink">{planned}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-green" />
          <span className="text-ink-secondary">{s.seriesActual}:</span>
          <span className="ml-auto font-semibold tabular text-ink">{actual}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          <span className="text-ink-secondary">{s.seriesRate}:</span>
          <span className="ml-auto font-semibold tabular text-ink">{rate}%</span>
        </div>
      </div>
    </div>
  );
}

function DynamicsChart({ data, s, reduceMotion }: { data: ReturnType<typeof computeWorkDynamicsSeries>; s: BrigadirReportsStrings; reduceMotion: boolean }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-blue" /> {s.seriesPlanned}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-green" /> {s.seriesActual}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-primary" /> {s.seriesRate}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="#EFEFED" strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: "#9CA3AF" }} width={40} />
          <Tooltip cursor={{ stroke: "#EFEFED" }} isAnimationActive={false} wrapperStyle={{ zIndex: 30, outline: "none" }} content={(props) => <DynamicsTooltip {...props} s={s} />} />
          <Line type="monotone" dataKey="planned" stroke="#2869C9" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={!reduceMotion} animationDuration={500} animationEasing="ease-out" />
          <Line type="monotone" dataKey="actual" stroke="#22A447" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={!reduceMotion} animationDuration={500} animationEasing="ease-out" />
          <Line type="monotone" dataKey="rate" stroke="#FF6B00" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={!reduceMotion} animationDuration={500} animationEasing="ease-out" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
