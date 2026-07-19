import { useMemo, useState } from "react";
import { ClipboardCheck, Gauge, Plus, Users, UsersRound } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { BrigadesTable } from "../components/brigades/BrigadesTable";
import { BrigadeFilters, DEFAULT_BRIGADE_FILTERS, type BrigadeFiltersState } from "../components/brigades/BrigadeFilters";
import { SpecializationDonut, SpecializationLegend } from "../components/brigades/SpecializationDonut";
import { BrigadeActivityCard } from "../components/brigades/BrigadeActivityCard";
import { UpcomingBrigadeAssignmentsCard } from "../components/brigades/UpcomingBrigadeAssignmentsCard";
import { CreateBrigadeModal } from "../components/brigades/CreateBrigadeModal";
import { BrigadeDetailsDrawer } from "../components/brigades/BrigadeDetailsDrawer";
import type { BrigadeActionKind } from "../components/brigades/BrigadeActionMenu";
import { mockUpcomingBrigadeAssignments } from "../data/mockUpcomingBrigadeAssignments";
import { brigadesRepository, employeesRepository, assignmentsRepository } from "../data/repositories";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import {
  computeBrigadeActivity,
  computeBrigadeKpis,
  computeSpecializationDistribution,
} from "../utils/brigadeAnalytics";
import { useToast } from "../hooks/useToast";
import type { Brigade } from "../types";

