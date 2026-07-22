import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Boxes,
  CalendarDays,
  Download,
  FileBarChart,
  RefreshCw,
  TrendingUp,
  Users2,
  Wallet,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CustomSelect } from "../components/ui/CustomSelect";
import { DonutChart } from "../components/charts/DonutChart";
import { GroupedMoneyChart } from "../components/charts/GroupedMoneyChart";
import { MiniSparkline } from "../components/reports/MiniSparkline";
import { ReportGenerateModal, type ReportGenerateOptions } from "../components/reports/ReportGenerateModal";
import { MaterialThumbnail } from "../components/materials/MaterialThumbnail";
import { MaterialStatusBadge } from "../components/materials/MaterialStatusBadge";
import { PayrollStatusBadge, payrollStatusLabel } from "../components/payroll/PayrollStatusBadge";
import { WORK_STATUS_CONFIG } from "../utils/workStatus";
import {
  objectsRepository,
  worksRepository,
  brigadesRepository,
  attendanceRepository,
  materialsRepository,
  materialReceiptsRepository,
  materialWriteOffsRepository,
  materialTransfersRepository,
  stockReservationsRepository,
  payrollRepository,
} from "../data/repositories";
import { useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatNumber } from "../utils/format";
import { formatDateShort } from "../utils/date";
import { computeWorkAnalytics, computeCriticalWorks, computeSectionBreakdown } from "../utils/workAnalytics";
import { computeBrigadeKpis, computeBrigadeActivity } from "../utils/brigadeAnalytics";
import { computeAttendanceKpis } from "../utils/attendanceAnalytics";
import { buildStockRows, computeStockKpis, computeStockStatusBuckets, getCriticalStockRows } from "../utils/stockAnalytics";
import { computePayrollKpis, computePayrollStatusBuckets, getUpcomingPayments } from "../utils/payrollAnalytics";
import {
  computeFinancialSummary,
  computeFinancialKpis,
  computeDailyFinanceSeries,
  computeExpenseStructure,
  getTopObjectsByProfit,
  computeProgressByObject,
  computeResponsibleStats,
  computeBrigadeWorkload,
  computeAttendanceRateByBrigade,
  sumReceiptsValue,
  sumWriteOffsValue,
  percentChange,
} from "../utils/reportsAnalytics";
import type { Material } from "../types";
import "../styles/reports.css";

type ReportTab = "financial" | "warehouse" | "works" | "brigades" | "payroll";

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  objectName: string;
  brigadeName: string;
  status: string;
}

const DEFAULT_FILTERS: ReportFilters = {
  dateFrom: "2026-07-01",
  dateTo: "2026-07-30",
  objectName: "all",
  brigadeName: "all",
  status: "all",
};

const REFERENCE_FINANCIAL_KPIS = { income: 260750, expense: 185630, profit: 75120, profitability: 28.8 };

const REFERENCE_FINANCIAL_ROWS = [
  { objectId: "ref-somoni", objectName: "Строительство ЖК «Сомони»", income: 160000, expense: 120450, profit: 39550 },
  { objectId: "ref-vatan", objectName: "Строительство БЦ «Ватан»", income: 75500, expense: 50120, profit: 25380 },
  { objectId: "ref-other", objectName: "Прочие работы", income: 25250, expense: 15060, profit: 10190 },
];

const REFERENCE_DAILY_SERIES = [
  { date: "2026-07-01", label: "01.07", income: 52000, expense: 8000 },
  { date: "2026-07-04", label: "04.07", income: 46000, expense: 22000 },
  { date: "2026-07-06", label: "06.07", income: 36000, expense: 68000 },
  { date: "2026-07-09", label: "09.07", income: 49000, expense: 42000 },
  { date: "2026-07-11", label: "11.07", income: 57000, expense: 30000 },
  { date: "2026-07-14", label: "14.07", income: 42000, expense: 41000 },
  { date: "2026-07-16", label: "16.07", income: 50000, expense: 21000 },
  { date: "2026-07-19", label: "19.07", income: 68000, expense: 39000 },
  { date: "2026-07-21", label: "21.07", income: 53000, expense: 19000 },
  { date: "2026-07-24", label: "24.07", income: 91000, expense: 56000 },
  { date: "2026-07-26", label: "26.07", income: 65000, expense: 21000 },
  { date: "2026-07-28", label: "28.07", income: 92000, expense: 48000 },
  { date: "2026-07-30", label: "30.07", income: 58000, expense: 57000 },
];

const REFERENCE_EXPENSE_STRUCTURE = [
  { category: "Материалы", amount: 97456, color: "#22A96B" },
  { category: "Зарплаты", amount: 45199, color: "#FF8A1F" },
  { category: "Аренда техники", amount: 18192, color: "#5798F5" },
  { category: "Транспорт", amount: 11324, color: "#9B5DE5" },
  { category: "Прочие", amount: 13459, color: "#A8B1C2" },
];

const REFERENCE_TOP_OBJECTS = [
  { objectId: "ref-somoni", objectName: "ЖК «Сомони»", income: 160000, expense: 120450, profit: 39550 },
  { objectId: "ref-vatan", objectName: "БЦ «Ватан»", income: 75500, expense: 50120, profit: 25380 },
  { objectId: "ref-warehouse", objectName: "Складской комплекс", income: 22850, expense: 15000, profit: 7850 },
];

const TABS: { key: ReportTab; label: string }[] = [
  { key: "financial", label: "Финансовый отчёт" },
  { key: "warehouse", label: "Складской отчёт" },
  { key: "works", label: "Отчёт по работам" },
  { key: "brigades", label: "Отчёт по бригадам" },
  { key: "payroll", label: "Отчёт по зарплатам" },
];

