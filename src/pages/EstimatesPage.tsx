import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Drawer } from "../components/ui/Drawer";
import { RiskList } from "../components/tables/RiskList";
import { GroupedMoneyChart } from "../components/charts/GroupedMoneyChart";
import { DonutChart } from "../components/charts/DonutChart";
import { CategoryLegend } from "../components/charts/CategoryLegend";
import { EstimateSummary } from "../components/estimates/EstimateSummary";
import { EstimateAddModal } from "../components/estimates/EstimateAddModal";
import {
  ESTIMATE_OBJECT_META,
  estimateBudgetDynamics,
  estimateCategorySpend,
  estimateKpis,
  estimateRiskItems,
  mockEstimates,
} from "../data/mockEstimates";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatMillionsCompact, formatNumber } from "../utils/format";
import { formatDateShort } from "../utils/date";
import { ESTIMATE_STATUS_CONFIG } from "../utils/financeStatus";
import type { Estimate, EstimateStatus } from "../types";

type PeriodKey = "week" | "month" | "quarter" | "year";

const PERIOD_TABS: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "quarter", label: "Квартал" },
  { key: "year", label: "Год" },
];

const PERIOD_SCALE: Record<PeriodKey, number> = { week: 0.25, month: 1, quarter: 3, year: 12 };

const STATUS_OPTIONS: { value: EstimateStatus | "all"; label: string }[] = [
  { value: "all", label: "Статус: Все" },
  { value: "draft", label: "Черновик" },
  { value: "pending_review", label: "На рассмотрении" },
  { value: "approved", label: "Утверждена" },
];

