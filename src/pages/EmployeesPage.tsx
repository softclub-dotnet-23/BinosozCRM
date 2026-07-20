import { useMemo, useState } from "react";
import {
  Briefcase,
  Download,
  Eye,
  Filter,
  HardHat,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  User,
  UserCog,
  Users,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SearchInput } from "../components/ui/SearchInput";
import { Avatar } from "../components/ui/Avatar";
import { DataTable, type DataTableColumn } from "../components/tables/DataTable";
import { Pagination } from "../components/ui/Pagination";
import { CustomSelect } from "../components/ui/CustomSelect";
import { DropdownMenu } from "../components/ui/DropdownMenu";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { StaffStatusBadge } from "../components/employees/StaffStatusBadge";
import { EmployeeProfilePanel } from "../components/employees/EmployeeProfilePanel";
import { EmployeeFormModal } from "../components/employees/EmployeeFormModal";
import { TransferEmployeeModal } from "../components/employees/TransferEmployeeModal";
import { EmployeeFilterDrawer } from "../components/employees/EmployeeFilterDrawer";
import { STAFF_BRIGADES, STAFF_POSITIONS } from "../data/mockStaff";
import { staffRepository } from "../data/repositories";
import { useRepositoryState } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { useToast } from "../hooks/useToast";
import { formatDateShort } from "../utils/date";
import type { StaffFilters, StaffMember, StaffStatus } from "../types";

const DEFAULT_FILTERS: StaffFilters = {
  categories: [],
  hireDateFrom: "",
  hireDateTo: "",
};

const STATUS_FILTER_OPTIONS: { value: StaffStatus | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активен" },
  { value: "vacation", label: "Отпуск" },
  { value: "dismissed", label: "Уволен" },
];

const iconButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-lg border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4] hover:text-ink";

