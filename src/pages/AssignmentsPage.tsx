import { useMemo, useState } from "react";
import { Ban, CheckCircle, CheckCircle2, ClipboardList, Eye, Pencil, Plus, Trash2, Users, XCircle } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/StatusBadge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { ObjectImage } from "../components/ui/ObjectImage";
import { Avatar } from "../components/ui/Avatar";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { AssignmentFormModal } from "../components/assignments/AssignmentFormModal";
import { AssignmentDrawer } from "../components/assignments/AssignmentDrawer";
import { AssignmentCalendar } from "../components/assignments/AssignmentCalendar";
import {
  AssignmentFiltersCard,
  DEFAULT_ASSIGNMENT_FILTERS,
  type AssignmentFiltersState,
} from "../components/assignments/AssignmentFilters";
import { UpcomingAssignments } from "../components/assignments/UpcomingAssignments";
import { assignmentsRepository, brigadesRepository, objectsRepository } from "../data/repositories";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { useToast } from "../hooks/useToast";
import { formatCurrency } from "../utils/format";
import { formatDateShort } from "../utils/date";
import { ASSIGNMENT_STATUS_CONFIG } from "../utils/financeStatus";
import type { Assignment, AssignmentStatus } from "../types";

const TODAY_ISO = "2026-07-17";

const selectClass =
  "h-9 rounded-lg border border-border-strong bg-card px-2.5 text-xs font-medium text-ink focus:border-primary focus:outline-none";

function progressTone(status: AssignmentStatus): "green" | "orange" | "red" {
  if (status === "completed") return "green";
  if (status === "overdue") return "red";
  return "orange";
}