export default function BrigadesPage() {
  const { showToast } = useToast();

  const [brigades, setBrigades] = useRepositoryState(brigadesRepository);
  const allEmployees = useRepositorySnapshot(employeesRepository);
  const allAssignments = useRepositorySnapshot(assignmentsRepository);
  const [loading] = useState(false);
  const [search, setSearch] = usePersistentState("filters.brigades.search", "");
  const [filters, setFilters] = usePersistentState<BrigadeFiltersState>("filters.brigades.filters", DEFAULT_BRIGADE_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [createOpen, setCreateOpen] = useState(false);
  const [drawerTarget, setDrawerTarget] = useState<Brigade | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brigade | null>(null);

  const kpis = useMemo(() => computeBrigadeKpis(brigades, allAssignments.length), [brigades, allAssignments]);
  const specialization = useMemo(() => computeSpecializationDistribution(allEmployees), [allEmployees]);
  const activity = useMemo(() => computeBrigadeActivity(brigades, 6), [brigades]);
  const foremanNames = useMemo(() => Array.from(new Set(brigades.map((b) => b.foremanName))).sort(), [brigades]);
  const nextNumber = useMemo(() => brigades.reduce((max, b) => Math.max(max, b.number), 0) + 1, [brigades]);

  const filteredBrigades = useMemo(() => {
    const query = search.trim().toLowerCase();
    return brigades.filter((b) => {
      if (query) {
        const haystack = `${b.name} ${b.specialization} ${b.foremanName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.status !== "all" && b.status !== filters.status) return false;
      if (filters.foremanName !== "all" && b.foremanName !== filters.foremanName) return false;
      if (filters.objectId !== "all" && b.objectId !== filters.objectId) return false;
      return true;
    });
  }, [brigades, search, filters]);

  const pageCount = Math.max(1, Math.ceil(filteredBrigades.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredBrigades.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateFilters(next: BrigadeFiltersState) {
    setFilters(next);
    setPage(1);
  }

  function handleResetFilters() {
    setFilters(DEFAULT_BRIGADE_FILTERS);
    setSearch("");
    setPage(1);
  }

  function handleCreate(brigade: Brigade, asDraft: boolean) {
    setBrigades((prev) => [brigade, ...prev]);
    setCreateOpen(false);
    showToast(asDraft ? "Бригада сохранена как черновик" : "Бригада создана");
  }

  function handlePause(id: string) {
    setBrigades((prev) => prev.map((b) => (b.id === id ? { ...b, status: "paused" } : b)));
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, status: "paused" } : prev));
    showToast("Бригада поставлена на паузу", "info");
  }

  function handleActivate(id: string) {
    setBrigades((prev) => prev.map((b) => (b.id === id ? { ...b, status: "active" } : b)));
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, status: "active" } : prev));
    showToast("Бригада активирована");
  }

  function handleDuplicate(brigade: Brigade) {
    const suffix = Date.now().toString().slice(-4);
    const duplicated: Brigade = {
      ...brigade,
      id: `brigade-copy-${suffix}`,
      number: nextNumber,
      name: `Бригада №${nextNumber}`,
      status: "forming",
    };
    setBrigades((prev) => [duplicated, ...prev]);
    showToast("Бригада дублирована");
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setBrigades((prev) => prev.filter((b) => b.id !== deleteTarget.id));
    if (drawerTarget?.id === deleteTarget.id) setDrawerTarget(null);
    showToast("Бригада удалена", "info");
    setDeleteTarget(null);
  }

  function handleAction(action: BrigadeActionKind, brigade: Brigade) {
    switch (action) {
      case "open":
      case "changeComposition":
      case "assignWork":
      case "changeForeman":
        setDrawerTarget(brigade);
        break;
      case "edit":
        showToast("Редактирование пока недоступно в демо", "info");
        break;
      case "pause":
        handlePause(brigade.id);
        break;
      case "activate":
        handleActivate(brigade.id);
        break;
      case "duplicate":
        handleDuplicate(brigade);
        break;
      case "delete":
        setDeleteTarget(brigade);
        break;
    }
  }

  return (
    <AppLayout
      title="Бригады"
      subtitle="Управление бригадами и их составом"
      search={{ value: search, onChange: handleSearchChange, placeholder: "Поиск по бригадам, прорабам..." }}
      action={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> Создать бригаду
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Всего бригад"
          value={String(kpis.totalBrigades)}
          icon={Users}
          tone="orange"
          footer={`Активных: ${kpis.activeBrigades}`}
        />
        <MetricCard
          label="Сотрудников в бригадах"
          value={String(kpis.totalMembers)}
          icon={UsersRound}
          tone="blue"
          footer={`Из них рабочих: ${kpis.totalWorkers}`}
        />
        <MetricCard
          label="Назначено на работы"
          value={String(kpis.assignedWorksCount)}
          icon={ClipboardCheck}
          tone="green"
          footer="Объектов"
        />
        <MetricCard
          label="Средняя эффективность"
          value={`${kpis.averageEfficiency}%`}
          icon={Gauge}
          tone="purple"
          footer="За текущий период"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_250px]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-[17px] font-bold text-ink">Список бригад</h2>
          </div>

          <div className="mt-4 px-5 sm:px-6">
            <BrigadeFilters filters={filters} onChange={updateFilters} onReset={handleResetFilters} foremanNames={foremanNames} />
          </div>

          <div className="mt-4">
            {pageRows.length > 0 || loading ? (
              <BrigadesTable brigades={pageRows} loading={loading} onRowClick={(b) => setDrawerTarget(b)} onAction={handleAction} />
            ) : (
              <EmptyState
                icon={Users}
                title="Бригады не найдены"
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
            total={filteredBrigades.length}
            itemLabel="бригад"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[17px] font-bold text-ink">Распределение по специальностям</h2>
            <div className="mt-4 flex flex-col items-center gap-5">
              <SpecializationDonut slices={specialization} total={kpis.totalMembers} />
              <SpecializationLegend slices={specialization} />
            </div>
          </Card>

          <BrigadeActivityCard rows={activity} />

          <UpcomingBrigadeAssignmentsCard
            items={mockUpcomingBrigadeAssignments}
            onSeeAll={() => showToast("Полный список назначений пока недоступен в демо", "info")}
          />
        </div>
      </div>

      <CreateBrigadeModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} nextNumber={nextNumber} />

      <BrigadeDetailsDrawer
        open={Boolean(drawerTarget)}
        onClose={() => setDrawerTarget(null)}
        brigade={drawerTarget}
        onEdit={() => showToast("Редактирование пока недоступно в демо", "info")}
        onChangeComposition={() => showToast("Изменение состава пока недоступно в демо", "info")}
        onAssignWork={() => showToast("Назначение на работу пока недоступно в демо", "info")}
        onChangeForeman={() => showToast("Смена прораба пока недоступна в демо", "info")}
        onPause={handlePause}
        onActivate={handleActivate}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Удалить бригаду?"
        description={deleteTarget ? `«${deleteTarget.name}» будет удалена из списка бригад.` : undefined}
        confirmLabel="Удалить"
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}
