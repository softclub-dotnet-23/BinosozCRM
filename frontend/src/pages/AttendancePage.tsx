import { useMemo, useState } from "react";
import { CalendarCheck, CalendarClock, CalendarX2, Download, Eye, Pencil, Plus, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { SpecializationDonut, SpecializationLegend } from "../components/brigades/SpecializationDonut";
import { AttendanceStatusBadge } from "../components/attendance/AttendanceStatusBadge";
import { AttendanceFormModal } from "../components/attendance/AttendanceFormModal";
import { AttendanceDetailDrawer } from "../components/attendance/AttendanceDetailDrawer";
import { CustomSelect } from "../components/ui/CustomSelect";
import { ATTENDANCE_BRIGADES, ATTENDANCE_EMPLOYEES, ATTENDANCE_OBJECTS } from "../data/mockAttendance";
import { attendanceRepository } from "../data/repositories";
import { useRepositoryState } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { computeAttendanceKpis, computeAttendanceStatusSlices, computeFrequentLateness } from "../utils/attendanceAnalytics";
import { useToast } from "../hooks/useToast";
import { formatDateShort, formatWeekdayShort } from "../utils/date";
import type { AttendanceFilters, AttendanceRecord, AttendanceStatus } from "../types";
import { useAuth } from "../context/AuthContext";
import BrigadirAttendancePage from "./BrigadirAttendancePage";

const DEFAULT_FILTERS: AttendanceFilters = {
  objectName: "all",
  brigadeName: "all",
  employeeName: "all",
  status: "all",
  dateFrom: "2026-07-01",
  dateTo: "2026-07-30",
};

const STATUS_FILTER_OPTIONS: { value: AttendanceStatus | "all"; label: string }[] = [
  { value: "all", label: "Статус: Все" },
  { value: "present", label: "Присутствовал" },
  { value: "late", label: "Опоздание" },
  { value: "absent", label: "Отсутствовал" },
];

const dateInputClass =
  "h-9 rounded-[10px] border border-border-strong bg-card px-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";
const iconButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink";

export default function AttendancePage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirAttendancePage />;
  return <CompanyAttendancePage />;
}

