import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Filter, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { ObjectImage } from "../components/ui/ObjectImage";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { RiskList } from "../components/tables/RiskList";
import { GroupedMoneyChart } from "../components/charts/GroupedMoneyChart";
import { DonutChart } from "../components/charts/DonutChart";
import { CategoryLegend } from "../components/charts/CategoryLegend";
import { BudgetSummary } from "../components/budgets/BudgetSummary";
import { BudgetAddModal } from "../components/budgets/BudgetAddModal";
import { mockBudgetLines, budgetKpis, budgetCategorySpend, budgetOperations, budgetRiskItems } from "../data/mockBudgets";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatMillionsCompact } from "../utils/format";
import { formatDateShort } from "../utils/date";
import { BUDGET_STATUS_CONFIG, getBudgetProgressTone } from "../utils/financeStatus";
import { cn } from "../utils/cn";
import type { BudgetLine } from "../types";

type TabKey = "all" | "active" | "completed" | "over_budget";

const OBJECT_TYPE_PREFIX_ABBR: Partial<Record<BudgetLine["objectType"], string>> = {
  residential: "ЖК",
  business: "БЦ",
};

const OBJECT_TYPE_SHORT_LABEL: Partial<Record<BudgetLine["objectType"], string>> = {
  cottage: "Коттедж",
  warehouse: "Склад",
  clinic: "Клиника",
};

function shortenObjectLabel(name: string, objectType: BudgetLine["objectType"]): string {
  const quoted = name.match(/«[^»]*»/)?.[0];
  const prefixAbbr = OBJECT_TYPE_PREFIX_ABBR[objectType];
  if (quoted && prefixAbbr) return `${prefixAbbr} ${quoted}`;

  const schoolMatch = name.match(/школы?\s*№\s*(\d+)/i);
  if (schoolMatch) return `Школа №${schoolMatch[1]}`;

  return OBJECT_TYPE_SHORT_LABEL[objectType] ?? quoted?.replace(/[«»]/g, "") ?? name;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "completed", label: "Завершённые" },
  { key: "over_budget", label: "С превышением" },
];

function matchesTab(status: BudgetLine["status"], tab: TabKey): boolean {
  if (tab === "all") return true;
  if (tab === "completed") return status === "completed";
  if (tab === "over_budget") return status === "over_budget";
  return status === "in_progress" || status === "pending_approval" || status === "draft";
}