export default function AssignmentsPage() {
  const { showToast } = useToast();

  const [assignments, setAssignments] = useRepositoryState(assignmentsRepository);
  const mockBrigades = useRepositorySnapshot(brigadesRepository);
  const mockObjects = useRepositorySnapshot(objectsRepository);
  const [search, setSearch] = usePersistentState("filters.assignments.search", "");
  const [filters, setFilters] = usePersistentState<AssignmentFiltersState>(
    "filters.assignments.filters",
    DEFAULT_ASSIGNMENT_FILTERS,
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<Assignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);

  const kpis = useMemo(() => {
    const total = assignments.length;
    const active = assignments.filter((a) => a.status === "active").length;
    const completed = assignments.filter((a) => a.status === "completed").length;
    const cancelledOrOverdue = assignments.filter((a) => a.status === "cancelled" || a.status === "overdue").length;
    return { total, active, completed, cancelledOrOverdue };
  }, [assignments]);

  const nextNumber = useMemo(() => assignments.reduce((max, a) => Math.max(max, a.number), 0) + 1, [assignments]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assignments.filter((a) => {
      if (query) {
        const haystack = `${a.objectName} ${a.workTitle} ${a.brigadeName} ${a.foremanName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.status !== "all" && a.status !== filters.status) return false;
      if (filters.objectId !== "all" && a.objectId !== filters.objectId) return false;
      if (filters.brigadeId !== "all" && a.brigadeId !== filters.brigadeId) return false;
      if (filters.foremanName !== "all" && a.foremanName !== filters.foremanName) return false;
      if (filters.dateFrom && a.periodEnd < filters.dateFrom) return false;
      if (filters.dateTo && a.periodStart > filters.dateTo) return false;
      if (selectedDate && (a.periodStart > selectedDate || a.periodEnd < selectedDate)) return false;
      return true;
    });
  }, [assignments, search, filters, selectedDate]);

  const pageCount = Math.max(1, Math.ceil(filteredAssignments.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredAssignments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const upcomingAssignments = useMemo(() => {
    return [...assignments]
      .filter((a) => a.periodStart >= TODAY_ISO && a.status !== "cancelled")
      .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
      .slice(0, 5);
  }, [assignments]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleResetFilters() {
    setFilters(DEFAULT_ASSIGNMENT_FILTERS);
    setSearch("");
    setSelectedDate(null);
    setPage(1);
  }

  function updateFilters(next: AssignmentFiltersState) {
    setFilters(next);
    setPage(1);
  }

  function handleUpdateProgress(id: string, progress: number) {
    const status: AssignmentStatus | undefined = progress >= 100 ? "completed" : undefined;
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, progress, status: status ?? a.status } : a)));
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, progress, status: status ?? prev.status } : prev));
    showToast("Прогресс обновлён");
  }

  function handleComplete(id: string) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "completed", progress: 100 } : a)));
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, status: "completed", progress: 100 } : prev));
    showToast("Назначение завершено");
  }

  function handleCancel(id: string) {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, status: "cancelled" } : prev));
    showToast("Назначение отменено", "info");
  }

  function handleSaveAssignment(assignment: Assignment) {
    const isEdit = Boolean(editTarget);
    setAssignments((prev) => {
      const exists = prev.some((a) => a.id === assignment.id);
      return exists ? prev.map((a) => (a.id === assignment.id ? assignment : a)) : [assignment, ...prev];
    });
    setFormOpen(false);
    setEditTarget(null);
    showToast(isEdit ? "Назначение обновлено" : "Назначение создано");
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setAssignments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    if (drawerTarget?.id === deleteTarget.id) setDrawerTarget(null);
    showToast("Назначение удалено", "info");
    setDeleteTarget(null);
  }

  const columns: DataTableColumn<Assignment>[] = [
    {
      key: "number",
      header: "№",
      className: "sm:!pl-3",
      headerClassName: "sm:!pl-3",
      render: (row) => <span className="text-ink-secondary">{row.number}</span>,
    },
    {
      key: "object",
      header: "Объект / Работа",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-11 shrink-0 overflow-hidden rounded-lg border border-border">
            <ObjectImage src={row.imageUrl} type={row.objectType} alt={row.objectName} />
          </div>
          <div className="min-w-0 max-w-[148px]">
            <p className="truncate text-[13px] font-semibold text-ink">{row.objectName}</p>
            <p className="truncate text-xs text-ink-secondary">{row.workTitle}</p>
          </div>
        </div>
      ),
    },
    {
      key: "brigade",
      header: "Бригада / Прораб",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Avatar name={row.foremanName} size="sm" />
          <div className="min-w-0 max-w-[112px]">
            <p className="truncate text-ink">{row.foremanName}</p>
            <p className="truncate text-xs text-ink-secondary">{row.brigadeName}</p>
          </div>
        </div>
      ),
    },
    {
      key: "period",
      header: "Период",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-ink-secondary">
          {formatDateShort(row.periodStart).slice(0, 5)} – {formatDateShort(row.periodEnd).slice(0, 5)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Сумма, с.",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => <span className="whitespace-nowrap tabular text-ink">{formatCurrency(row.amount).replace(" сомони", " с.")}</span>,
    },
    {
      key: "status",
      header: "Статус / Прогресс",
      className: "px-1.5",
      headerClassName: "px-1.5",
      render: (row) => {
        const config = ASSIGNMENT_STATUS_CONFIG[row.status];
        return (
          <div className="space-y-1.5">
            <Badge tone={config.tone}>{config.label}</Badge>
            <div className="flex items-center gap-1.5">
              <ProgressBar value={row.progress} tone={progressTone(row.status)} className="w-14" />
              <span className="shrink-0 text-xs font-semibold text-ink">{row.progress}%</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right sm:!pr-3",
      className: "text-right sm:!pr-3",
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu
            trigger={<span className="text-lg leading-none">⋯</span>}
            items={[
              { label: "Просмотр", icon: <Eye size={14} />, onClick: () => setDrawerTarget(row) },
              {
                label: "Редактировать",
                icon: <Pencil size={14} />,
                onClick: () => {
                  setEditTarget(row);
                  setFormOpen(true);
                },
              },
              ...(row.status === "active" || row.status === "overdue"
                ? [
                    { label: "Завершить", icon: <CheckCircle size={14} />, onClick: () => handleComplete(row.id) },
                    { label: "Отменить", icon: <Ban size={14} />, onClick: () => handleCancel(row.id) },
                  ]
                : []),
              { label: "Удалить", icon: <Trash2 size={14} />, onClick: () => setDeleteTarget(row), danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Назначения"
      subtitle="Назначение бригад и прорабов на объекты и работы"
      search={{ value: search, onChange: handleSearchChange, placeholder: "Поиск по назначениям..." }}
      action={
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          <Plus size={15} /> Создать назначение
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Всего назначений" value={String(kpis.total)} icon={ClipboardList} tone="blue" footer="За выбранный период" />
        <MetricCard
          label="Активные назначения"
          value={String(kpis.active)}
          icon={Users}
          tone="orange"
          footer={`${Math.round((kpis.active / kpis.total) * 100) || 0}% от всех назначений`}
        />
        <MetricCard
          label="Завершено"
          value={String(kpis.completed)}
          icon={CheckCircle2}
          tone="green"
          footer={`${Math.round((kpis.completed / kpis.total) * 100) || 0}% от всех назначений`}
        />
        <MetricCard
          label="Отменено / просрочено"
          value={String(kpis.cancelledOrOverdue)}
          icon={XCircle}
          tone="red"
          footer={`${Math.round((kpis.cancelledOrOverdue / kpis.total) * 100) || 0}% от всех назначений`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_260px]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-[17px] font-bold text-ink">Список назначений</h2>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 px-5 sm:px-6">
            <select
              value={filters.status}
              onChange={(e) => updateFilters({ ...filters, status: e.target.value as AssignmentStatus | "all" })}
              className={selectClass}
            >
              <option value="all">Статус: Все</option>
              {(Object.keys(ASSIGNMENT_STATUS_CONFIG) as AssignmentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {ASSIGNMENT_STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>

            <select
              value={filters.objectId}
              onChange={(e) => updateFilters({ ...filters, objectId: e.target.value })}
              className={selectClass}
            >
              <option value="all">Объект: Все</option>
              {mockObjects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            <select
              value={filters.brigadeId}
              onChange={(e) => updateFilters({ ...filters, brigadeId: e.target.value })}
              className={selectClass}
            >
              <option value="all">Бригада: Все</option>
              {mockBrigades.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={filters.foremanName}
              onChange={(e) => updateFilters({ ...filters, foremanName: e.target.value })}
              className={selectClass}
            >
              <option value="all">Прораб: Все</option>
              {mockBrigades.map((b) => (
                <option key={b.id} value={b.foremanName}>
                  {b.foremanName}
                </option>
              ))}
            </select>

            <span className="flex h-9 items-center whitespace-nowrap rounded-lg border border-border-strong px-2.5 text-xs font-medium text-ink-secondary">
              {formatDateShort(filters.dateFrom)} – {formatDateShort(filters.dateTo)}
            </span>

            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Сбросить фильтры
            </Button>
          </div>

          <div className="mt-4">
            {pageRows.length > 0 ? (
              <DataTable columns={columns} rows={pageRows} rowKey={(row) => row.id} onRowClick={(row) => setDrawerTarget(row)} />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="Назначения не найдены"
                description="Измените параметры поиска или сбросьте фильтры"
                action={
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
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
            total={filteredAssignments.length}
            itemLabel="назначений"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </Card>

        <div className="flex flex-col gap-4">
          <AssignmentFiltersCard filters={filters} onChange={updateFilters} onApply={() => setPage(1)} onReset={handleResetFilters} />
          <AssignmentCalendar
            assignments={assignments}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setPage(1);
            }}
          />
          <UpcomingAssignments assignments={upcomingAssignments} />
        </div>
      </div>

      <AssignmentFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        onSave={handleSaveAssignment}
        assignment={editTarget}
        nextNumber={nextNumber}
      />

      <AssignmentDrawer
        open={Boolean(drawerTarget)}
        onClose={() => setDrawerTarget(null)}
        assignment={drawerTarget}
        onUpdateProgress={handleUpdateProgress}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onEdit={(a) => {
          setEditTarget(a);
          setDrawerTarget(null);
          setFormOpen(true);
        }}
        onDelete={(a) => setDeleteTarget(a)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить назначение?"
        description={deleteTarget ? `Назначение №${deleteTarget.number} (${deleteTarget.objectName}) будет удалено.` : undefined}
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}