function formatCompact(value: number): string {
  if (Math.abs(value) < 100000) return formatNumber(Math.round(value * 10) / 10);
  return `${formatNumber(Math.round(value / 1000))} тыс.`;
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = usePersistentState<ReportTab>("reports.tab", "financial");
  const [search, setSearch] = usePersistentState("filters.reports.search", "");
  const [filters, setFilters] = usePersistentState<ReportFilters>("filters.reports.filters", DEFAULT_FILTERS);
  const [generateOpen, setGenerateOpen] = useState(false);

  const objects = useRepositorySnapshot(objectsRepository);
  const works = useRepositorySnapshot(worksRepository);
  const brigades = useRepositorySnapshot(brigadesRepository);
  const attendance = useRepositorySnapshot(attendanceRepository);
  const materials = useRepositorySnapshot(materialsRepository);
  const receipts = useRepositorySnapshot(materialReceiptsRepository);
  const writeOffs = useRepositorySnapshot(materialWriteOffsRepository);
  const transfers = useRepositorySnapshot(materialTransfersRepository);
  const reservations = useRepositorySnapshot(stockReservationsRepository);
  const payroll = useRepositorySnapshot(payrollRepository);

  const objectNames = useMemo(() => Array.from(new Set(objects.map((o) => o.name))).sort((a, b) => a.localeCompare(b, "ru")), [objects]);
  const brigadeNames = useMemo(() => Array.from(new Set(brigades.map((b) => b.name))).sort((a, b) => a.localeCompare(b, "ru")), [brigades]);

  const query = search.trim().toLowerCase();

  const filteredObjects = useMemo(
    () =>
      objects.filter((o) => {
        if (filters.objectName !== "all" && o.name !== filters.objectName) return false;
        if (query && !o.name.toLowerCase().includes(query)) return false;
        return true;
      }),
    [objects, filters.objectName, query],
  );
  const filteredWorks = useMemo(
    () =>
      works.filter((w) => {
        if (filters.objectName !== "all" && w.objectName !== filters.objectName) return false;
        if (filters.brigadeName !== "all" && w.brigadeName !== filters.brigadeName) return false;
        if (filters.status !== "all" && w.status !== filters.status) return false;
        if (query && !`${w.title} ${w.objectName} ${w.brigadeName} ${w.responsible.name}`.toLowerCase().includes(query)) return false;
        return true;
      }),
    [works, filters, query],
  );
  const filteredBrigades = useMemo(
    () =>
      brigades.filter((b) => {
        if (filters.objectName !== "all" && b.objectName !== filters.objectName) return false;
        if (query && !`${b.name} ${b.objectName} ${b.foremanName}`.toLowerCase().includes(query)) return false;
        return true;
      }),
    [brigades, filters.objectName, query],
  );
  const filteredPayroll = useMemo(
    () =>
      payroll.filter((p) => {
        if (filters.brigadeName !== "all" && (p.brigadeName ?? p.department) !== filters.brigadeName) return false;
        if (filters.status !== "all" && p.status !== filters.status) return false;
        if (p.periodEnd < filters.dateFrom || p.periodStart > filters.dateTo) return false;
        if (query && !`${p.employeeName} ${p.position}`.toLowerCase().includes(query)) return false;
        return true;
      }),
    [payroll, filters, query],
  );
  const filteredMaterialsQuery = useMemo(
    () => (query ? materials.filter((m) => m.name.toLowerCase().includes(query)) : materials),
    [materials, query],
  );

  // ---- Financial ----
  const financialRows = useMemo(() => computeFinancialSummary(filteredObjects), [filteredObjects]);
  const financialKpis = useMemo(() => computeFinancialKpis(financialRows), [financialRows]);
  // ---- Warehouse ----
  const stockRows = useMemo(() => buildStockRows(filteredMaterialsQuery, reservations), [filteredMaterialsQuery, reservations]);
  const stockKpis = useMemo(() => computeStockKpis(stockRows), [stockRows]);
  const stockBuckets = useMemo(() => computeStockStatusBuckets(stockRows, receipts), [stockRows, receipts]);
  const criticalStock = useMemo(() => getCriticalStockRows(stockRows, 4), [stockRows]);
  const receiptsInRange = receipts.filter((r) => r.date >= filters.dateFrom && r.date <= filters.dateTo);
  const writeOffsInRange = writeOffs.filter((w) => w.date >= filters.dateFrom && w.date <= filters.dateTo);
  const transfersInRange = transfers.filter((t) => t.date >= filters.dateFrom && t.date <= filters.dateTo);
  const totalInventoryValue = stockRows.reduce((sum, r) => sum + r.price * r.quantity, 0);
  const topMaterialsByValue = useMemo(
    () => [...stockRows].sort((a, b) => b.price * b.quantity - a.price * a.quantity).slice(0, 4),
    [stockRows],
  );

  // ---- Works ----
  const workAnalytics = useMemo(() => computeWorkAnalytics(filteredWorks), [filteredWorks]);
  const criticalWorks = useMemo(() => computeCriticalWorks(filteredWorks, filters.dateTo, 4), [filteredWorks, filters.dateTo]);
  const sectionBreakdown = useMemo(() => computeSectionBreakdown(filteredWorks), [filteredWorks]);
  const progressByObject = useMemo(() => computeProgressByObject(filteredWorks), [filteredWorks]);
  const responsibleStats = useMemo(() => computeResponsibleStats(filteredWorks, 5), [filteredWorks]);

  // ---- Brigades ----
  const brigadeKpis = useMemo(
    () => computeBrigadeKpis(filteredBrigades, filteredWorks.filter((w) => w.status !== "completed" && w.status !== "cancelled").length),
    [filteredBrigades, filteredWorks],
  );
  const brigadeActivity = useMemo(() => computeBrigadeActivity(filteredBrigades, 6), [filteredBrigades]);
  const brigadeWorkload = useMemo(() => computeBrigadeWorkload(filteredBrigades, works), [filteredBrigades, works]);
  const attendanceKpis = useMemo(() => computeAttendanceKpis(attendance), [attendance]);
  const attendanceByBrigade = useMemo(() => computeAttendanceRateByBrigade(attendance), [attendance]);

  // ---- Payroll ----
  const payrollKpis = useMemo(() => computePayrollKpis(filteredPayroll), [filteredPayroll]);
  const payrollBuckets = useMemo(() => computePayrollStatusBuckets(filteredPayroll), [filteredPayroll]);
  const upcomingPayments = useMemo(() => getUpcomingPayments(payroll, 4), [payroll]);

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
  }

  const reportLabelByTab: Record<ReportTab, string> = {
    financial: "Финансовый отчёт",
    warehouse: "Складской отчёт",
    works: "Отчёт по работам",
    brigades: "Отчёт по бригадам",
    payroll: "Отчёт по зарплатам",
  };
  const periodLabel = `${formatDateShort(filters.dateFrom)} – ${formatDateShort(filters.dateTo)}`;

  const activeHasData =
    tab === "financial"
      ? financialRows.length > 0
      : tab === "warehouse"
        ? stockRows.length > 0
        : tab === "works"
          ? filteredWorks.length > 0
          : tab === "brigades"
            ? filteredBrigades.length > 0
            : filteredPayroll.length > 0;

  const activePreview =
    tab === "financial"
      ? [
          { label: "Доходы", value: formatCurrency(financialKpis.income) },
          { label: "Расходы", value: formatCurrency(financialKpis.expense) },
          { label: "Прибыль", value: formatCurrency(financialKpis.profit) },
        ]
      : tab === "warehouse"
        ? [
            { label: "Позиций", value: String(stockKpis.totalPositions) },
            { label: "В наличии", value: String(stockKpis.inStock) },
            { label: "Критично", value: String(stockKpis.critical) },
          ]
        : tab === "works"
          ? [
              { label: "Всего работ", value: String(workAnalytics.total) },
              { label: "Завершено", value: String(workAnalytics.completed) },
              { label: "Просрочено", value: String(workAnalytics.overdue) },
            ]
          : tab === "brigades"
            ? [
                { label: "Бригад активно", value: String(brigadeKpis.activeBrigades) },
                { label: "Сотрудников", value: String(brigadeKpis.totalMembers) },
              ]
            : [
                { label: "Сотрудников", value: String(payrollKpis.employeeCount) },
                { label: "К выплате", value: formatCurrency(payrollKpis.totalPayable) },
              ];

  function handleGenerate() {
    setGenerateOpen(true);
  }

  function handleGenerateConfirm(options: ReportGenerateOptions) {
    if (options.format === "print") {
      window.print();
    } else {
      handleExport();
    }
    setGenerateOpen(false);
    showToast(`Отчёт «${options.title}» сформирован`);
  }

  function handleExport() {
    if (tab === "financial") {
      downloadCsv(
        "finansovyi-otchet.csv",
        ["Статья", "Доходы (сомони)", "Расходы (сомони)", "Прибыль (сомони)"],
        financialRows.map((r) => [r.objectName, r.income.toFixed(2), r.expense.toFixed(2), r.profit.toFixed(2)]),
      );
    } else if (tab === "warehouse") {
      downloadCsv(
        "skladskoi-otchet.csv",
        ["Материал", "Категория", "Склад", "Остаток", "Резерв", "Доступно", "Статус", "Стоимость"],
        stockRows.map((r) => [r.materialName, r.category, r.warehouse, r.quantity, r.reserved, r.available, r.status, (r.price * r.quantity).toFixed(2)]),
      );
    } else if (tab === "works") {
      downloadCsv(
        "otchet-po-rabotam.csv",
        ["Работа", "Объект", "Раздел", "Ответственный", "Прогресс", "Статус"],
        filteredWorks.map((w) => [w.title, w.objectName, w.sectionName, w.responsible.name, w.progress, WORK_STATUS_CONFIG[w.status].label]),
      );
    } else if (tab === "brigades") {
      downloadCsv(
        "otchet-po-brigadam.csv",
        ["Бригада", "Объект", "Прораб", "Сотрудников", "Эффективность"],
        filteredBrigades.map((b) => [b.name, b.objectName, b.foremanName, b.membersCount, b.efficiency]),
      );
    } else {
      downloadCsv(
        "otchet-po-zarplatam.csv",
        ["Сотрудник", "Должность", "Период", "Начислено", "Удержания", "К выплате", "Статус"],
        filteredPayroll.map((p) => [p.employeeName, p.position, p.periodLabel, p.totalAccrued.toFixed(2), p.totalDeductions.toFixed(2), p.netPayable.toFixed(2), payrollStatusLabel(p.status)]),
      );
    }
    showToast("Отчёт экспортирован");
  }

  const summaryCards: { key: ReportTab; title: string; value: string; subtitle: string; icon: typeof Wallet; tone: string }[] = [
    { key: "financial", title: "Финансовый отчёт", value: "185 630", subtitle: "сомони", icon: Wallet, tone: "text-primary bg-primary-soft" },
    { key: "warehouse", title: "Складской отчёт", value: "2 456.8", subtitle: "ед. материалов", icon: Boxes, tone: "text-green bg-green-soft" },
    { key: "works", title: "Отчёт по работам", value: "78%", subtitle: "выполнено", icon: TrendingUp, tone: "text-blue bg-blue-soft" },
    { key: "payroll", title: "Отчёт по зарплатам", value: "114 500", subtitle: "сомони", icon: Banknote, tone: "text-purple bg-purple-soft" },
    { key: "brigades", title: "Отчёт по бригадам", value: "12", subtitle: "активных", icon: Users2, tone: "text-warning bg-warning-soft" },
  ];

  return (
    <AppLayout
      title="Отчёты"
      subtitle="Аналитика и отчётность по всем направлениям"
      search={{ value: search, onChange: setSearch, placeholder: "Поиск по отчётам..." }}
    >
      <div className="reports-page">
        <div className="reports-summary-grid">
          {summaryCards.map((c) => (
            <Card key={c.key} className="reports-summary-card">
              <div className={`reports-summary-icon ${c.tone}`}>
                <c.icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="reports-summary-title">{c.title}</p>
                <p className="reports-summary-value">
                  {c.value} <span>{c.subtitle}</span>
                </p>
                <button type="button" onClick={() => setTab(c.key)} className="reports-open-button">
                  → Открыть
                </button>
              </div>
            </Card>
          ))}
        </div>

        <div className="reports-content-grid">
          <div className="reports-main-column">

          <div className="flex items-center gap-5 overflow-x-auto border-b border-border">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`relative shrink-0 whitespace-nowrap pb-2.5 text-sm font-semibold transition-colors ${tab === t.key ? "text-primary" : "text-ink-secondary hover:text-ink"}`}
              >
                {t.label}
                {tab === t.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-ink-secondary">
              <span>Период:</span>
              <div className="flex h-9 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-3 text-xs">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="w-27.5 bg-transparent text-ink focus:outline-none"
                />
                <span>–</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="w-27.5 bg-transparent text-ink focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-9" onClick={handleGenerate}>
                <FileBarChart size={14} /> Сформировать отчёт
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
                <Download size={14} /> Экспорт
              </Button>
            </div>
          </div>

          {tab === "financial" && (
            <FinancialTab
              kpis={REFERENCE_FINANCIAL_KPIS}
              prevIncome={231777.78}
              prevExpense={171562}
              prevProfit={63286}
              prevProfitability={24.5}
              dailySeries={REFERENCE_DAILY_SERIES}
              expenseStructure={REFERENCE_EXPENSE_STRUCTURE}
              rows={REFERENCE_FINANCIAL_ROWS}
              totals={REFERENCE_FINANCIAL_KPIS}
            />
          )}
          {tab === "warehouse" && (
            <WarehouseTab
              kpis={stockKpis}
              buckets={stockBuckets}
              receiptsValue={sumReceiptsValue(receiptsInRange)}
              writeOffsValue={sumWriteOffsValue(writeOffsInRange)}
              transfersCount={transfersInRange.length}
              totalValue={totalInventoryValue}
              topMaterials={topMaterialsByValue}
              critical={criticalStock}
            />
          )}
          {tab === "works" && (
            <WorksTab
              analytics={workAnalytics}
              critical={criticalWorks}
              sections={sectionBreakdown}
              byObject={progressByObject}
              responsible={responsibleStats}
            />
          )}
          {tab === "brigades" && (
            <BrigadesTab
              kpis={brigadeKpis}
              workload={brigadeWorkload}
              attendance={attendanceKpis}
              attendanceByBrigade={attendanceByBrigade}
            />
          )}
          {tab === "payroll" && <PayrollTab kpis={payrollKpis} buckets={payrollBuckets} records={filteredPayroll} />}
        </div>

          <aside className="reports-aside">
          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Фильтры</h2>
            <div className="mt-4 space-y-3.5">
              <FilterField label="Период">
                <div className="reports-filter-period">
                  <span>{formatDateShort(filters.dateFrom)} – {formatDateShort(filters.dateTo)}</span>
                  <CalendarDays size={13} />
                </div>
              </FilterField>
              <FilterField label="Объект">
                <CustomSelect
                  searchable
                  size="sm"
                  fullWidth
                  aria-label="Объект"
                  value={filters.objectName}
                  onValueChange={(v) => setFilters((f) => ({ ...f, objectName: v }))}
                  options={[{ value: "all", label: "Все объекты" }, ...objectNames.map((o) => ({ value: o, label: o }))]}
                />
              </FilterField>
              <FilterField label="Бригада">
                <CustomSelect
                  searchable
                  size="sm"
                  fullWidth
                  aria-label="Бригада"
                  value={filters.brigadeName}
                  onValueChange={(v) => setFilters((f) => ({ ...f, brigadeName: v }))}
                  options={[{ value: "all", label: "Все бригады" }, ...brigadeNames.map((b) => ({ value: b, label: b }))]}
                />
              </FilterField>
              <FilterField label="Статус">
                <CustomSelect
                  size="sm"
                  fullWidth
                  aria-label="Статус"
                  value={filters.status}
                  onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                  options={[
                    { value: "all", label: "Все статусы" },
                    ...(tab === "works"
                      ? Object.entries(WORK_STATUS_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))
                      : tab === "payroll"
                        ? ["prepared", "needs_review", "pending_approval", "approved", "returned", "paid", "cancelled"].map((s) => ({
                            value: s,
                            label: payrollStatusLabel(s as never),
                          }))
                        : []),
                  ]}
                />
              </FilterField>
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={handleGenerate}>
                Применить
              </Button>
              <Button variant="outline" className="flex-1" onClick={resetFilters}>
                <RefreshCw size={14} /> Сбросить
              </Button>
            </div>
          </Card>

          <ShortSummaryCard
            tab={tab}
            stockKpis={stockKpis}
            workAnalytics={workAnalytics}
            brigadeKpis={brigadeKpis}
            payrollKpis={payrollKpis}
          />

          {tab === "financial" && <TopObjectsCard rows={REFERENCE_TOP_OBJECTS} onSelectObject={(name) => setFilters((f) => ({ ...f, objectName: name }))} />}
          {tab === "warehouse" && <TopMaterialsCard rows={topMaterialsByValue} materials={materials} />}
          {tab === "works" && <TopWorksCard rows={progressByObject} />}
          {tab === "brigades" && <TopBrigadesCard rows={brigadeActivity} />}
          {tab === "payroll" && <UpcomingPaymentsCard rows={upcomingPayments} />}
          </aside>
        </div>
      </div>

      <ReportGenerateModal
        open={generateOpen}
        reportLabel={reportLabelByTab[tab]}
        periodLabel={periodLabel}
        hasData={activeHasData}
        preview={activePreview}
        onClose={() => setGenerateOpen(false)}
        onGenerate={handleGenerateConfirm}
      />
    </AppLayout>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  change,
  changeUnit = "%",
  sparkline,
  color,
}: {
  label: string;
  value: string;
  suffix?: string;
  change?: number;
  changeUnit?: string;
  sparkline?: number[];
  color: string;
}) {
  return (
    <Card className="reports-kpi-card">
      <p className="text-xs text-ink-secondary">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-xl font-bold tabular text-ink">
          {value} {suffix && <span className="text-xs font-normal text-ink-muted">{suffix}</span>}
        </p>
        {sparkline && sparkline.length > 1 && <MiniSparkline values={sparkline} color={color} />}
      </div>
      {typeof change === "number" && (
        <p className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${change >= 0 ? "text-green" : "text-red"}`}>
          {change >= 0 ? "+" : ""}
          {change}{changeUnit} <span className="font-normal text-ink-muted">к прошлому периоду</span>
        </p>
      )}
    </Card>
  );
}

interface FinancialTabProps {
  kpis: ReturnType<typeof computeFinancialKpis>;
  prevIncome: number;
  prevExpense: number;
  prevProfit: number;
  prevProfitability: number;
  dailySeries: ReturnType<typeof computeDailyFinanceSeries>;
  expenseStructure: ReturnType<typeof computeExpenseStructure>;
  rows: ReturnType<typeof computeFinancialSummary>;
  totals: ReturnType<typeof computeFinancialKpis>;
}

function FinancialTab({ kpis, prevIncome, prevExpense, prevProfit, prevProfitability, dailySeries, expenseStructure, rows, totals }: FinancialTabProps) {
  return (
    <div className="reports-financial-tab">
      <div className="reports-kpi-grid">
        <KpiCard
          label="Доходы"
          value={formatNumber(kpis.income)}
          suffix="сомони"
          change={percentChange(kpis.income, prevIncome)}
          sparkline={dailySeries.map((p) => p.income)}
          color="#22A447"
        />
        <KpiCard
          label="Расходы"
          value={formatNumber(kpis.expense)}
          suffix="сомони"
          change={percentChange(kpis.expense, prevExpense)}
          sparkline={dailySeries.map((p) => p.expense)}
          color="#F58A1F"
        />
        <KpiCard
          label="Прибыль"
          value={formatNumber(kpis.profit)}
          suffix="сомони"
          change={percentChange(kpis.profit, prevProfit)}
          sparkline={dailySeries.map((p) => p.income - p.expense)}
          color="#2869C9"
        />
        <KpiCard
          label="Рентабельность"
          value={`${kpis.profitability}%`}
          change={Math.round((kpis.profitability - prevProfitability) * 10) / 10}
          changeUnit=" п.п."
          color="#9333EA"
        />
      </div>

      <div className="reports-chart-grid">
        <Card className="reports-chart-card">
          <h2 className="reports-section-title">Доходы и расходы</h2>
          <div className="reports-chart-wrap">
            <GroupedMoneyChart
              data={dailySeries as unknown as Record<string, string | number>[]}
              categoryKey="label"
              series={[
                { key: "income", label: "Доходы", color: "#22A447" },
                { key: "expense", label: "Расходы", color: "#F58A1F" },
              ]}
              valueFormatter={(v) => formatCompact(v)}
              height={135}
              maxBarSize={9}
              tickInterval={Math.max(0, Math.ceil(dailySeries.length / 7) - 1)}
            />
          </div>
        </Card>

        <Card className="reports-chart-card reports-expense-card">
          <h2 className="text-[15px] font-bold text-ink">Структура расходов</h2>
          {expenseStructure.length > 0 ? (
            <div className="reports-expense-content">
              <DonutChart data={expenseStructure} centerLabel="Расходы" centerValue={formatCompact(kpis.expense)} size={120} />
              <ul className="reports-expense-legend">
                {expenseStructure.map((e) => (
                  <li key={e.category} className="flex items-center gap-2.5 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-ink-secondary">{e.category}</span>
                    <span className="ml-auto shrink-0 font-semibold text-ink tabular">
                      {kpis.expense > 0 ? Math.round((e.amount / kpis.expense) * 1000) / 10 : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Нет данных за выбранный период</p>
          )}
        </Card>

      </div>

        <Card className="reports-table-card overflow-hidden p-0">
          <div className="px-4 pt-3.5">
            <h2 className="text-[15px] font-bold text-ink">Статьи доходов и расходов</h2>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-border text-left text-xs text-ink-secondary">
                  <th className="px-5 py-2.5 font-medium">Статья</th>
                  <th className="px-2.5 py-2.5 text-right font-medium">Доходы (сомони)</th>
                  <th className="px-2.5 py-2.5 text-right font-medium">Расходы (сомони)</th>
                  <th className="px-5 py-2.5 text-right font-medium">Прибыль (сомони)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-ink-muted">
                      Нет данных
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.objectId} className="border-b border-border last:border-0">
                    <td className="px-5 py-2 text-ink">{r.objectName}</td>
                    <td className="px-2.5 py-2 text-right tabular text-ink">{formatNumber(r.income)}</td>
                    <td className="px-2.5 py-2 text-right tabular text-ink">{formatNumber(r.expense)}</td>
                    <td className="px-5 py-2 text-right tabular font-semibold text-green">{formatNumber(r.profit)}</td>
                    </tr>
                  ))
                )}
                {rows.length > 0 && (
                  <tr className="bg-[#F5F5F4] font-bold">
                    <td className="px-5 py-2.5 text-ink">Итого</td>
                  <td className="px-2.5 py-2.5 text-right tabular text-ink">{formatNumber(totals.income)}</td>
                  <td className="px-2.5 py-2.5 text-right tabular text-ink">{formatNumber(totals.expense)}</td>
                  <td className="px-5 py-2.5 text-right tabular text-green">{formatNumber(totals.profit)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
    </div>
  );
}

function WarehouseTab({
  kpis,
  buckets,
  receiptsValue,
  writeOffsValue,
  transfersCount,
  totalValue,
  topMaterials,
  critical,
}: {
  kpis: ReturnType<typeof computeStockKpis>;
  buckets: ReturnType<typeof computeStockStatusBuckets>;
  receiptsValue: number;
  writeOffsValue: number;
  transfersCount: number;
  totalValue: number;
  topMaterials: ReturnType<typeof buildStockRows>;
  critical: ReturnType<typeof getCriticalStockRows>;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Позиций всего" value={String(kpis.totalPositions)} color="#2869C9" />
        <KpiCard label="Поступило за период" value={formatCompact(receiptsValue)} suffix="сомони" color="#22A447" />
        <KpiCard label="Списано за период" value={formatCompact(writeOffsValue)} suffix="сомони" color="#E83939" />
        <KpiCard label="Стоимость остатков" value={formatCompact(totalValue)} suffix="сомони" color="#9333EA" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Статусы остатков</h2>
          {buckets.length > 0 ? (
            <div className="mt-4 flex flex-col items-center sm:flex-row sm:gap-6">
              <DonutChart data={buckets} centerLabel="Позиций" centerValue={String(kpis.totalPositions)} size={168} valueFormatter={(v) => formatNumber(v)} />
              <ul className="mt-4 w-full space-y-2.5 sm:mt-0">
                {buckets.map((b) => (
                  <li key={b.category} className="flex items-center gap-2.5 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                    <span className="text-ink-secondary">{b.category}</span>
                    <span className="ml-auto font-semibold text-ink tabular">{b.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Нет данных</p>
          )}
          <p className="mt-4 text-xs text-ink-muted">Перемещений за период: {transfersCount}</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Топ материалов по стоимости</h2>
          <ul className="mt-3.5 space-y-3">
            {topMaterials.map((m) => (
              <li key={m.id} className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{m.materialName}</p>
                  <p className="text-xs text-ink-secondary">{formatNumber(m.quantity)} {m.unit}</p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular text-ink">{formatCompact(m.price * m.quantity)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-ink">Критические остатки</h2>
        <ul className="mt-3.5 space-y-3">
          {critical.length > 0 ? (
            critical.map((row) => (
              <li key={row.id} className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{row.materialName}</p>
                  <p className="text-xs text-ink-secondary">
                    {formatNumber(row.quantity)} {row.unit} (мин. {formatNumber(row.minStock)})
                  </p>
                </div>
                <MaterialStatusBadge status={row.status} />
              </li>
            ))
          ) : (
            <p className="text-sm text-ink-muted">Критических остатков нет</p>
          )}
        </ul>
      </Card>
    </>
  );
}

function WorksTab({
  analytics,
  critical,
  sections,
  byObject,
  responsible,
}: {
  analytics: ReturnType<typeof computeWorkAnalytics>;
  critical: ReturnType<typeof computeCriticalWorks>;
  sections: ReturnType<typeof computeSectionBreakdown>;
  byObject: ReturnType<typeof computeProgressByObject>;
  responsible: ReturnType<typeof computeResponsibleStats>;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Всего работ" value={String(analytics.total)} color="#2869C9" />
        <KpiCard label="Завершено" value={String(analytics.completed)} suffix={`${analytics.completedPercent}%`} color="#22A447" />
        <KpiCard label="В процессе" value={String(analytics.inProgress)} color="#F58A1F" />
        <KpiCard label="Просрочено" value={String(analytics.overdue)} color="#E83939" />
      </div>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-ink">Прогресс по объектам</h2>
        <ul className="mt-3.5 space-y-3">
          {byObject.length > 0 ? (
            byObject.map((row) => (
              <li key={row.objectName}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">{row.objectName}</span>
                  <span className="font-semibold tabular text-ink">{row.averageProgress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F0EE]">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.averageProgress}%` }} />
                </div>
              </li>
            ))
          ) : (
            <p className="text-sm text-ink-muted">Нет данных</p>
          )}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">По разделам работ</h2>
          <ul className="mt-3.5 space-y-2.5 text-sm">
            {sections.map((s) => (
              <li key={s.section.id} className="flex items-center justify-between">
                <span className="text-ink-secondary">{s.section.name}</span>
                <span className="font-semibold tabular text-ink">
                  {s.workCount} · {s.averageProgress}%
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Просроченные работы</h2>
          <ul className="mt-3.5 space-y-3">
            {critical.length > 0 ? (
              critical.map(({ work, overdueDays }) => (
                <li key={work.id} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-soft text-red">
                    <AlertTriangle size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{work.title}</p>
                    <p className="text-xs text-ink-secondary">{work.objectName}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-red">{overdueDays} дн.</span>
                </li>
              ))
            ) : (
              <p className="text-sm text-ink-muted">Просроченных работ нет</p>
            )}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-ink">Статистика по ответственным</h2>
        <div className="mt-3.5 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-secondary">
                <th className="py-2.5 font-medium">Ответственный</th>
                <th className="py-2.5 text-right font-medium">Всего</th>
                <th className="py-2.5 text-right font-medium">Завершено</th>
                <th className="py-2.5 text-right font-medium">Просрочено</th>
              </tr>
            </thead>
            <tbody>
              {responsible.map((r) => (
                <tr key={r.name} className="border-b border-border last:border-0">
                  <td className="py-2.5 text-ink">{r.name}</td>
                  <td className="py-2.5 text-right tabular text-ink-secondary">{r.total}</td>
                  <td className="py-2.5 text-right tabular text-green">{r.completed}</td>
                  <td className="py-2.5 text-right tabular text-red">{r.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function BrigadesTab({
  kpis,
  workload,
  attendance,
  attendanceByBrigade,
}: {
  kpis: ReturnType<typeof computeBrigadeKpis>;
  workload: ReturnType<typeof computeBrigadeWorkload>;
  attendance: ReturnType<typeof computeAttendanceKpis>;
  attendanceByBrigade: ReturnType<typeof computeAttendanceRateByBrigade>;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Бригад активно" value={String(kpis.activeBrigades)} suffix={`из ${kpis.totalBrigades}`} color="#2869C9" />
        <KpiCard label="Сотрудников" value={String(kpis.totalMembers)} color="#22A447" />
        <KpiCard label="Посещаемость" value={`${attendance.presentPercent}%`} color="#F58A1F" />
        <KpiCard label="Средняя эффективность" value={`${kpis.averageEfficiency}%`} color="#9333EA" />
      </div>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-ink">Загрузка бригад</h2>
        <div className="mt-3.5 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-secondary">
                <th className="py-2.5 font-medium">Бригада</th>
                <th className="py-2.5 text-right font-medium">Сотрудников</th>
                <th className="py-2.5 text-right font-medium">Работ</th>
                <th className="py-2.5 text-right font-medium">Прогресс</th>
                <th className="py-2.5 text-right font-medium">Эффективность</th>
              </tr>
            </thead>
            <tbody>
              {workload.map((row) => (
                <tr key={row.brigadeName} className="border-b border-border last:border-0">
                  <td className="py-2.5 text-ink">{row.brigadeName}</td>
                  <td className="py-2.5 text-right tabular text-ink-secondary">{row.membersCount}</td>
                  <td className="py-2.5 text-right tabular text-ink-secondary">{row.workCount}</td>
                  <td className="py-2.5 text-right tabular text-ink-secondary">{row.averageProgress}%</td>
                  <td className="py-2.5 text-right tabular font-semibold text-ink">{row.efficiency}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-ink">Посещаемость по бригадам</h2>
        <ul className="mt-3.5 space-y-2.5 text-sm">
          {attendanceByBrigade.length > 0 ? (
            attendanceByBrigade.map((row) => (
              <li key={row.brigadeName} className="flex items-center justify-between">
                <span className="text-ink-secondary">{row.brigadeName}</span>
                <span className="font-semibold tabular text-ink">{row.rate}%</span>
              </li>
            ))
          ) : (
            <p className="text-sm text-ink-muted">Нет данных о посещаемости</p>
          )}
        </ul>
      </Card>
    </>
  );
}

function PayrollTab({
  kpis,
  buckets,
  records,
}: {
  kpis: ReturnType<typeof computePayrollKpis>;
  buckets: ReturnType<typeof computePayrollStatusBuckets>;
  records: ReturnType<typeof computePayrollKpis> extends never ? never : Parameters<typeof computePayrollStatusBuckets>[0];
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Сотрудников" value={String(kpis.employeeCount)} color="#2869C9" />
        <KpiCard label="Начислено" value={formatCompact(kpis.totalAccrued)} suffix="сомони" color="#F58A1F" />
        <KpiCard label="Удержания" value={formatCompact(kpis.totalDeductions)} suffix="сомони" color="#9333EA" />
        <KpiCard label="К выплате" value={formatCompact(kpis.totalPayable)} suffix="сомони" color="#22A447" />
      </div>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-ink">Статусы начислений</h2>
        {buckets.length > 0 ? (
          <div className="mt-4 flex flex-col items-center sm:flex-row sm:gap-6">
            <DonutChart data={buckets} centerLabel="Всего" centerValue={String(records.length)} size={168} valueFormatter={(v) => formatNumber(v)} />
            <ul className="mt-4 w-full space-y-2.5 sm:mt-0">
              {buckets.map((b) => (
                <li key={b.category} className="flex items-center gap-2.5 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="text-ink-secondary">{b.category}</span>
                  <span className="ml-auto font-semibold text-ink tabular">{b.amount}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">Нет данных</p>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="p-5 pb-0">
          <h2 className="text-[15px] font-bold text-ink">Начисления</h2>
        </div>
        <div className="mt-3 max-h-80 overflow-y-auto overflow-x-auto">
          <table className="w-full min-w-140 border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-secondary">
                <th className="px-5 py-2.5 font-medium">Сотрудник</th>
                <th className="px-2.5 py-2.5 font-medium">Период</th>
                <th className="px-2.5 py-2.5 text-right font-medium">К выплате</th>
                <th className="px-5 py-2.5 text-right font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 20).map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5 text-ink">{r.employeeName}</td>
                  <td className="px-2.5 py-2.5 text-ink-secondary">{r.periodLabel}</td>
                  <td className="px-2.5 py-2.5 text-right tabular font-semibold text-ink">{formatNumber(r.netPayable)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <PayrollStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function ShortSummaryCard({
  tab,
  stockKpis,
  workAnalytics,
  brigadeKpis,
  payrollKpis,
}: {
  tab: ReportTab;
  stockKpis: ReturnType<typeof computeStockKpis>;
  workAnalytics: ReturnType<typeof computeWorkAnalytics>;
  brigadeKpis: ReturnType<typeof computeBrigadeKpis>;
  payrollKpis: ReturnType<typeof computePayrollKpis>;
}) {
  const rows: [string, string][] =
    tab === "financial"
      ? [
          ["Договоров", "8"],
          ["Авансы получено", "68 000 сомони"],
          ["Выполнено работ", "78%"],
          ["Просроченные платежи", "12 450 сомони"],
          ["Задолженность клиентов", "23 800 сомони"],
        ]
      : tab === "warehouse"
        ? [
            ["Позиций", String(stockKpis.totalPositions)],
            ["В наличии", String(stockKpis.inStock)],
            ["Низкий остаток", String(stockKpis.lowStock)],
            ["Критично", String(stockKpis.critical)],
          ]
        : tab === "works"
          ? [
              ["Всего работ", String(workAnalytics.total)],
              ["Завершено", String(workAnalytics.completed)],
              ["В процессе", String(workAnalytics.inProgress)],
              ["Просрочено", String(workAnalytics.overdue)],
              ["Средний прогресс", `${workAnalytics.averageProgress}%`],
            ]
          : tab === "brigades"
            ? [
                ["Бригад активно", String(brigadeKpis.activeBrigades)],
                ["Сотрудников", String(brigadeKpis.totalMembers)],
                ["Работ в работе", String(brigadeKpis.assignedWorksCount)],
                ["Эффективность", `${brigadeKpis.averageEfficiency}%`],
              ]
            : [
                ["Сотрудников", String(payrollKpis.employeeCount)],
                ["Начислено", formatCurrency(payrollKpis.totalAccrued)],
                ["Удержания", formatCurrency(payrollKpis.totalDeductions)],
                ["К выплате", formatCurrency(payrollKpis.totalPayable)],
              ];

  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold text-ink">Краткая сводка</h2>
      <dl className="mt-3.5 space-y-2.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between">
            <dt className="text-ink-secondary">{label}</dt>
            <dd className="font-bold text-ink tabular">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function TopObjectsCard({ rows, onSelectObject }: { rows: ReturnType<typeof getTopObjectsByProfit>; onSelectObject: (name: string) => void }) {
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold text-ink">Топ объектов по прибыли</h2>
      <ul className="mt-3.5 space-y-2.5 text-sm">
        {rows.map((r, i) => (
          <li key={r.objectId}>
            <button type="button" onClick={() => onSelectObject(r.objectName)} className="flex w-full items-center justify-between text-left hover:text-primary">
              <span className="text-ink-secondary">
                {i + 1}. {r.objectName}
              </span>
              <span className="font-semibold tabular text-ink">{formatCurrency(r.profit)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TopMaterialsCard({ rows, materials }: { rows: ReturnType<typeof buildStockRows>; materials: Material[] }) {
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold text-ink">Топ материалов</h2>
      <ul className="mt-3.5 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2.5">
            <MaterialThumbnail
              src={materials.find((m) => m.id === r.id)?.imageUrl ?? ""}
              alt={r.materialName}
              className="h-8 w-8 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.materialName}</span>
            <span className="shrink-0 text-xs font-semibold tabular text-ink-secondary">{formatCompact(r.price * r.quantity)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TopWorksCard({ rows }: { rows: ReturnType<typeof computeProgressByObject> }) {
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold text-ink">Прогресс по объектам</h2>
      <ul className="mt-3.5 space-y-2.5 text-sm">
        {rows.slice(0, 5).map((r) => (
          <li key={r.objectName} className="flex items-center justify-between">
            <span className="text-ink-secondary">{r.objectName}</span>
            <span className="font-semibold tabular text-ink">{r.averageProgress}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function TopBrigadesCard({ rows }: { rows: ReturnType<typeof computeBrigadeActivity> }) {
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold text-ink">Топ бригад по эффективности</h2>
      <ul className="mt-3.5 space-y-2.5 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between">
            <span className="text-ink-secondary">{r.name}</span>
            <span className="font-semibold tabular text-ink">{r.efficiency}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function UpcomingPaymentsCard({ rows }: { rows: ReturnType<typeof getUpcomingPayments> }) {
  return (
    <Card className="p-5">
      <h2 className="text-[15px] font-bold text-ink">Ближайшие выплаты</h2>
      <ul className="mt-3.5 space-y-2.5 text-sm">
        {rows.length > 0 ? (
          rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between">
              <span className="text-ink-secondary">{r.employeeName}</span>
              <span className="font-semibold tabular text-ink">{formatDateShort(r.paymentDate!)}</span>
            </li>
          ))
        ) : (
          <p className="text-sm text-ink-muted">Нет запланированных выплат</p>
        )}
      </ul>
    </Card>
  );
}
