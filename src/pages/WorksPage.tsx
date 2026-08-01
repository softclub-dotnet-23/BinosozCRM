import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ClipboardList, Plus } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { MetricCard } from "../components/ui/MetricCard";
import { Card } from "../components/ui/Card";
import { StaggeredGrid } from "../components/ui/StaggeredGrid";
import { Button } from "../components/ui/Button";
import { CustomSelect } from "../components/ui/CustomSelect";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { WorksTable } from "../components/works/WorksTable";
import { AddWorkModal } from "../components/works/AddWorkModal";
import { EditWorkModal } from "../components/works/EditWorkModal";
import { ProgressUpdateModal } from "../components/works/ProgressUpdateModal";
import { WorkDetailsDrawer } from "../components/works/WorkDetailsDrawer";
import { WorkSummaryDonut, WorkSummaryLegend } from "../components/works/WorkSummaryDonut";
import { WorkFiltersCard, DEFAULT_WORK_FILTERS, type WorkFiltersState } from "../components/works/WorkFilters";
import { CriticalWorksCard } from "../components/works/CriticalWorksCard";
import { WorksBySections } from "../components/works/WorksBySections";
import { ExportDropdown } from "../components/works/ExportDropdown";
import { WorkDynamicsChart } from "../components/charts/WorkDynamicsChart";
import type { WorkActionKind } from "../components/works/WorkActionMenu";
import { WORK_SECTIONS } from "../data/mockWorks";
import { mockWorkDynamics } from "../data/mockWorkDynamics";
import { worksRepository, objectsRepository } from "../data/repositories";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { computeCriticalWorks, computeSectionBreakdown, computeWorkAnalytics } from "../utils/workAnalytics";
import { workSectionLabel, workStatusLabel } from "../utils/workStatus";
import { useToast } from "../hooks/useToast";
import type { Work, WorkStatus } from "../types";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import type { AppStrings } from "../lib/i18n/appStrings";
import BrigadirAssignmentsPage from "./BrigadirAssignmentsPage";

const TODAY_ISO = "2026-07-17";

type TabKey = "all" | "in_progress" | "completed" | "overdue";

function buildTabs(s: AppStrings["works"]): { key: TabKey; label: string }[] {
  return [
    { key: "all", label: s.tabAll },
    { key: "in_progress", label: s.tabInProgress },
    { key: "completed", label: s.tabCompleted },
    { key: "overdue", label: s.tabOverdue },
  ];
}

function matchesTab(status: WorkStatus, tab: TabKey): boolean {
  if (tab === "all") return true;
  if (tab === "in_progress") return status === "in_progress";
  if (tab === "completed") return status === "completed";
  return status === "overdue";
}

export default function WorksPage() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirAssignmentsPage />;
  return <CompanyWorksPage />;
}