export default function BudgetsPage() {
  const { showToast } = useToast();

  const [budgets, setBudgets] = useState<BudgetLine[]>(mockBudgetLines);
  const [selectedId, setSelectedId] = useState<string>(mockBudgetLines[0].id);
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BudgetLine | null>(null);

  const filteredBudgets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return budgets.filter((b) => {
      if (!matchesTab(b.status, tab)) return false;
      if (query && !`${b.objectName} ${b.responsible}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [budgets, tab, search]);

  const pageCount = Math.max(1, Math.ceil(filteredBudgets.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredBudgets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedBudget = budgets.find((b) => b.id === selectedId) ?? budgets[0];

  const chartData = useMemo(() => {
    const scale = { week: 0.25, month: 1, quarter: 3, year: 12 }[period];
    return budgets.slice(0, 6).map((b) => ({
      objectName: shortenObjectLabel(b.objectName, b.objectType),
      fullName: b.objectName,
      total: Math.round((b.totalBudget * scale) / 1000) * 1000,
      spent: Math.round((b.spent * scale) / 1000) * 1000,
      remaining: Math.round((Math.max(0, b.totalBudget - b.spent) * scale) / 1000) * 1000,
    }));
  }, [budgets, period]);

  function handleTabChange(nextTab: TabKey) {
    setTab(nextTab);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleCreateBudget(budget: BudgetLine) {
    setBudgets((prev) => [budget, ...prev]);
    setSelectedId(budget.id);
    setAddModalOpen(false);
    showToast("Бюджет добавлен");
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setBudgets((prev) => prev.filter((b) => b.id !== deleteTarget.id));
    if (selectedId === deleteTarget.id) {
      setSelectedId((prev) => budgets.find((b) => b.id !== prev)?.id ?? "");
    }
    showToast("Бюджет удалён", "info");
    setDeleteTarget(null);
  }

  const columns: DataTableColumn<BudgetLine>[] = [
    {
      key: "object",
      header: "Объект",
      width: "19%",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-11 shrink-0 overflow-hidden rounded-lg border border-border">
            <ObjectImage src={row.imageUrl} type={row.objectType} alt={row.objectName} />
          </div>
          <span className="line-clamp-2 min-w-0 text-[13px] font-semibold leading-snug text-ink">{row.objectName}</span>
        </div>
      ),
    },
    {
      key: "totalBudget",
      header: "Бюджет",
      width: "10%",
      render: (row) => (
        <span className="whitespace-nowrap tabular text-ink">{formatCurrency(row.totalBudget).replace(" сомони", " с.")}</span>
      ),
    },
    {
      key: "spent",
      header: "Потрачено",
      width: "10%",
      render: (row) => (
        <span className="whitespace-nowrap tabular text-ink">{formatCurrency(row.spent).replace(" сомони", " с.")}</span>
      ),
    },
    {
      key: "remaining",
      header: "Остаток",
      width: "10%",
      render: (row) => {
        const remaining = row.totalBudget - row.spent;
        return (
          <span className="whitespace-nowrap tabular text-ink">
            {remaining >= 0 ? formatCurrency(remaining).replace(" сомони", " с.") : "-"}
          </span>
        );
      },
    },
    {
      key: "usage",
      header: "Использование",
      width: "13%",
      render: (row) => {
        const usagePercent = Math.round((row.spent / row.totalBudget) * 100);
        return (
          <div className="flex items-center gap-2">
            <ProgressBar
              value={Math.min(100, usagePercent)}
              tone={getBudgetProgressTone(row.status, usagePercent)}
              className="w-12 shrink-0"
            />
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-ink">{usagePercent}%</span>
          </div>
        );
      },
    },
    {
      key: "overspend",
      header: "Превышение",
      width: "10%",
      render: (row) => {
        const overspend = Math.max(0, row.spent - row.totalBudget);
        return (
          <span className={cn("whitespace-nowrap tabular", overspend > 0 ? "font-semibold text-red" : "text-ink")}>
            {overspend > 0 ? formatCurrency(overspend).replace(" сомони", " с.") : "0 с."}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Статус",
      width: "17%",
      render: (row) => {
        const config = BUDGET_STATUS_CONFIG[row.status];
        return <Badge tone={config.tone}>{config.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Действия",
      width: "11%",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Просмотреть бюджет"
            onClick={() => setSelectedId(row.id)}
            className="rounded-lg p-1.5 text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink"
          >
            <Eye size={16} />
          </button>
          <DropdownMenu
            trigger={<span className="text-lg leading-none">⋯</span>}
            items={[
              { label: "Просмотр", icon: <Eye size={14} />, onClick: () => setSelectedId(row.id) },
              {
                label: "Редактировать",
                icon: <Pencil size={14} />,
                onClick: () => showToast("Редактирование пока недоступно в демо", "info"),
              },
              { label: "Удалить", icon: <Trash2 size={14} />, onClick: () => setDeleteTarget(row), danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Бюджеты"
      subtitle="Планирование, контроль и анализ бюджетов по объектам"
      search={{ value: search, onChange: handleSearchChange, placeholder: "Поиск бюджетов, объектов..." }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Общий бюджет"
          value={formatCurrency(budgetKpis.totalBudget)}
          icon={Wallet}
          tone="orange"
          footer="По всем активным объектам"
        />
        <MetricCard
          label="Утверждённые бюджеты"
          value={formatCurrency(budgetKpis.approvedBudget)}
          icon={CheckCircle2}
          tone="green"
          footer={`${budgetKpis.approvedPercent}% от общего бюджета`}
        />
        <MetricCard
          label="Фактические расходы"
          value={formatCurrency(budgetKpis.actualSpent)}
          icon={Wallet}
          tone="blue"
          footer={`${budgetKpis.actualSpentPercent}% бюджета использовано`}
        />
        <MetricCard
          label="Превышение бюджета"
          value={formatCurrency(budgetKpis.overBudgetAmount)}
          icon={AlertTriangle}
          tone="red"
          footer={<span className="text-red">{budgetKpis.overBudgetObjectCount} объекта с превышением</span>}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.85fr_1fr]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-[17px] font-bold text-ink">Бюджеты по объектам</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter size={14} /> Фильтры
              </Button>
              <Button size="sm" onClick={() => setAddModalOpen(true)}>
                <Plus size={14} /> Добавить бюджет
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 px-5 sm:px-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTabChange(t.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  tab === t.key ? "bg-primary text-white" : "bg-[#F5F5F4] text-ink-secondary hover:bg-[#ECECEB]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {pageRows.length > 0 ? (
              <DataTable
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.id}
                selectedRowKey={selectedId}
                onRowClick={(row) => setSelectedId(row.id)}
              />
            ) : (
              <EmptyState
                icon={Wallet}
                title="Бюджеты не найдены"
                description="Измените параметры поиска или сбросьте фильтры"
                action={
                  <Button variant="outline" size="sm" onClick={() => { setSearch(""); setTab("all"); }}>
                    Сбросить фильтры
                  </Button>
                }
              />
            )}
          </div>

          <Pagination
            page={currentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            total={filteredBudgets.length}
            itemLabel="бюджетов"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </Card>

        <div className="flex flex-col gap-4">
          {selectedBudget && (
            <BudgetSummary budget={selectedBudget} onEdit={() => showToast("Редактирование пока недоступно в демо", "info")} />
          )}
        </div>
      </div>

      {/* Analytics: row 1 — budget dynamics (~63%) + budget distribution (~37%) */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr] lg:items-stretch">
        <Card className="flex min-w-0 flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold text-ink">Динамика бюджета</h2>
            <div className="flex items-center gap-1 rounded-lg bg-[#F5F5F4] p-1">
              {(
                [
                  { key: "week", label: "Неделя" },
                  { key: "month", label: "Месяц" },
                  { key: "quarter", label: "Квартал" },
                  { key: "year", label: "Год" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPeriod(opt.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    period === opt.key ? "bg-card text-primary shadow-sm" : "text-ink-secondary hover:text-ink"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex-1">
            <GroupedMoneyChart
              data={chartData}
              categoryKey="objectName"
              tooltipLabelKey="fullName"
              series={[
                { key: "total", label: "Общий бюджет", color: "#2869C9" },
                { key: "spent", label: "Потрачено", color: "#FF6B00" },
                { key: "remaining", label: "Остаток бюджета", color: "#22A447" },
              ]}
              valueFormatter={formatMillionsCompact}
              maxBarSize={18}
              height={296}
            />
          </div>
        </Card>

        <Card className="flex flex-col p-5 sm:p-6">
          <h2 className="text-[17px] font-bold text-ink">Распределение бюджета</h2>
          <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-6 sm:flex-row">
            <DonutChart
              data={budgetCategorySpend}
              centerLabel="Всего бюджет"
              centerValue={formatCurrency(budgetKpis.totalBudget)}
              size={192}
            />
            <CategoryLegend data={budgetCategorySpend} secondaryOrder="percent-first" unitSuffix=" с." />
          </div>
        </Card>
      </div>

      {/* Analytics: row 2 — recent operations (~67%) + at-risk budgets (~33%) */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr] lg:items-stretch">
        <Card className="flex min-w-0 flex-col">
          <div className="px-5 pt-5 sm:px-6">
            <h2 className="text-[17px] font-bold text-ink">Последние операции по бюджетам</h2>
          </div>
          <div className="mt-3 flex-1 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-ink-secondary">
                  <th className="px-5 py-2.5 font-medium sm:px-6">Дата</th>
                  <th className="px-3 py-2.5 font-medium">Объект</th>
                  <th className="px-3 py-2.5 font-medium">Действие</th>
                  <th className="px-3 py-2.5 font-medium">Сумма, сомони</th>
                  <th className="px-3 py-2.5 pr-5 font-medium sm:pr-6">Ответственный</th>
                </tr>
              </thead>
              <tbody>
                {budgetOperations.map((op) => (
                  <tr key={op.id} className="border-b border-border last:border-0 hover:bg-[#FAFAF9]">
                    <td className="whitespace-nowrap px-5 py-3 text-ink-secondary sm:px-6">{formatDateShort(op.date)}</td>
                    <td className="px-3 py-3 font-medium text-ink">{op.objectName}</td>
                    <td className="px-3 py-3 text-ink-secondary">{op.action}</td>
                    <td className={`whitespace-nowrap px-3 py-3 tabular ${op.amount && op.amount < 0 ? "font-semibold text-red" : "text-ink-muted"}`}>
                      {op.amount !== null ? formatCurrency(op.amount).replace(" сомони", "") : "—"}
                    </td>
                    <td className="px-3 py-3 pr-5 text-ink-secondary sm:pr-6">{op.responsible}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 sm:px-6">
            <button type="button" className="text-sm font-semibold text-primary hover:text-primary-hover">
              Все операции →
            </button>
          </div>
        </Card>

        <Card className="flex flex-col p-5 sm:p-6">
          <h2 className="text-[17px] font-bold text-ink">Бюджеты с превышением</h2>
          <div className="mt-2 flex-1">
            <RiskList items={budgetRiskItems} onOpen={(item) => showToast(`Открыт бюджет: ${item.title}`, "info")} />
          </div>
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
          >
            Все бюджеты с рисками →
          </button>
        </Card>
      </div>

      <BudgetAddModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onCreate={handleCreateBudget} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить бюджет?"
        description={deleteTarget ? `Бюджет объекта «${deleteTarget.objectName}» будет удалён.` : undefined}
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}