function CompanyAttendancePage() {
  const { showToast } = useToast();

  const [records, setRecords] = useRepositoryState(attendanceRepository);
  const [search, setSearch] = usePersistentState("filters.attendance.search", "");
  const [filters, setFilters] = usePersistentState<AttendanceFilters>("filters.attendance.filters", DEFAULT_FILTERS);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formRecord, setFormRecord] = useState<AttendanceRecord | null | undefined>(undefined);
  const [viewRecord, setViewRecord] = useState<AttendanceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);

  const kpis = useMemo(() => computeAttendanceKpis(records), [records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((r) => {
      if (query) {
        const haystack = `${r.employeeName} ${r.objectName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.objectName !== "all" && r.objectName !== filters.objectName) return false;
      if (filters.brigadeName !== "all" && r.brigadeName !== filters.brigadeName) return false;
      if (filters.employeeName !== "all" && r.employeeName !== filters.employeeName) return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      return true;
    });
  }, [records, filters]);

  const filteredKpis = useMemo(() => computeAttendanceKpis(filteredRecords), [filteredRecords]);
  const statusSlices = useMemo(() => computeAttendanceStatusSlices(filteredKpis), [filteredKpis]);
  const frequentLateness = useMemo(() => computeFrequentLateness(filteredRecords), [filteredRecords]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedRowIds.has(r.id));

  function toggleRowSelected(id: string) {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageRows.forEach((r) => next.delete(r.id));
      else pageRows.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function handleSaveRecord(record: AttendanceRecord) {
    setRecords((prev) => {
      const exists = prev.some((r) => r.id === record.id);
      return exists ? prev.map((r) => (r.id === record.id ? record : r)) : [record, ...prev];
    });
    setFormRecord(undefined);
    showToast(formRecord ? "Запись обновлена" : "Посещение добавлено");
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    showToast("Запись удалена", "info");
    setDeleteTarget(null);
  }

  function handleExport() {
    const header = ["Дата", "Сотрудник", "Бригада", "Объект", "Приход", "Уход", "Статус", "Примечание"];
    const rows = filteredRecords.map((r) => [
      formatDateShort(r.date),
      r.employeeName,
      r.brigadeName ?? r.department ?? "",
      r.objectName,
      r.arrivalTime ?? "",
      r.departureTime ?? "",
      r.status,
      r.note,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "poseshaemost.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Посещаемость экспортирована");
  }

  const columns: DataTableColumn<AttendanceRecord>[] = [
    {
      key: "checkbox",
      header: (
        <input
          type="checkbox"
          checked={allPageSelected}
          onChange={toggleAllOnPage}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-border-strong accent-primary"
          aria-label="Выбрать все строки"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedRowIds.has(row.id)}
          onChange={() => toggleRowSelected(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-border-strong accent-primary"
          aria-label={`Выбрать запись ${row.employeeName}`}
        />
      ),
    },
    {
      key: "date",
      header: "Дата",
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-ink">{formatDateShort(row.date)}</p>
          <p className="text-xs text-ink-muted">{formatWeekdayShort(row.date)}</p>
        </div>
      ),
    },
    {
      key: "employee",
      header: "Сотрудник",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.employeeName} size="sm" />
          <div className="min-w-0">
            <p className="whitespace-nowrap font-semibold text-ink">{row.employeeName}</p>
            <p className="whitespace-nowrap text-xs text-ink-muted">{row.position}</p>
          </div>
        </div>
      ),
    },
    {
      key: "brigade",
      header: "Бригада",
      render: (row) => (
        <div>
          <p className="whitespace-nowrap text-ink">{row.brigadeName ?? row.department ?? "—"}</p>
          {row.brigadeSpecialization && <p className="whitespace-nowrap text-xs text-ink-muted">{row.brigadeSpecialization}</p>}
        </div>
      ),
    },
    {
      key: "object",
      header: "Объект",
      render: (row) => (
        <div>
          <p className="whitespace-nowrap text-ink">{row.objectName}</p>
          <p className="whitespace-nowrap text-xs text-ink-muted">{row.city}</p>
        </div>
      ),
    },
    {
      key: "arrival",
      header: "Приход",
      render: (row) => (
        <span className={`tabular whitespace-nowrap font-semibold ${row.arrivalTime ? (row.status === "late" ? "text-warning" : "text-green") : "text-ink-muted"}`}>
          {row.arrivalTime ?? "—"}
        </span>
      ),
    },
    {
      key: "departure",
      header: "Уход",
      render: (row) => (
        <span className={`tabular whitespace-nowrap font-semibold ${row.departureTime ? "text-red" : "text-ink-muted"}`}>
          {row.departureTime ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => <AttendanceStatusBadge status={row.status} />,
    },
    {
      key: "note",
      header: "Примечание",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.note || "—"}</span>,
    },
    {
      key: "actions",
      header: "Действия",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Просмотреть запись" onClick={() => setViewRecord(row)} className={iconButtonClass}>
            <Eye size={14} />
          </button>
          <button type="button" aria-label="Редактировать запись" onClick={() => setFormRecord(row)} className={iconButtonClass}>
            <Pencil size={14} />
          </button>
          <button
            type="button"
            aria-label="Удалить запись"
            onClick={() => setDeleteTarget(row)}
            className={`${iconButtonClass} hover:border-red hover:text-red`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Посещаемость"
      subtitle="Учет посещений сотрудников на объектах"
      search={{
        value: search,
        onChange: (value) => {
          setSearch(value);
          setPage(1);
        },
        placeholder: "Поиск по сотрудникам, объектам...",
      }}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard label="Всего посещений" value={String(kpis.total)} icon={CalendarCheck} tone="green" footer="За выбранный период" />
            <MetricCard
              label="Присутствовали"
              value={String(kpis.present)}
              icon={UserCheck}
              tone="blue"
              footer={`${kpis.presentPercent}% от общего`}
            />
            <MetricCard
              label="Отсутствовали"
              value={String(kpis.absent)}
              icon={CalendarX2}
              tone="orange"
              footer={`${kpis.absentPercent}% от общего`}
            />
            <MetricCard
              label="Опоздали"
              value={String(kpis.late)}
              icon={CalendarClock}
              tone="purple"
              footer={`${kpis.latePercent}% от общего`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center gap-1.5 rounded-[10px] border border-border-strong bg-card px-2.5">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }));
                  setPage(1);
                }}
                className="border-0 bg-transparent p-0 text-sm text-ink focus:outline-none"
              />
              <span className="text-ink-muted">–</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, dateTo: e.target.value }));
                  setPage(1);
                }}
                className="border-0 bg-transparent p-0 text-sm text-ink focus:outline-none"
              />
            </div>
            <CustomSelect
              size="sm"
              searchable
              aria-label="Объект"
              value={filters.objectName}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, objectName: v }));
                setPage(1);
              }}
              options={[{ value: "all", label: "Объект: Все" }, ...ATTENDANCE_OBJECTS.map((o) => ({ value: o, label: o }))]}
            />
            <CustomSelect
              size="sm"
              searchable
              aria-label="Сотрудник"
              value={filters.employeeName}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, employeeName: v }));
                setPage(1);
              }}
              options={[
                { value: "all", label: "Сотрудник: Все" },
                ...ATTENDANCE_EMPLOYEES.map((name) => ({ value: name, label: name })),
              ]}
            />
            <CustomSelect
              size="sm"
              searchable
              aria-label="Бригада"
              value={filters.brigadeName}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, brigadeName: v }));
                setPage(1);
              }}
              options={[
                { value: "all", label: "Бригада: Все" },
                ...ATTENDANCE_BRIGADES.map((name) => ({ value: name, label: name })),
              ]}
            />
            <CustomSelect
              size="sm"
              aria-label="Статус"
              value={filters.status}
              onValueChange={(v) => {
                setFilters((f) => ({ ...f, status: v as AttendanceStatus | "all" }));
                setPage(1);
              }}
              options={STATUS_FILTER_OPTIONS}
            />
            <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
              <RefreshCw size={14} /> Сбросить фильтры
            </Button>
          </div>

          <Card>
            {pageRows.length > 0 ? (
              <DataTable
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.id}
                onRowClick={(row) => setViewRecord(row)}
              />
            ) : (
              <EmptyState
                icon={CalendarX2}
                title="Записи не найдены"
                description="Измените параметры поиска или сбросьте фильтры"
                action={
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Сбросить фильтры
                  </Button>
                }
              />
            )}
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              total={filteredRecords.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="записей"
            />
          </Card>
        </div>

        <div className="flex w-full flex-col gap-4 xl:w-70 xl:shrink-0">
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => setFormRecord(null)}>
              <Plus size={16} /> Добавить посещение
            </Button>
            <Button variant="outline" className="w-full" onClick={handleExport}>
              <Download size={16} /> Экспорт
            </Button>
          </div>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Фильтры</h2>
            <div className="mt-4 space-y-3.5">
              <div>
                <p className="text-xs font-medium text-ink-secondary">Период</p>
                <div className="mt-1.5 flex flex-col gap-2">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    className={cnFull(dateInputClass)}
                  />
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    className={cnFull(dateInputClass)}
                  />
                </div>
              </div>

              <FilterField label="Объект">
                <CustomSelect
                  size="sm"
                  fullWidth
                  searchable
                  aria-label="Объект"
                  value={filters.objectName}
                  onValueChange={(v) => setFilters((f) => ({ ...f, objectName: v }))}
                  options={[{ value: "all", label: "Все объекты" }, ...ATTENDANCE_OBJECTS.map((o) => ({ value: o, label: o }))]}
                />
              </FilterField>

              <FilterField label="Бригада">
                <CustomSelect
                  size="sm"
                  fullWidth
                  searchable
                  aria-label="Бригада"
                  value={filters.brigadeName}
                  onValueChange={(v) => setFilters((f) => ({ ...f, brigadeName: v }))}
                  options={[
                    { value: "all", label: "Все бригады" },
                    ...ATTENDANCE_BRIGADES.map((name) => ({ value: name, label: name })),
                  ]}
                />
              </FilterField>

              <FilterField label="Сотрудник">
                <CustomSelect
                  size="sm"
                  fullWidth
                  searchable
                  aria-label="Сотрудник"
                  value={filters.employeeName}
                  onValueChange={(v) => setFilters((f) => ({ ...f, employeeName: v }))}
                  options={[
                    { value: "all", label: "Все сотрудники" },
                    ...ATTENDANCE_EMPLOYEES.map((name) => ({ value: name, label: name })),
                  ]}
                />
              </FilterField>

              <FilterField label="Статус">
                <CustomSelect
                  size="sm"
                  fullWidth
                  aria-label="Статус"
                  value={filters.status}
                  onValueChange={(v) => setFilters((f) => ({ ...f, status: v as AttendanceStatus | "all" }))}
                  options={[
                    { value: "all", label: "Все статусы" },
                    { value: "present", label: "Присутствовал" },
                    { value: "late", label: "Опоздание" },
                    { value: "absent", label: "Отсутствовал" },
                  ]}
                />
              </FilterField>
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="flex-1" onClick={() => setPage(1)}>
                Применить
              </Button>
              <Button variant="outline" className="flex-1" onClick={resetFilters}>
                Сбросить
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Статистика за период</h2>
            <div className="mt-4">
              <SpecializationDonut slices={statusSlices} total={filteredKpis.total} size={176} />
            </div>
            <div className="mt-4">
              <SpecializationLegend slices={statusSlices} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Частые опоздания</h2>
            <ul className="mt-3.5 space-y-3">
              {frequentLateness.map((row) => (
                <li key={row.employeeName} className="flex items-center gap-2.5">
                  <Avatar name={row.employeeName} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{row.employeeName}</span>
                  <span className="shrink-0 text-xs font-semibold text-ink-secondary">{row.count} раза</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Все отчёты →
            </button>
          </Card>
        </div>
      </div>

      <AttendanceFormModal
        open={formRecord !== undefined}
        record={formRecord ?? null}
        onClose={() => setFormRecord(undefined)}
        onSave={handleSaveRecord}
      />

      <AttendanceDetailDrawer record={viewRecord} onClose={() => setViewRecord(null)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить запись?"
        description={deleteTarget ? `Запись о посещении «${deleteTarget.employeeName}» за ${formatDateShort(deleteTarget.date)} будет удалена.` : undefined}
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}

function cnFull(base: string): string {
  return `${base} w-full`;
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
