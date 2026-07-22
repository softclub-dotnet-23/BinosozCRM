import { useMemo, useState } from "react";
import { Gauge, Plus, UserRoundCheck, UserRoundIcon, UsersRound } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { BrigadeCompositionTable } from "../components/brigades/BrigadeCompositionTable";
import {
  CompositionFilters,
  DEFAULT_COMPOSITION_FILTERS,
  type CompositionFiltersState,
} from "../components/brigades/CompositionFilters";
import { SpecializationDonut, SpecializationLegend } from "../components/brigades/SpecializationDonut";
import { UpcomingCompositionChanges } from "../components/brigades/UpcomingCompositionChanges";
import { BrigadeCompletenessChart } from "../components/brigades/BrigadeCompletenessChart";
import { AddEmployeeModal } from "../components/brigades/AddEmployeeModal";
import { TransferEmployeeModal } from "../components/brigades/TransferEmployeeModal";
import { EmployeeDetailsDrawer } from "../components/brigades/EmployeeDetailsDrawer";
import type { EmployeeActionKind } from "../components/brigades/EmployeeActionMenu";
import { mockCompositionChanges } from "../data/mockCompositionChanges";
import { brigadesRepository, employeesRepository } from "../data/repositories";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { computeSpecializationDistribution } from "../utils/brigadeAnalytics";
import { computeCompositionKpis } from "../utils/compositionAnalytics";
import { completenessPercent } from "../utils/brigadeAnalytics";
import { useToast } from "../hooks/useToast";
import type { BrigadeMemberRole, Employee, EmployeeStatus, WorkShift } from "../types";