function CompanyWorksPage() {
  const { showToast } = useToast();
  const { strings } = useLanguage();
  const s = strings.works;
  const c = strings.common;
  const TABS = useMemo(() => buildTabs(s), [s]);

  const [works, setWorks] = useRepositoryState(worksRepository);
  const mockObjects = useRepositorySnapshot(objectsRepository);
  const [loading] = useState(false);
  const [search, setSearch] = usePersistentState("filters.works.search", "");
  const [tab, setTab] = usePersistentState<TabKey>("filters.works.tab", "all");
  const [filters, setFilters] = usePersistentState<WorkFiltersState>("filters.works.filters", DEFAULT_WORK_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Work | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<Work | null>(null);
  const [progressTarget, setProgressTarget] = useState<Work | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Work | null>(null);

  const analytics = useMemo(() => computeWorkAnalytics(works), [works]);
  const sectionBreakdown = useMemo(() => computeSectionBreakdown(works), [works]);
  const criticalWorks = useMemo(() => computeCriticalWorks(works, TODAY_ISO, 3), [works]);

  const nextCode = useMemo(() => {
    const n = works.length + 1;
    return `${n}.1`;
  }, [works.length]);

  const filteredWorks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return works.filter((w) => {
      if (!matchesTab(w.status, tab)) return false;
      if (query) {
        const haystack = `${w.title} ${w.code} ${w.objectName} ${w.sectionName} ${w.responsible.name} ${w.brigadeName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filters.status !== "all" && w.status !== filters.status) return false;
      if (filters.objectId !== "all" && w.objectId !== filters.objectId) return false;
      if (filters.sectionId !== "all" && w.sectionId !== filters.sectionId) return false;
      if (filters.responsible !== "all" && w.responsible.name !== filters.responsible) return false;
      if (filters.brigadeId !== "all" && w.brigadeId !== filters.brigadeId) return false;
      if (filters.dateFrom && w.plannedEnd < filters.dateFrom) return false;
      if (filters.dateTo && w.plannedStart > filters.dateTo) return false;
      return true;
    });
  }, [works, tab, search, filters]);

  const pageCount = Math.max(1, Math.ceil(filteredWorks.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredWorks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const allSelected = pageRows.length > 0 && pageRows.every((w) => selectedIds.has(w.id));

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleTabChange(next: TabKey) {
    setTab(next);
    setPage(1);
  }

  function updateFilters(next: WorkFiltersState) {
    setFilters(next);
    setPage(1);
  }

  function handleResetFilters() {
    setFilters(DEFAULT_WORK_FILTERS);
    setSearch("");
    setTab("all");
    setPage(1);
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageRows.forEach((w) => next.delete(w.id));
      } else {
        pageRows.forEach((w) => next.add(w.id));
      }
      return next;
    });
  }

  function handleComplete(id: string) {
    setWorks((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              status: "completed",
              progress: 100,
              actualStart: w.actualStart ?? w.plannedStart,
              actualEnd: w.actualEnd ?? TODAY_ISO,
              progressHistory: [
                ...w.progressHistory,
                { id: `${id}-hist-${w.progressHistory.length + 1}`, date: TODAY_ISO, progress: 100, note: "Работа завершена", author: "Садди Имомов" },
              ],
            }
          : w,
      ),
    );
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, status: "completed", progress: 100 } : prev));
    showToast(s.toastCompleted);
  }

  function handlePause(id: string) {
    setWorks((prev) => prev.map((w) => (w.id === id ? { ...w, status: "paused" } : w)));
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, status: "paused" } : prev));
    showToast(s.toastPaused, "info");
  }

  function handleChangeStatus(id: string, status: WorkStatus) {
    setWorks((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              status,
              progress: status === "completed" ? 100 : w.progress,
              actualEnd: status === "completed" ? w.actualEnd ?? TODAY_ISO : w.actualEnd,
            }
          : w,
      ),
    );
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, status, progress: status === "completed" ? 100 : prev.progress } : prev));
    showToast(s.toastStatusUpdated);
  }

  function handleUpdateProgress(id: string, progress: number, note: string) {
    setWorks((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const becomesCompleted = progress >= 100 && w.status !== "completed";
        return {
          ...w,
          progress,
          status: becomesCompleted ? "completed" : w.status,
          actualStart: w.actualStart ?? TODAY_ISO,
          actualEnd: becomesCompleted ? TODAY_ISO : w.actualEnd,
          progressHistory: [
            ...w.progressHistory,
            {
              id: `${id}-hist-${w.progressHistory.length + 1}`,
              date: TODAY_ISO,
              progress,
              note: note || "Обновление прогресса",
              author: "Садди Имомов",
            },
          ],
        };
      }),
    );
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, progress } : prev));
    showToast(s.toastProgressUpdated);
  }

  function handleAddComment(id: string, text: string) {
    setWorks((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              comments: [...w.comments, { id: `${id}-c-${w.comments.length + 1}`, author: "Садди Имомов", text, date: TODAY_ISO }],
            }
          : w,
      ),
    );
    setDrawerTarget((prev) =>
      prev && prev.id === id
        ? { ...prev, comments: [...prev.comments, { id: `${id}-c-${prev.comments.length + 1}`, author: "Садди Имомов", text, date: TODAY_ISO }] }
        : prev,
    );
  }

  function handleDuplicate(work: Work) {
    const suffix = Date.now().toString().slice(-4);
    const duplicated: Work = {
      ...work,
      id: `work-copy-${suffix}`,
      code: `${work.code}-к${suffix.slice(-2)}`,
      title: s.copyTitle(work.title),
      status: "planned",
      progress: 0,
      actualStart: null,
      actualEnd: null,
      attachments: [],
      comments: [],
      progressHistory: [{ id: `work-copy-${suffix}-hist-1`, date: TODAY_ISO, progress: 0, note: "Работа дублирована", author: "Садди Имомов" }],
    };
    setWorks((prev) => [duplicated, ...prev]);
    showToast(s.toastDuplicated);
  }

  function handleSaveWork(work: Work) {
    const isEdit = Boolean(editTarget);
    setWorks((prev) => {
      const exists = prev.some((w) => w.id === work.id);
      return exists ? prev.map((w) => (w.id === work.id ? work : w)) : [work, ...prev];
    });
    setFormOpen(false);
    setEditTarget(null);
    showToast(isEdit ? s.toastUpdated : s.toastCreated);
  }

  function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setWorks((prev) => prev.filter((w) => w.id !== deleteTarget.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
    if (drawerTarget?.id === deleteTarget.id) setDrawerTarget(null);
    showToast(s.toastDeleted, "info");
    setDeleteTarget(null);
  }

  function handleBulkComplete() {
    setWorks((prev) => prev.map((w) => (selectedIds.has(w.id) ? { ...w, status: "completed", progress: 100 } : w)));
    showToast(s.toastBulkCompleted(selectedIds.size));
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    setWorks((prev) => prev.filter((w) => !selectedIds.has(w.id)));
    showToast(s.toastBulkDeleted(selectedIds.size), "info");
    setSelectedIds(new Set());
  }

  function handleWorkAction(action: WorkActionKind, work: Work) {
    switch (action) {
      case "open":
        setDrawerTarget(work);
        break;
      case "edit":
      case "assignResponsible":
      case "assignBrigade":
        setEditTarget(work);
        setFormOpen(true);
        break;
      case "progress":
        setProgressTarget(work);
        break;
      case "duplicate":
        handleDuplicate(work);
        break;
      case "complete":
        handleComplete(work.id);
        break;
      case "pause":
        handlePause(work.id);
        break;
      case "delete":
        setDeleteTarget(work);
        break;
    }
  }

  return (
    <AppLayout
      title={s.pageTitle}
      subtitle={s.pageSubtitle}
      search={{ value: search, onChange: handleSearchChange, placeholder: s.searchPlaceholder }}
      action={
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditTarget(null);
              setFormOpen(true);
            }}
          >
            <Plus size={15} /> {s.addWork}
          </Button>
          <ExportDropdown />
        </div>
      }
    >
      <StaggeredGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={s.kpiTotal} value={String(analytics.total)} icon={ClipboardList} tone="blue" footer={s.kpiTotalFooter} />
        <MetricCard
          label={s.kpiCompleted}
          value={String(analytics.completed)}
          icon={CheckCircle2}
          tone="green"
          footer={s.kpiPercentOfTotal(analytics.completedPercent)}
        />
        <MetricCard
          label={s.kpiInProgress}
          value={String(analytics.inProgress)}
          icon={Clock}
          tone="orange"
          footer={s.kpiPercentOfTotal(analytics.inProgressPercent)}
        />
        <MetricCard
          label={s.kpiOverdue}
          value={String(analytics.overdue)}
          icon={AlertTriangle}
          tone="red"
          footer={s.kpiPercentOfTotal(analytics.overduePercent)}
        />
      </StaggeredGrid>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_260px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
              <div className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => handleTabChange(t.key)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      tab === t.key ? "bg-primary text-white" : "bg-surface-3 text-ink-secondary hover:bg-surface-5"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <CustomSelect
                  size="sm"
                  searchable
                  aria-label={s.filterObjectAriaLabel}
                  value={filters.objectId}
                  onValueChange={(v) => updateFilters({ ...filters, objectId: v })}
                  options={[{ value: "all", label: s.allObjectsOption }, ...mockObjects.map((o) => ({ value: o.id, label: o.name }))]}
                />
                <CustomSelect
                  size="sm"
                  aria-label={s.filterSectionAriaLabel}
                  value={filters.sectionId}
                  onValueChange={(v) => updateFilters({ ...filters, sectionId: v as WorkFiltersState["sectionId"] })}
                  options={[
                    { value: "all", label: s.allSectionsOption },
                    ...WORK_SECTIONS.map((section) => ({ value: section.id, label: workSectionLabel(s, section.id) })),
                  ]}
                />
                <CustomSelect
                  size="sm"
                  aria-label={s.filterStatusAriaLabel}
                  value={filters.status}
                  onValueChange={(v) => updateFilters({ ...filters, status: v as WorkFiltersState["status"] })}
                  options={[
                    { value: "all", label: s.statusAllLabel },
                    { value: "completed", label: workStatusLabel(s, "completed") },
                    { value: "in_progress", label: workStatusLabel(s, "in_progress") },
                    { value: "overdue", label: workStatusLabel(s, "overdue") },
                    { value: "planned", label: workStatusLabel(s, "planned") },
                  ]}
                />
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-xl bg-primary-soft px-4 py-2.5 sm:mx-6">
                <p className="text-sm font-medium text-primary">{s.selectedCount(selectedIds.size)}</p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={handleBulkComplete}>
                    {c.completeLabel}
                  </Button>
                  <Button size="sm" variant="danger" onClick={handleBulkDelete}>
                    {c.delete}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4">
              {pageRows.length > 0 || loading ? (
                <WorksTable
                  works={pageRows}
                  loading={loading}
                  selectedIds={selectedIds}
                  allSelected={allSelected}
                  onToggleRow={toggleRow}
                  onToggleAll={toggleAll}
                  onRowClick={(work) => setDrawerTarget(work)}
                  onAction={handleWorkAction}
                  todayIso={TODAY_ISO}
                />
              ) : (
                <EmptyState
                  icon={ClipboardList}
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
              total={filteredWorks.length}
              itemLabel={s.paginationItemLabel}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="flex min-w-0 flex-col p-5 sm:p-6">
              <h2 className="text-lg font-bold text-ink">{s.dynamicsTitle}</h2>
              <div className="mt-4 flex-1">
                <WorkDynamicsChart data={mockWorkDynamics} />
              </div>
            </Card>

            <WorksBySections data={sectionBreakdown} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-ink">{s.summaryTitle}</h2>
            <div className="mt-4 flex flex-col items-center gap-5">
              <WorkSummaryDonut analytics={analytics} />
              <WorkSummaryLegend analytics={analytics} />
            </div>
          </Card>

          <WorkFiltersCard filters={filters} onChange={updateFilters} onApply={() => setPage(1)} onReset={handleResetFilters} />

          <CriticalWorksCard
            items={criticalWorks}
            onOpen={(work) => setDrawerTarget(work)}
            onSeeAll={() => updateFilters({ ...filters, status: "overdue" })}
          />
        </div>
      </div>

      <AddWorkModal
        open={formOpen && !editTarget}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        onSave={handleSaveWork}
        allWorks={works}
        nextCode={nextCode}
      />

      <EditWorkModal
        open={formOpen && Boolean(editTarget)}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        onSave={handleSaveWork}
        work={editTarget}
        allWorks={works}
      />

      <ProgressUpdateModal
        open={Boolean(progressTarget)}
        onClose={() => setProgressTarget(null)}
        work={progressTarget}
        onSave={handleUpdateProgress}
      />

      <WorkDetailsDrawer
        open={Boolean(drawerTarget)}
        onClose={() => setDrawerTarget(null)}
        work={drawerTarget}
        allWorks={works}
        onEdit={(work) => {
          setEditTarget(work);
          setDrawerTarget(null);
          setFormOpen(true);
        }}
        onUpdateProgress={(work) => setProgressTarget(work)}
        onChangeStatus={handleChangeStatus}
        onComplete={handleComplete}
        onAddComment={handleAddComment}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={s.deleteConfirmTitle}
        description={deleteTarget ? s.deleteConfirmDescription(deleteTarget.title, deleteTarget.code) : undefined}
        confirmLabel={c.delete}
        danger
        onConfirm={handleDeleteConfirmed}
      />
    </AppLayout>
  );
}
