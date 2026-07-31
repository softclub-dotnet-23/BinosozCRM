import { useMemo, useState } from "react";
import { ClipboardCheck, Gauge, Plus, Users, UsersRound } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { StaggeredGrid } from "../components/ui/StaggeredGrid";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { BrigadesTable } from "../components/brigades/BrigadesTable";
import { BrigadeFilters, DEFAULT_BRIGADE_FILTERS, type BrigadeFiltersState } from "../components/brigades/BrigadeFilters";
import { SpecializationDonut, SpecializationLegend } from "../components/brigades/SpecializationDonut";
import { BrigadeActivityCard } from "../components/brigades/BrigadeActivityCard";
import { CreateBrigadeModal } from "../components/brigades/CreateBrigadeModal";
import { BrigadeDetailsDrawer } from "../components/brigades/BrigadeDetailsDrawer";
import type { BrigadeActionKind } from "../components/brigades/BrigadeActionMenu";
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
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import BrigadirTeamPage from "./BrigadirTeamPage";

export default function BrigadesPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirTeamPage />;
  return <CompanyBrigadesPage />;
}

function CompanyBrigadesPage() {
  const { showToast } = useToast();
  const { strings } = useLanguage();
  const s = strings.brigades;
  const c = strings.common;

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
    showToast(asDraft ? s.toastCreatedDraft : s.toastCreated);
  }

  function handlePause(id: string) {
    setBrigades((prev) => prev.map((b) => (b.id === id ? { ...b, status: "paused" } : b)));
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, status: "paused" } : prev));
    showToast(s.toastPaused, "info");
  }

  function handleActivate(id: string) {
    setBrigades((prev) => prev.map((b) => (b.id === id ? { ...b, status: "active" } : b)));
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, status: "active" } : prev));
    showToast(s.toastActivated);
  }

  function handleDuplicate(brigade: Brigade) {
    const suffix = Date.now().toString().slice(-4);
    const duplicated: Brigade = {
      ...brigade,
      id: `brigade-copy-${suffix}`,
      number: nextNumber,
      name: s.defaultNamePrefix(nextNumber),
      status: "forming",
    };
    setBrigades((prev) => [duplicated, ...prev]);
    showToast(s.toastDuplicated);
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setBrigades((prev) => prev.filter((b) => b.id !== deleteTarget.id));
    if (drawerTarget?.id === deleteTarget.id) setDrawerTarget(null);
    showToast(s.toastDeleted, "info");
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
        showToast(c.editUnavailableInDemo, "info");
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
      title={s.pageTitle}
      subtitle={s.pageSubtitle}
      search={{ value: search, onChange: handleSearchChange, placeholder: s.searchPlaceholder }}
      action={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={15} /> {s.createBrigade}
        </Button>
      }
    >
      <StaggeredGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={s.kpiTotalBrigades}
          value={String(kpis.totalBrigades)}
          icon={Users}
          tone="orange"
          footer={s.kpiActiveBrigadesFooter(kpis.activeBrigades)}
        />
        <MetricCard
          label={s.kpiTotalMembers}
          value={String(kpis.totalMembers)}
          icon={UsersRound}
          tone="blue"
          footer={s.kpiWorkersFooter(kpis.totalWorkers)}
        />
        <MetricCard
          label={s.kpiAssignedWorks}
          value={String(kpis.assignedWorksCount)}
          icon={ClipboardCheck}
          tone="green"
          footer={s.kpiObjectsFooter}
        />
        <MetricCard
          label={s.kpiAverageEfficiency}
          value={`${kpis.averageEfficiency}%`}
          icon={Gauge}
          tone="purple"
          footer={s.kpiCurrentPeriodFooter}
        />
      </StaggeredGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_250px]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 className="text-lg font-bold text-ink">{s.listTitle}</h2>
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
                title={s.emptyTitle}
                description={c.emptyStateHint}
                action={
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
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
            total={filteredBrigades.length}
            itemLabel={s.paginationItemLabel}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">{s.distributionBySpecialtyTitle}</h2>
            <div className="mt-4 flex flex-col items-center gap-5">
              <SpecializationDonut slices={specialization} total={kpis.totalMembers} />
              <SpecializationLegend slices={specialization} />
            </div>
          </Card>

          <BrigadeActivityCard rows={activity} />
        </div>
      </div>

      <CreateBrigadeModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} nextNumber={nextNumber} />

      <BrigadeDetailsDrawer
        open={Boolean(drawerTarget)}
        onClose={() => setDrawerTarget(null)}
        brigade={drawerTarget}
        onEdit={() => showToast(c.editUnavailableInDemo, "info")}
        onChangeComposition={() => showToast(s.toastChangeCompositionUnavailable, "info")}
        onAssignWork={() => showToast(s.toastAssignWorkUnavailable, "info")}
        onChangeForeman={() => showToast(s.toastChangeForemanUnavailable, "info")}
        onPause={handlePause}
        onActivate={handleActivate}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={s.deleteConfirmTitle}
        description={deleteTarget ? s.deleteConfirmDescription(deleteTarget.name) : undefined}
        confirmLabel={c.delete}
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}