export default function BrigadeCompositionPage() {
  const { showToast } = useToast();

  const [employees, setEmployees] = useRepositoryState(employeesRepository);
  const brigades = useRepositorySnapshot(brigadesRepository);
  const [loading] = useState(false);
  const [search, setSearch] = usePersistentState("filters.brigadeComposition.search", "");
  const [filters, setFilters] = usePersistentState<CompositionFiltersState>(
    "filters.brigadeComposition.filters",
    DEFAULT_COMPOSITION_FILTERS,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [addOpen, setAddOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<Employee | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<Employee | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Employee | null>(null);

  const averageCompleteness = useMemo(() => {
    if (brigades.length === 0) return 0;
    return Math.round(brigades.reduce((sum, b) => sum + completenessPercent(b), 0) / brigades.length);
  }, [brigades]);

  const kpis = useMemo(() => computeCompositionKpis(employees, averageCompleteness), [employees, averageCompleteness]);
  const specialization = useMemo(() => computeSpecializationDistribution(employees), [employees]);
  const specialties = useMemo(() => Array.from(new Set(employees.map((e) => e.specialty))).sort(), [employees]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (query) {
        const haystack = `${e.fullName} ${e.brigadeName ?? ""} ${e.specialty} ${e.objectName ?? ""} ${e.phone}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.brigadeId !== "all" && e.brigadeId !== filters.brigadeId) return false;
      if (filters.specialty !== "all" && e.specialty !== filters.specialty) return false;
      if (filters.objectId !== "all" && e.objectId !== filters.objectId) return false;
      if (filters.status !== "all" && e.status !== filters.status) return false;
      return true;
    });
  }, [employees, search, filters]);

  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateFilters(next: CompositionFiltersState) {
    setFilters(next);
    setPage(1);
  }

  function handleResetFilters() {
    setFilters(DEFAULT_COMPOSITION_FILTERS);
    setSearch("");
    setPage(1);
  }

  function handleAddEmployee(employee: Employee) {
    setEmployees((prev) => [employee, ...prev]);
    setAddOpen(false);
    showToast("Сотрудник добавлен");
  }

  function handleChangeShift(id: string, shift: WorkShift) {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, shift } : e)));
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, shift } : prev));
    showToast("Смена обновлена");
  }

  function handleChangeStatus(id: string, status: EmployeeStatus) {
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    showToast("Статус обновлён");
  }

  function handleTransferConfirmed(employeeId: string, toBrigadeId: string, newRole: BrigadeMemberRole) {
    const brigade = brigades.find((b) => b.id === toBrigadeId);
    if (!brigade) return;
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? { ...e, brigadeId: brigade.id, brigadeName: brigade.name, objectId: brigade.objectId, objectName: brigade.objectName, memberRole: newRole }
          : e,
      ),
    );
    setTransferTarget(null);
    showToast("Сотрудник переведён");
  }

  function handleRemoveConfirmed() {
    if (!removeTarget) return;
    setEmployees((prev) =>
      prev.map((e) => (e.id === removeTarget.id ? { ...e, brigadeId: null, brigadeName: null, objectId: null, objectName: null, status: "available" } : e)),
    );
    if (drawerTarget?.id === removeTarget.id) setDrawerTarget(null);
    showToast("Сотрудник удалён из бригады", "info");
    setRemoveTarget(null);
  }

  function handleAction(action: EmployeeActionKind, employee: Employee) {
    switch (action) {
      case "open":
      case "changeRole":
        setDrawerTarget(employee);
        break;
      case "edit":
        showToast("Редактирование пока недоступно в демо", "info");
        break;
      case "transfer":
        setTransferTarget(employee);
        break;
      case "changeShift":
        handleChangeShift(employee.id, employee.shift === "day" ? "evening" : "day");
        break;
      case "changeStatus":
        setDrawerTarget(employee);
        break;
      case "remove":
        setRemoveTarget(employee);
        break;
    }
  }

  return (
    <AppLayout
      title="Состав бригад"
      subtitle="Управление участниками бригад, ролями и распределением по объектам"
      search={{ value: search, onChange: handleSearchChange, placeholder: "Поиск по сотрудникам..." }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Всего сотрудников в бригадах"
          value={String(kpis.totalEmployees)}
          icon={UsersRound}
          tone="blue"
          footer={`Из них рабочих: ${employees.filter((e) => e.brigadeId !== null && e.memberRole !== "helper").length}`}
        />
        <MetricCard
          label="Активны на смене"
          value={String(kpis.activeOnShift)}
          icon={UserRoundCheck}
          tone="green"
          footer={`${kpis.activeOnShiftPercent}% от общего состава`}
        />
        <MetricCard
          label="Свободные специалисты"
          value={String(kpis.freeSpecialists)}
          icon={UserRoundIcon}
          tone="orange"
          footer="Готовы к назначению"
        />
        <MetricCard
          label="Средняя укомплектованность"
          value={`${kpis.averageCompleteness}%`}
          icon={Gauge}
          tone="purple"
          footer="По всем бригадам"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_260px]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-[17px] font-bold text-ink">Состав бригад</h2>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6">
            <CompositionFilters filters={filters} onChange={updateFilters} onReset={handleResetFilters} specialties={specialties} />
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={15} /> Добавить сотрудника
            </Button>
          </div>

          <div className="mt-4">
            {pageRows.length > 0 || loading ? (
              <BrigadeCompositionTable
                employees={pageRows}
                loading={loading}
                onRowClick={(e) => setDrawerTarget(e)}
                onAction={handleAction}
              />
            ) : (
              <EmptyState
                icon={UsersRound}
                title="Сотрудники не найдены"
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
            total={filteredEmployees.length}
            itemLabel="сотрудников"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[17px] font-bold text-ink">Распределение по ролям</h2>
            <div className="mt-4 flex flex-col items-center gap-5">
              <SpecializationDonut slices={specialization} total={kpis.totalEmployees} />
              <SpecializationLegend slices={specialization} />
            </div>
          </Card>

          <UpcomingCompositionChanges
            changes={mockCompositionChanges}
            onSeeAll={() => showToast("Полный список изменений пока недоступен в демо", "info")}
          />
        </div>
      </div>

      <div className="mt-4">
        <BrigadeCompletenessChart brigades={brigades} />
      </div>

      <AddEmployeeModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleAddEmployee} />

      <TransferEmployeeModal
        open={Boolean(transferTarget)}
        onClose={() => setTransferTarget(null)}
        employee={transferTarget}
        allEmployees={employees}
        onConfirm={handleTransferConfirmed}
      />

      <EmployeeDetailsDrawer
        open={Boolean(drawerTarget)}
        onClose={() => setDrawerTarget(null)}
        employee={drawerTarget}
        onEdit={() => showToast("Редактирование пока недоступно в демо", "info")}
        onTransfer={(e) => {
          setDrawerTarget(null);
          setTransferTarget(e);
        }}
        onChangeShift={handleChangeShift}
        onChangeStatus={handleChangeStatus}
        onRemove={(e) => setRemoveTarget(e)}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Удалить сотрудника из бригады?"
        description={removeTarget ? `«${removeTarget.fullName}» будет удалён из «${removeTarget.brigadeName}» и переведён в свободные специалисты.` : undefined}
        confirmLabel="Удалить"
        danger
        onConfirm={handleRemoveConfirmed}
      />
    </AppLayout>
  );
}