export default function EmployeesPage() {
  const { showToast } = useToast();

  const [staff, setStaff] = useRepositoryState(staffRepository);
  const [selectedId, setSelectedId] = useState<string>(() => staffRepository.getSnapshot()[0]?.id ?? "");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = usePersistentState("filters.employees.search", "");
  const [positionFilter, setPositionFilter] = usePersistentState("filters.employees.position", "all");
  const [brigadeFilter, setBrigadeFilter] = usePersistentState("filters.employees.brigade", "all");
  const [statusFilter, setStatusFilter] = usePersistentState<StaffStatus | "all">("filters.employees.status", "all");
  const [filters, setFilters] = usePersistentState<StaffFilters>("filters.employees.filters", DEFAULT_FILTERS);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formEmployee, setFormEmployee] = useState<StaffMember | null | undefined>(undefined);
  const [transferEmployee, setTransferEmployee] = useState<StaffMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  const kpis = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.status === "active").length;
    const workers = staff.filter((s) => s.category === "worker").length;
    const engineers = staff.filter((s) => s.category === "engineer").length;
    const admins = staff.filter((s) => s.category === "admin").length;
    return { total, active, workers, engineers, admins };
  }, [staff]);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (query) {
        const haystack = `${s.fullName} ${s.position} ${s.phone} ${s.id}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (positionFilter !== "all" && s.position !== positionFilter) return false;
      if (brigadeFilter !== "all" && s.brigadeName !== brigadeFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(s.category)) return false;
      if (filters.hireDateFrom && s.hireDate < filters.hireDateFrom) return false;
      if (filters.hireDateTo && s.hireDate > filters.hireDateTo) return false;
      return true;
    });
  }, [staff, search, positionFilter, brigadeFilter, statusFilter, filters]);

  const pageCount = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredStaff.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedEmployee = staff.find((s) => s.id === selectedId) ?? staff[0];

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
      if (allPageSelected) {
        pageRows.forEach((r) => next.delete(r.id));
      } else {
        pageRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  function resetAll() {
    setSearch("");
    setPositionFilter("all");
    setBrigadeFilter("all");
    setStatusFilter("all");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleSaveEmployee(employee: StaffMember) {
    setStaff((prev) => {
      const exists = prev.some((s) => s.id === employee.id);
      return exists ? prev.map((s) => (s.id === employee.id ? employee : s)) : [employee, ...prev];
    });
    setSelectedId(employee.id);
    setFormEmployee(undefined);
    showToast(formEmployee ? "Данные сотрудника обновлены" : "Сотрудник добавлен");
  }

  function handleTransfer(result: { brigadeName: string | null; brigadeSpecialization: string | null; department: string | null }) {
    if (!transferEmployee) return;
    setStaff((prev) => prev.map((s) => (s.id === transferEmployee.id ? { ...s, ...result } : s)));
    showToast(`${transferEmployee.fullName} переведён(а) в новое подразделение`);
    setTransferEmployee(null);
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setStaff((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    if (selectedId === deleteTarget.id) {
      setSelectedId((prev) => staff.find((s) => s.id !== prev)?.id ?? "");
    }
    showToast("Сотрудник удалён", "info");
    setDeleteTarget(null);
  }

  function handleExport() {
    const header = ["ID", "ФИО", "Должность", "Бригада/Отдел", "Телефон", "Статус", "Дата принятия"];
    const rows = filteredStaff.map((s) => [
      s.id,
      s.fullName,
      s.position,
      s.brigadeName ?? s.department ?? "",
      s.phone,
      s.status,
      formatDateShort(s.hireDate),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sotrudniki.csv";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Список сотрудников экспортирован");
  }

  const columns: DataTableColumn<StaffMember>[] = [
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
      width: "36px",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedRowIds.has(row.id)}
          onChange={() => toggleRowSelected(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-border-strong accent-primary"
          aria-label={`Выбрать ${row.fullName}`}
        />
      ),
    },
    {
      key: "employee",
      header: "Сотрудник",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={row.fullName} size="sm" />
          <div className="min-w-0">
            <p className="whitespace-nowrap font-semibold text-ink">{row.fullName}</p>
            <p className="whitespace-nowrap text-xs text-ink-muted">ID: {row.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "position",
      header: "Должность",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{row.position}</span>,
    },
    {
      key: "unit",
      header: "Бригада / Отдел",
      render: (row) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap text-ink">{row.brigadeName ?? row.department ?? "—"}</p>
          {row.brigadeSpecialization && <p className="whitespace-nowrap text-xs text-ink-muted">{row.brigadeSpecialization}</p>}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Телефон",
      render: (row) => <span className="tabular whitespace-nowrap text-ink-secondary">{row.phone}</span>,
    },
    {
      key: "status",
      header: "Статус",
      render: (row) => <StaffStatusBadge status={row.status} />,
    },
    {
      key: "hireDate",
      header: "Дата принятия",
      render: (row) => <span className="whitespace-nowrap text-ink-secondary">{formatDateShort(row.hireDate)}</span>,
    },
    {
      key: "actions",
      header: "Действия",
      width: "112px",
      headerClassName: "text-right",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button type="button" aria-label="Просмотреть сотрудника" onClick={() => setSelectedId(row.id)} className={iconButtonClass}>
            <Eye size={14} />
          </button>
          <button type="button" aria-label="Редактировать сотрудника" onClick={() => setFormEmployee(row)} className={iconButtonClass}>
            <Pencil size={14} />
          </button>
          <DropdownMenu
            trigger={
              <span className={iconButtonClass}>
                <MoreHorizontal size={14} />
              </span>
            }
            items={[
              { label: "Просмотр", icon: <Eye size={14} />, onClick: () => setSelectedId(row.id) },
              { label: "Редактировать", icon: <Pencil size={14} />, onClick: () => setFormEmployee(row) },
              { label: "Перевести", icon: <UserCog size={14} />, onClick: () => setTransferEmployee(row) },
              { label: "Удалить", icon: <Trash2 size={14} />, onClick: () => setDeleteTarget(row), danger: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <AppLayout
      title="Сотрудники"
      subtitle="Управление сотрудниками компании"
      search={{ value: search, onChange: handleSearchChange, placeholder: "Поиск по ФИО, должности, телефону..." }}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard
              label="Всего сотрудников"
              value={String(kpis.total)}
              icon={Users}
              tone="orange"
              footer={
                <>
                  Активные: <span className="font-semibold text-green">{kpis.active}</span>
                </>
              }
            />
            <MetricCard
              label="Рабочие"
              value={String(kpis.workers)}
              icon={User}
              tone="blue"
              footer={`${Math.round((kpis.workers / kpis.total) * 100)}% от общего числа`}
            />
            <MetricCard
              label="Инженеры и ИТР"
              value={String(kpis.engineers)}
              icon={HardHat}
              tone="orange"
              footer={`${Math.round((kpis.engineers / kpis.total) * 100)}% от общего числа`}
            />
            <MetricCard
              label="Администрация"
              value={String(kpis.admins)}
              icon={Briefcase}
              tone="purple"
              footer={`${Math.round((kpis.admins / kpis.total) * 100)}% от общего числа`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Поиск по ФИО, должности..."
              containerClassName="min-w-[220px] flex-1"
              className="h-9"
            />
            <CustomSelect
              size="sm"
              searchable
              aria-label="Должность"
              value={positionFilter}
              onValueChange={(v) => {
                setPositionFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Должность: Все" },
                ...STAFF_POSITIONS.map((p) => ({ value: p, label: p })),
              ]}
            />
            <CustomSelect
              size="sm"
              searchable
              aria-label="Бригада"
              value={brigadeFilter}
              onValueChange={(v) => {
                setBrigadeFilter(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Бригада: Все" },
                ...STAFF_BRIGADES.map((b) => ({ value: b, label: b })),
              ]}
            />
            <CustomSelect
              size="sm"
              aria-label="Статус"
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StaffStatus | "all");
                setPage(1);
              }}
              options={STATUS_FILTER_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.value === "all" ? "Статус: Все" : opt.label,
              }))}
            />
            <Button variant="outline" size="sm" className="h-9" onClick={() => setDrawerOpen(true)}>
              <Filter size={14} /> Фильтры
            </Button>
            <button
              type="button"
              aria-label="Сбросить фильтры"
              onClick={resetAll}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border-strong text-ink-secondary transition-colors hover:bg-[#F5F5F4]"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          <Card>
            {pageRows.length > 0 ? (
              <DataTable
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.id}
                selectedRowKey={selectedId}
                onRowClick={(row) => setSelectedId(row.id)}
              />
            ) : (
              <EmptyState icon={Users} title="Сотрудники не найдены" description="Измените параметры поиска или сбросьте фильтры" action={
                <Button variant="outline" size="sm" onClick={resetAll}>
                  Сбросить фильтры
                </Button>
              } />
            )}
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              total={filteredStaff.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemLabel="сотрудников"
            />
          </Card>
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-70 xl:shrink-0">
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => setFormEmployee(null)}>
              <Plus size={16} /> Добавить сотрудника
            </Button>
            <Button variant="outline" className="w-full" onClick={handleExport}>
              <Download size={16} /> Экспорт
            </Button>
          </div>

          {selectedEmployee && (
            <EmployeeProfilePanel
              employee={selectedEmployee}
              onEdit={() => setFormEmployee(selectedEmployee)}
              onTransfer={() => setTransferEmployee(selectedEmployee)}
            />
          )}
        </div>
      </div>

      <EmployeeFilterDrawer
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

      <EmployeeFormModal
        open={formEmployee !== undefined}
        employee={formEmployee ?? null}
        onClose={() => setFormEmployee(undefined)}
        onSave={handleSaveEmployee}
      />

      <TransferEmployeeModal
        open={Boolean(transferEmployee)}
        employee={transferEmployee}
        onClose={() => setTransferEmployee(null)}
        onTransfer={handleTransfer}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить сотрудника?"
        description={deleteTarget ? `«${deleteTarget.fullName}» будет удалён из списка сотрудников.` : undefined}
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}
