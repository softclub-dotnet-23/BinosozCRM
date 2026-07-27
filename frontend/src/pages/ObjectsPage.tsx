import { useMemo, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, Eye, Filter, Flag, Pencil, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { ObjectImage } from "../components/ui/ObjectImage";
import { Avatar } from "../components/ui/Avatar";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { FilterDrawer } from "../components/objects/FilterDrawer";
import { AddObjectModal } from "../components/objects/AddObjectModal";
import { ObjectSummary } from "../components/objects/ObjectSummary";
import { TaskList } from "../components/objects/TaskList";
import { ProgressChart } from "../components/charts/ProgressChart";
import { ObjectBudgetChart } from "../components/charts/ObjectBudgetChart";
import { mockUpcomingTasks } from "../data/mockTasks";
import { objectProgressSeries } from "../data/mockDashboard";
import { objectsRepository } from "../data/repositories";
import { useRepositoryState } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { useToast } from "../hooks/useToast";
import { formatCurrency } from "../utils/format";
import { formatDateRu } from "../utils/date";
import { getProgressTone } from "../utils/progress";
import type { ConstructionObject, ObjectFilters, ObjectStatus } from "../types";

type TabKey = "all" | "active" | "at_risk" | "completed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "at_risk", label: "С риском" },
  { key: "completed", label: "Завершённые" },
];

const DEFAULT_FILTERS: ObjectFilters = {
  statuses: [],
  city: "",
  foreman: "",
  minProgress: "",
  maxProgress: "",
  startDate: "",
  deadline: "",
  minBudget: "",
  maxBudget: "",
};

function matchesTab(status: ObjectStatus, tab: TabKey): boolean {
  if (tab === "all") return true;
  if (tab === "active") return status === "in_progress" || status === "almost_done";
  if (tab === "at_risk") return status === "at_risk";
  return status === "completed";
}

