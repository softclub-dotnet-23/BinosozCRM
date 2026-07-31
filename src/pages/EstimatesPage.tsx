import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  MoreVertical,
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
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Drawer } from "../components/ui/Drawer";
import { GroupedMoneyChart } from "../components/charts/GroupedMoneyChart";
import { DonutChart } from "../components/charts/DonutChart";
import { CategoryLegend } from "../components/charts/CategoryLegend";
import { EstimateAddModal } from "../components/estimates/EstimateAddModal";
import {
  ESTIMATE_OBJECT_META,
  estimateBudgetDynamics,
  estimateCategorySpend,
  estimateKpis,
} from "../data/mockEstimates";
import { estimatesRepository } from "../data/repositories";
import { useRepositoryState } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { useToast } from "../hooks/useToast";
import { useLanguage } from "../context/LanguageContext";
import { formatCurrency, formatMillionsCompact, formatNumber } from "../utils/format";
import { formatDateShort } from "../utils/date";
import { ESTIMATE_STATUS_CONFIG } from "../utils/financeStatus";
import type { Estimate, EstimateStatus } from "../types";

type PeriodKey = "week" | "month" | "quarter" | "year";

const PERIOD_SCALE: Record<PeriodKey, number> = { week: 0.25, month: 1, quarter: 3, year: 12 };