export default function EstimatesPage() {
  const { showToast } = useToast();

  const [estimates, setEstimates] = useState<Estimate[]>(mockEstimates);
  const [selectedId, setSelectedId] = useState<string>(mockEstimates[0].id);
  const [search, setSearch] = useState("");
  const [objectFilter, setObjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">("all");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [period, setPeriod] = useState<PeriodKey>("month");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Estimate | null>(null);

  const filteredEstimates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return estimates.filter((e) => {
      if (query) {
        const haystack = `${e.number} ${e.objectName} ${e.responsible}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (objectFilter !== "all" && e.objectName !== objectFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (responsibleFilter && !e.responsible.toLowerCase().includes(responsibleFilter.toLowerCase())) return false;
      if (minAmount && e.amount < Number(minAmount)) return false;
      if (maxAmount && e.amount > Number(maxAmount)) return false;
      return true;
    });
  }, [estimates, search, objectFilter, statusFilter, responsibleFilter, minAmount, maxAmount]);

  const pageCount = Math.max(1, Math.ceil(filteredEstimates.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredEstimates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedEstimate = estimates.find((e) => e.id === selectedId) ?? estimates[0];

  const chartData = useMemo(() => {
    const scale = PERIOD_SCALE[period];
    return estimateBudgetDynamics.map((row) => ({
      objectName: row.objectName,
      planned: Math.round((row.planned * scale) / 1000) * 1000,
      spent: Math.round((row.spent * scale) / 1000) * 1000,
    }));
  }, [period]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function nextEstimateNumber(): string {
    const max = estimates.reduce((acc, e) => {
      const n = Number(e.number.split("-").pop());
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 0);
    return `CM-2026-${String(max + 1).padStart(3, "0")}`;
  }

  function handleCreateEstimate(estimate: Estimate) {
    setEstimates((prev) => [estimate, ...prev]);
    setSelectedId(estimate.id);
    setAddModalOpen(false);
    showToast("Смета создана");
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setEstimates((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    if (selectedId === deleteTarget.id) {
      setSelectedId((prev) => estimates.find((e) => e.id !== prev)?.id ?? "");
    }
    showToast("Смета удалена", "info");
    setDeleteTarget(null);
  }

  const columns: DataTableColumn<Estimate>[] = [
    {
      key: "number",
      header: "№ сметы",
      width: "15%",
      render: (row) => (
        <span className="flex items-center gap-1.5 whitespace-nowrap font-semibold text-ink">
          <FileText size={14} className="shrink-0 text-ink-muted" />
          {row.number}
        </span>
      ),
    },
    {
      key: "object",
      header: "Объект",
      width: "17%",
      render: (row) => <span className="line-clamp-2 min-w-0 text-ink leading-snug">{row.objectName}</span>,
    },
    {
      key: "date",
      header: "Дата",
      width: "9%",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{formatDateShort(row.date)}</span>,
    },
    {
      key: "version",
      header: "Версия",
      width: "6%",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.version}</span>,
    },
    {
      key: "amount",
      header: "Сумма, сомони",
      width: "13%",
      render: (row) => <span className="whitespace-nowrap tabular text-ink">{formatNumber(row.amount)}</span>,
    },
    {
      key: "status",
      header: "Статус",
      width: "16%",
      render: (row) => {
        const config = ESTIMATE_STATUS_CONFIG[row.status];
        return <Badge tone={config.tone}>{config.label}</Badge>;
      },
    },
    {
      key: "responsible",
      header: "Ответственный",
      width: "16%",
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="font-medium text-ink">{row.responsible}</p>
          <p className="text-xs text-ink-muted">{row.responsibleRole}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Действия",
      width: "8%",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Просмотреть смету"
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
      title="Сметы"
      subtitle="Управление сметами по объектам"
      search={{ value: search, onChange: handleSearchChange, placeholder: "Поиск смет..." }}
      action={
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus size={15} /> Новая смета
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Всего смет"
          value={String(estimateKpis.total)}
          icon={Building2}
          tone="orange"
          footer={<>На сумму <span className="font-semibold text-ink">{formatCurrency(estimateKpis.totalAmount)}</span></>}
        />
        <MetricCard
          label="Утверждённые"
          value={String(estimateKpis.approved)}
          icon={CheckCircle2}
          tone="green"
          footer={<>На сумму <span className="font-semibold text-ink">{formatCurrency(estimateKpis.approvedAmount)}</span></>}
        />
        <MetricCard
          label="На рассмотрении"
          value={String(estimateKpis.pendingReview)}
          icon={Clock}
          tone="orange"
          footer={<>На сумму <span className="font-semibold text-ink">{formatCurrency(estimateKpis.pendingReviewAmount)}</span></>}
        />
        <MetricCard
          label="Черновики"
          value={String(estimateKpis.draft)}
          icon={FileText}
          tone="blue"
          footer={<>На сумму <span className="font-semibold text-ink">{formatCurrency(estimateKpis.draftAmount)}</span></>}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.85fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <div className="flex flex-wrap items-center gap-2 px-5 pt-5 sm:px-6">
              <select
                value={objectFilter}
                onChange={(e) => {
                  setObjectFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-[10px] border border-border-strong px-3 text-sm text-ink focus:border-primary focus:outline-none"
              >
                <option value="all">Все объекты</option>
                {Object.keys(ESTIMATE_OBJECT_META).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as EstimateStatus | "all");
                  setPage(1);
                }}
                className="h-9 rounded-[10px] border border-border-strong px-3 text-sm text-ink focus:border-primary focus:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setObjectFilter("all");
                  setStatusFilter("all");
                  setResponsibleFilter("");
                  setMinAmount("");
                  setMaxAmount("");
                }}
                className="flex h-9 items-center gap-2 rounded-[10px] border border-border-strong px-3 text-sm text-ink-secondary transition-colors hover:bg-[#F5F5F4]"
              >
                <RotateCcw size={13} /> 01.07.2026 – 30.07.2026
              </button>

              <button
                type="button"
                aria-label="Фильтры"
                onClick={() => setDrawerOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4]"
              >
                <Filter size={15} />
              </button>
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
                  icon={FileText}
                  title="Сметы не найдены"
                  description="Измените параметры поиска или сбросьте фильтры"
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setObjectFilter("all");
                        setStatusFilter("all");
                        setSearch("");
                      }}
                    >
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
              total={filteredEstimates.length}
              itemLabel="смет"
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className="min-w-0 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[17px] font-bold text-ink">Бюджет и фактические расходы</h2>
                <div className="flex items-center gap-1 rounded-lg bg-[#F5F5F4] p-1">
                  {PERIOD_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPeriod(tab.key)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        period === tab.key ? "bg-card text-primary shadow-sm" : "text-ink-secondary hover:text-ink"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2">
                <GroupedMoneyChart
                  data={chartData}
                  categoryKey="objectName"
                  series={[
                    { key: "planned", label: "Запланировано", color: "#2869C9" },
                    { key: "spent", label: "Потрачено", color: "#FF6B00" },
                  ]}
                  valueFormatter={formatMillionsCompact}
                  maxBarSize={20}
                />
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="text-[17px] font-bold text-ink">Расходы по категориям</h2>
              <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <DonutChart
                  data={estimateCategorySpend}
                  centerLabel="Всего расходов"
                  centerValue={formatCurrency(estimateKpis.approvedAmount)}
                />
                <CategoryLegend data={estimateCategorySpend} secondaryOrder="amount-first" />
              </div>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {selectedEstimate && (
            <EstimateSummary estimate={selectedEstimate} onOpen={() => showToast("Открытие детальной страницы сметы пока недоступно в демо", "info")} />
          )}

          <Card className="p-5 sm:p-6">
            <h2 className="text-[17px] font-bold text-ink">Сметы, требующие внимания</h2>
            <div className="mt-2">
              <RiskList items={estimateRiskItems} onOpen={(item) => showToast(`Открыта смета: ${item.title}`, "info")} />
            </div>
            <button
              type="button"
              className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Все сметы с рисками →
            </button>
          </Card>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Фильтры"
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setResponsibleFilter("");
                setMinAmount("");
                setMaxAmount("");
              }}
            >
              Сбросить
            </Button>
            <Button className="flex-1" onClick={() => setDrawerOpen(false)}>
              Применить
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <label className="block text-sm font-medium text-ink">
            Ответственный
            <input
              type="text"
              value={responsibleFilter}
              onChange={(e) => setResponsibleFilter(e.target.value)}
              placeholder="Имя прораба"
              className="mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-ink">
              Мин. сумма
              <input
                type="number"
                min={0}
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Макс. сумма
              <input
                type="number"
                min={0}
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>
        </div>
      </Drawer>

      <EstimateAddModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreate={handleCreateEstimate}
        nextNumber={nextEstimateNumber()}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить смету?"
        description={deleteTarget ? `Смета «${deleteTarget.number}» будет удалена.` : undefined}
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}