export default function ObjectsPage() {
  const { showToast } = useToast();

  const [objects, setObjects] = useRepositoryState(objectsRepository);
  const [selectedId, setSelectedId] = useState<string>(() => objectsRepository.getSnapshot()[0]?.id ?? "");
  const [tab, setTab] = usePersistentState<TabKey>("filters.objects.tab", "all");
  const [search, setSearch] = usePersistentState("filters.objects.search", "");
  const [filters, setFilters] = usePersistentState<ObjectFilters>("filters.objects.filters", DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [chartMode, setChartMode] = useState<"progress" | "budget">("progress");
  const [chartPeriod, setChartPeriod] = useState("month");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConstructionObject | null>(null);

  const kpis = useMemo(() => {
    const total = objects.length;
    const inWork = objects.filter((o) => o.status === "in_progress" || o.status === "almost_done").length;
    const completed = objects.filter((o) => o.status === "completed").length;
    const atRisk = objects.filter((o) => o.status === "at_risk").length;
    return { total, inWork, completed, atRisk };
  }, [objects]);

  const filteredObjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return objects.filter((o) => {
      if (!matchesTab(o.status, tab)) return false;
      if (query) {
        const haystack = `${o.name} ${o.city} ${o.foreman}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.statuses.length > 0 && !filters.statuses.includes(o.status)) return false;
      if (filters.city && !o.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.foreman && !o.foreman.toLowerCase().includes(filters.foreman.toLowerCase())) return false;
      if (filters.minProgress && o.progress < Number(filters.minProgress)) return false;
      if (filters.maxProgress && o.progress > Number(filters.maxProgress)) return false;
      if (filters.minBudget && o.budget < Number(filters.minBudget)) return false;
      if (filters.maxBudget && o.budget > Number(filters.maxBudget)) return false;
      if (filters.startDate && o.startDate < filters.startDate) return false;
      if (filters.deadline && o.deadline > filters.deadline) return false;
      return true;
    });
  }, [objects, tab, search, filters]);

  const pageCount = Math.max(1, Math.ceil(filteredObjects.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredObjects.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedObject = objects.find((o) => o.id === selectedId) ?? objects[0];

  const budgetChartData = useMemo(
    () => objects.slice(0, 6).map((o) => ({ objectName: o.name.replace(/«.*»/, "").trim(), budget: o.budget, spent: o.spent })),
    [objects],
  );

  function handleTabChange(nextTab: TabKey) {
    setTab(nextTab);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleCreateObject(object: ConstructionObject) {
    setObjects((prev) => [object, ...prev]);
    setSelectedId(object.id);
    setAddModalOpen(false);
    showToast("Объект успешно добавлен");
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setObjects((prev) => prev.filter((o) => o.id !== deleteTarget.id));
    if (selectedId === deleteTarget.id) {
      setSelectedId((prev) => objects.find((o) => o.id !== prev)?.id ?? "");
    }
    showToast("Объект удалён", "info");
    setDeleteTarget(null);
  }

  const columns: DataTableColumn<ConstructionObject>[] = [
    {
      key: "object",
      header: "Объект",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
            <ObjectImage src={row.imageUrl} type={row.objectType} alt={row.name} />
          </div>
          <span className="font-semibold text-ink">{row.name}</span>
        </div>
      ),
    },
    { key: "city", header: "Локация", render: (row) => <span className="text-ink-secondary">{row.city}</span> },
    {
      key: "foreman",
      header: "Прораб",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.foreman} size="sm" />
          <span className="whitespace-nowrap text-ink-secondary">{row.foreman}</span>
        </div>
      ),
    },
    {
      key: "progress",
      header: "Прогресс",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <ProgressBar value={row.progress} tone={getProgressTone(row.status, row.progress)} className="w-20" />
          <span className="text-xs font-semibold text-ink">{row.progress}%</span>
        </div>
      ),
    },
    {
      key: "budget",
      header: "Бюджет",
      render: (row) => <span className="tabular text-ink">{formatCurrency(row.budget).replace(" сомони", " с.")}</span>,
    },
    { key: "deadline", header: "Срок", render: (row) => <span className="text-ink-secondary">{formatDateRu(row.deadline)}</span> },
    { key: "status", header: "Статус", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-label="Просмотреть объект"
            onClick={() => setSelectedId(row.id)}
            className="rounded-lg p-1.5 text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink"
          >
            <Eye size={16} />
          </button>
          <DropdownMenu
            trigger={<span className="text-lg leading-none">⋯</span>}
            items={[
              { label: "Просмотр", icon: <Eye size={14} />, onClick: () => setSelectedId(row.id) },
              { label: "Редактировать", icon: <Pencil size={14} />, onClick: () => showToast("Редактирование пока недоступно в демо", "info") },
              { label: "Удалить", icon: <Trash2 size={14} />, onClick: () => setDeleteTarget(row), danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Объекты"
      subtitle="Управление строительными объектами и их статусами"
      search={{ value: search, onChange: handleSearchChange, placeholder: "Поиск объектов, локаций, прораба..." }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Всего объектов" value={String(kpis.total)} icon={Building2} tone="orange" footer="Все проекты компании" />
        <MetricCard
          label="В работе"
          value={String(kpis.inWork)}
          icon={CheckCircle2}
          tone="green"
          footer={`${Math.round((kpis.inWork / kpis.total) * 100)}% от общего количества`}
        />
        <MetricCard
          label="Завершены"
          value={String(kpis.completed)}
          icon={Flag}
          tone="blue"
          footer={`${Math.round((kpis.completed / kpis.total) * 100)}% от общего количества`}
        />
        <MetricCard
          label="Есть риск"
          value={String(kpis.atRisk)}
          icon={AlertTriangle}
          tone="red"
          footer={`${Math.round((kpis.atRisk / kpis.total) * 100)}% от общего количества`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
              <h2 className="text-[17px] font-bold text-ink">Список объектов</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                  <Filter size={14} /> Фильтры
                </Button>
                <Button size="sm" onClick={() => setAddModalOpen(true)}>
                  <Plus size={14} /> Добавить объект
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
                  icon={Building2}
                  title="Объекты не найдены"
                  description="Измените параметры поиска или сбросьте фильтры"
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilters(DEFAULT_FILTERS);
                        setSearch("");
                        setTab("all");
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
              total={filteredObjects.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[6, 10, 20, 50]}
            />
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[17px] font-bold text-ink">Динамика по объектам</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-[#F5F5F4] p-1">
                  {(
                    [
                      { key: "progress", label: "Прогресс" },
                      { key: "budget", label: "Бюджет" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setChartMode(opt.key)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        chartMode === opt.key ? "bg-card text-primary shadow-sm" : "text-ink-secondary hover:text-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <CustomSelect
                  size="sm"
                  aria-label="Период"
                  value={chartPeriod}
                  onValueChange={setChartPeriod}
                  options={[
                    { value: "month", label: "Месяц" },
                    { value: "quarter", label: "Квартал" },
                    { value: "year", label: "Год" },
                  ]}
                />
              </div>
            </div>

            <div className="mt-2">
              {chartMode === "progress" ? (
                <ProgressChart data={objectProgressSeries} />
              ) : (
                <ObjectBudgetChart data={budgetChartData} />
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {selectedObject && <ObjectSummary object={selectedObject} />}
          <TaskList tasks={mockUpcomingTasks} />
        </div>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={setFilters}
        onApply={() => setPage(1)}
        onReset={() => {
          setFilters(DEFAULT_FILTERS);
          setPage(1);
        }}
      />

      <AddObjectModal open={addModalOpen} onClose={() => setAddModalOpen(false)} onCreate={handleCreateObject} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить объект?"
        description={deleteTarget ? `«${deleteTarget.name}» будет удалён из списка объектов.` : undefined}
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}