export default function EstimatesPage() {
  const { showToast } = useToast();
  const { strings } = useLanguage();
  const s = strings.estimates;
  const c = strings.common;

  const PERIOD_TABS: { key: PeriodKey; label: string }[] = [
    { key: "week", label: c.periodWeek },
    { key: "month", label: c.periodMonth },
    { key: "quarter", label: c.periodQuarter },
    { key: "year", label: c.periodYear },
  ];

  const STATUS_OPTIONS: { value: EstimateStatus | "all"; label: string }[] = [
    { value: "all", label: s.statusAllLabel },
    { value: "draft", label: s.statusDraft },
    { value: "pending_review", label: s.statusPendingReview },
    { value: "approved", label: s.statusApproved },
  ];

  const ESTIMATE_STATUS_LABEL: Record<EstimateStatus, string> = {
    draft: s.statusDraft,
    pending_review: s.statusPendingReview,
    approved: s.statusApproved,
  };

  const [estimates, setEstimates] = useRepositoryState(estimatesRepository);
  const [selectedId, setSelectedId] = useState<string>(() => estimatesRepository.getSnapshot()[0]?.id ?? "");
  const [search, setSearch] = usePersistentState("filters.estimates.search", "");
  const [objectFilter, setObjectFilter] = usePersistentState("filters.estimates.object", "all");
  const [statusFilter, setStatusFilter] = usePersistentState<EstimateStatus | "all">("filters.estimates.status", "all");
  const [responsibleFilter, setResponsibleFilter] = usePersistentState("filters.estimates.responsible", "");
  const [minAmount, setMinAmount] = usePersistentState("filters.estimates.minAmount", "");
  const [maxAmount, setMaxAmount] = usePersistentState("filters.estimates.maxAmount", "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
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

  const chartData = useMemo(() => {
    const scale = PERIOD_SCALE[period];
    return estimateBudgetDynamics.map((row) => ({
      objectName: row.objectName,
      planned: Math.round((row.planned * scale) / 1000) * 1000,
      spent: Math.round((row.spent * scale) / 1000) * 1000,
    }));
  }, [period]);

  const translatedCategorySpend = useMemo(
    () => estimateCategorySpend.map((entry) => ({ ...entry, category: s.categoryLabels[entry.category] ?? entry.category })),
    [s],
  );

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
    showToast(s.toastCreated);
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setEstimates((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    if (selectedId === deleteTarget.id) {
      setSelectedId((prev) => estimates.find((e) => e.id !== prev)?.id ?? "");
    }
    showToast(s.toastDeleted, "info");
    setDeleteTarget(null);
  }

  const columns: DataTableColumn<Estimate>[] = [
    {
      key: "number",
      header: s.colNumber,
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
      header: c.colObject,
      width: "17%",
      render: (row) => <span className="line-clamp-2 min-w-0 text-ink leading-snug">{row.objectName}</span>,
    },
    {
      key: "date",
      header: c.colDate,
      width: "9%",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{formatDateShort(row.date)}</span>,
    },
    {
      key: "version",
      header: s.colVersion,
      width: "6%",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.version}</span>,
    },
    {
      key: "amount",
      header: s.colAmount,
      width: "13%",
      render: (row) => <span className="whitespace-nowrap tabular text-ink">{formatNumber(row.amount)}</span>,
    },
    {
      key: "status",
      header: c.colStatus,
      width: "16%",
      render: (row) => {
        const config = ESTIMATE_STATUS_CONFIG[row.status];
        return <Badge tone={config.tone}>{ESTIMATE_STATUS_LABEL[row.status]}</Badge>;
      },
    },
    {
      key: "responsible",
      header: s.colResponsible,
      width: "16%",
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="font-medium text-ink">{row.responsible}</p>
          <p className="text-xs text-ink-muted">{row.responsibleRole === "Прораб" ? c.roleLabels.prorab : row.responsibleRole}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: c.tableActions,
      width: "8%",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            trigger={<MoreVertical size={16} />}
            items={[
              { label: c.view, icon: <Eye size={14} />, onClick: () => setSelectedId(row.id) },
              {
                label: c.edit,
                icon: <Pencil size={14} />,
                onClick: () => showToast(c.editUnavailableInDemo, "info"),
              },
              { label: c.delete, icon: <Trash2 size={14} />, onClick: () => setDeleteTarget(row), danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title={s.pageTitle}
      subtitle={s.pageSubtitle}
      search={{ value: search, onChange: handleSearchChange, placeholder: s.searchPlaceholder }}
      action={
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus size={15} /> {s.newEstimateButton}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={s.kpiTotal}
          value={String(estimateKpis.total)}
          icon={Building2}
          tone="orange"
          footer={<>{s.kpiTotalOfPrefix} <span className="font-semibold text-ink">{formatCurrency(estimateKpis.totalAmount)}</span></>}
        />
        <MetricCard
          label={s.kpiApproved}
          value={String(estimateKpis.approved)}
          icon={CheckCircle2}
          tone="green"
          footer={<>{s.kpiTotalOfPrefix} <span className="font-semibold text-ink">{formatCurrency(estimateKpis.approvedAmount)}</span></>}
        />
        <MetricCard
          label={s.kpiPendingReview}
          value={String(estimateKpis.pendingReview)}
          icon={Clock}
          tone="orange"
          footer={<>{s.kpiTotalOfPrefix} <span className="font-semibold text-ink">{formatCurrency(estimateKpis.pendingReviewAmount)}</span></>}
        />
        <MetricCard
          label={s.kpiDraft}
          value={String(estimateKpis.draft)}
          icon={FileText}
          tone="blue"
          footer={<>{s.kpiTotalOfPrefix} <span className="font-semibold text-ink">{formatCurrency(estimateKpis.draftAmount)}</span></>}
        />
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-4">
        <Card>
          <div className="flex flex-wrap items-center gap-2 px-5 pt-5 sm:px-6">
            <CustomSelect
              searchable
              size="sm"
              aria-label={s.filterObjectAriaLabel}
              value={objectFilter}
              onValueChange={(v) => {
                setObjectFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: s.allObjectsOption },
                ...Object.keys(ESTIMATE_OBJECT_META).map((name) => ({ value: name, label: name })),
              ]}
            />

            <CustomSelect
              size="sm"
              aria-label={s.filterStatusAriaLabel}
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as EstimateStatus | "all");
                setPage(1);
              }}
              options={STATUS_OPTIONS}
            />

            <button
              type="button"
              onClick={() => {
                setObjectFilter("all");
                setStatusFilter("all");
                setResponsibleFilter("");
                setMinAmount("");
                setMaxAmount("");
              }}
              className="flex h-9 items-center gap-2 rounded-[10px] border border-border-strong px-3 text-sm text-ink-secondary transition-colors hover:bg-surface-3"
            >
              <RotateCcw size={13} /> 01.07.2026 – 30.07.2026
            </button>

            <button
              type="button"
              aria-label={c.filtersButton}
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border-strong text-ink-secondary transition-colors hover:bg-surface-3"
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
                title={s.emptyTitle}
                description={c.emptyStateHint}
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
                    {c.resetFiltersButton}
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
            itemLabel={s.paginationItemLabel}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card className="min-w-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">{s.budgetChartTitle}</h2>
              <div className="flex items-center gap-1 rounded-lg bg-surface-3 p-1">
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
            <div className="mt-3">
              <GroupedMoneyChart
                data={chartData}
                categoryKey="objectName"
                series={[
                  { key: "planned", label: c.seriesPlanned, color: "#2869C9" },
                  { key: "spent", label: c.seriesSpent, color: "#FF6B00" },
                ]}
                valueFormatter={formatMillionsCompact}
                height={320}
                maxBarSize={28}
              />
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-ink">{s.categorySpendTitle}</h2>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-6">
              <DonutChart
                data={translatedCategorySpend}
                centerLabel={s.categorySpendCenterLabel}
                centerValue={formatCurrency(estimateKpis.approvedAmount)}
              />
              <CategoryLegend data={translatedCategorySpend} secondaryOrder="amount-first" />
            </div>
          </Card>
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={c.filtersButton}
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
              {c.resetButton}
            </Button>
            <Button className="flex-1" onClick={() => setDrawerOpen(false)}>
              {c.applyButton}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <label className="block text-sm font-medium text-ink">
            {s.colResponsible}
            <input
              type="text"
              value={responsibleFilter}
              onChange={(e) => setResponsibleFilter(e.target.value)}
              placeholder={s.filterResponsiblePlaceholder}
              className="mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-ink">
              {s.filterMinAmount}
              <input
                type="number"
                min={0}
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              {s.filterMaxAmount}
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
        title={s.deleteConfirmTitle}
        description={deleteTarget ? s.deleteConfirmDescription(deleteTarget.number) : undefined}
        confirmLabel={c.delete}
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}
