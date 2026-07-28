import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Camera, CircleCheckBig, ClipboardCheck, ClockAlert, FileSearch, ListFilter, PackagePlus, TriangleAlert } from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useWorkerScope } from "../../utils/workerAccess";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { attendanceRepository } from "../../data/repositories";
import { WorkerTaskListRow } from "../../components/worker/WorkerTaskListRow";
import { WorkerTaskDetailDrawer } from "../../components/worker/WorkerTaskDetailDrawer";
import { WorkerProblemModal } from "../../components/worker/WorkerProblemModal";
import { WorkerPhotoReportModal } from "../../components/worker/WorkerPhotoReportModal";
import { WorkerMaterialModal } from "../../components/worker/WorkerMaterialModal";
import { WorkerCalendarCard } from "../../components/worker/WorkerCalendarCard";
import { WorkerKpiCard } from "../../components/worker/WorkerKpiCard";
import { WorkerQuickActionTile } from "../../components/worker/WorkerQuickActionTile";
import {
  applyTaskFilters,
  computeMonthlyTaskStats,
  computeTaskTabCounts,
  computeTasksKpis,
  DEFAULT_TASK_FILTERS,
  filterWorksByTab,
  sortWorks,
  todayIso,
  type TaskFilters,
  type TaskSortOption,
  type TaskTabKey,
} from "../../utils/workerAnalytics";
import { cn } from "../../utils/cn";

const PAGE_SIZE = 7;

export default function WorkerTasksPage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const { employee, brigadeWorks } = useWorkerScope(user);
  const attendance = useRepositorySnapshot(attendanceRepository);

  const [tab, setTab] = useState<TaskTabKey>("all");
  const [sortOption, setSortOption] = useState<TaskSortOption>("priority");
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(todayIso());

  const [openWorkId, setOpenWorkId] = useState<string | null>(null);
  const [photoModalWorkId, setPhotoModalWorkId] = useState<string | null | undefined>(undefined);
  const [problemModalWorkId, setProblemModalWorkId] = useState<string | null | undefined>(undefined);
  const [materialModalWorkId, setMaterialModalWorkId] = useState<string | null | undefined>(undefined);

  const today = todayIso();

  const tabCounts = useMemo(() => computeTaskTabCounts(brigadeWorks), [brigadeWorks]);
  const kpis = useMemo(() => computeTasksKpis(brigadeWorks, today), [brigadeWorks, today]);
  const objectOptions = useMemo(() => Array.from(new Set(brigadeWorks.map((w) => w.objectName))).sort((a, b) => a.localeCompare(b, "ru")), [brigadeWorks]);

  const filteredByTab = useMemo(() => filterWorksByTab(brigadeWorks, tab), [brigadeWorks, tab]);
  const filteredAdvanced = useMemo(() => applyTaskFilters(filteredByTab, filters), [filteredByTab, filters]);
  const sorted = useMemo(() => sortWorks(filteredAdvanced, sortOption), [filteredAdvanced, sortOption]);

  useEffect(() => setPage(1), [tab, filters, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageStart = (pageSafe - 1) * PAGE_SIZE;
  const paged = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  const monthlyStats = useMemo(
    () => (employee ? computeMonthlyTaskStats(brigadeWorks, attendance, employee.id, today) : null),
    [brigadeWorks, attendance, employee, today],
  );

  function resetFilters() {
    setFilters(DEFAULT_TASK_FILTERS);
  }

  const activeFilterCount = (filters.priority !== "all" ? 1 : 0) + (filters.objectName !== "all" ? 1 : 0) + (filters.overdueOnly ? 1 : 0);

  return (
    <AppLayout title={s.tasksTitle} subtitle={s.dashboardSubtitle} titleBelowHeader contentMaxWidth="1500px">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <WorkerKpiCard icon={ClipboardCheck} tone="orange" title={s.kpiTotalTasksTitle} value={String(kpis.total)} footer={s.kpiTasksFooter} />
          <WorkerKpiCard icon={CircleCheckBig} tone="green" title={s.kpiInProgressTitle} value={String(kpis.inProgress)} footer={s.kpiInProgressFooter} />
          <WorkerKpiCard icon={FileSearch} tone="purple" title={s.kpiReviewTitle} value={String(kpis.review)} footer={s.kpiReviewFooter} />
          <WorkerKpiCard icon={BadgeCheck} tone="blue" title={s.kpiCompletedTitle} value={String(kpis.completedThisMonth)} footer={s.kpiCompletedFooter} />
          <WorkerKpiCard icon={ClockAlert} tone="red" title={s.kpiOverdueTitle} value={String(kpis.overdue)} footer={s.kpiOverdueFooter} />
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Card className="min-w-0 overflow-visible p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", s.tasksTabAll(tabCounts.all)],
                    ["in_progress", s.tasksTabInProgress(tabCounts.in_progress)],
                    ["on_review", s.tasksTabReview(tabCounts.on_review)],
                    ["completed", s.tasksTabCompleted(tabCounts.completed)],
                  ] as [TaskTabKey, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      tab === key ? "bg-primary text-white" : "bg-surface-2 text-ink-secondary hover:bg-surface-3",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as TaskSortOption)}
                  aria-label={s.sortByPriority}
                  className="h-9 rounded-lg border border-border-strong bg-card px-2.5 text-xs font-medium text-ink"
                >
                  <option value="priority">{s.sortByPriorityOption}</option>
                  <option value="dueDate">{s.sortByDueDate}</option>
                  <option value="progress">{s.sortByProgress}</option>
                  <option value="newest">{s.sortNewest}</option>
                  <option value="oldest">{s.sortOldest}</option>
                </select>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setFilterOpen((v) => !v)}
                    aria-expanded={filterOpen}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors",
                      activeFilterCount > 0 ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-ink-secondary hover:bg-surface-2",
                    )}
                  >
                    <ListFilter size={14} />
                    {s.filterButton}
                    {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">{activeFilterCount}</span>}
                  </button>
                  {filterOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-popover)]">
                      <label htmlFor="task-filter-priority" className="mb-1 block text-xs font-semibold text-ink-secondary">
                        {s.filterPriorityLabel}
                      </label>
                      <select
                        id="task-filter-priority"
                        value={filters.priority}
                        onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as TaskFilters["priority"] }))}
                        className="mb-3 h-9 w-full rounded-lg border border-border-strong bg-card px-2.5 text-xs text-ink"
                      >
                        <option value="all">{s.filterAllObjects}</option>
                        <option value="low">{strings.works.priorityLow}</option>
                        <option value="medium">{strings.works.priorityMedium}</option>
                        <option value="high">{strings.works.priorityHigh}</option>
                        <option value="critical">{strings.works.priorityCritical}</option>
                      </select>

                      <label htmlFor="task-filter-object" className="mb-1 block text-xs font-semibold text-ink-secondary">
                        {s.filterObjectLabel}
                      </label>
                      <select
                        id="task-filter-object"
                        value={filters.objectName}
                        onChange={(e) => setFilters((f) => ({ ...f, objectName: e.target.value }))}
                        className="mb-3 h-9 w-full rounded-lg border border-border-strong bg-card px-2.5 text-xs text-ink"
                      >
                        <option value="all">{s.filterAllObjects}</option>
                        {objectOptions.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>

                      <label className="mb-3 flex items-center gap-2 text-xs font-medium text-ink">
                        <input
                          type="checkbox"
                          checked={filters.overdueOnly}
                          onChange={(e) => setFilters((f) => ({ ...f, overdueOnly: e.target.checked }))}
                          className="h-4 w-4 rounded border-border-strong accent-primary"
                        />
                        {s.filterOverdueOnly}
                      </label>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={resetFilters}>
                          {s.filterReset}
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => setFilterOpen(false)}>
                          {s.filterApply}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="divide-y divide-border border-t border-border">
              {paged.length > 0 ? (
                paged.map((w) => <WorkerTaskListRow key={w.id} work={w} onOpen={(work) => setOpenWorkId(work.id)} />)
              ) : (
                <EmptyState icon={ClipboardCheck} title={s.emptyTasks} />
              )}
            </div>

            {sorted.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
                <p className="text-xs text-ink-secondary">{s.tasksResultsSummary(pageStart + 1, Math.min(pageStart + PAGE_SIZE, sorted.length), sorted.length)}</p>
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={pageSafe === 1} onClick={() => setPage((p) => p - 1)}>
                      {s.paginationPrev}
                    </Button>
                    <Button variant="outline" size="sm" disabled={pageSafe === totalPages} onClick={() => setPage((p) => p + 1)}>
                      {s.paginationNext}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="min-w-0 space-y-4">
            <WorkerCalendarCard works={brigadeWorks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

            <Card className="p-4">
              <h2 className="text-sm font-bold text-ink">{s.monthlyStatsTitle}</h2>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-secondary">{s.monthlyStatsCompletedTasks}</dt>
                  <dd className="font-semibold tabular text-ink">{monthlyStats?.completedTasksThisMonth ?? 0}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-secondary">{s.monthlyStatsCompletedWorks}</dt>
                  <dd className="font-semibold tabular text-ink">{monthlyStats?.completedWorksAllTime ?? 0}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-secondary">{s.monthlyStatsHours}</dt>
                  <dd className="font-semibold tabular text-ink">{monthlyStats?.hoursThisMonth ?? 0} ч</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-secondary">{s.monthlyStatsAvgProgress}</dt>
                  <dd className="font-semibold tabular text-ink">{monthlyStats?.averageProgress ?? 0}%</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-bold text-ink">{s.tasksQuickActionsTitle}</h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <WorkerQuickActionTile icon={Camera} label={s.actionPhotoReport} onClick={() => setPhotoModalWorkId(null)} />
                <WorkerQuickActionTile icon={TriangleAlert} label={s.actionReportProblemShort} onClick={() => setProblemModalWorkId(null)} />
                <WorkerQuickActionTile icon={PackagePlus} label={s.actionRequestMaterial} onClick={() => setMaterialModalWorkId(null)} />
              </div>
            </Card>
          </div>
        </div>
      </div>

      <WorkerTaskDetailDrawer
        workId={openWorkId}
        onClose={() => setOpenWorkId(null)}
        onOpenPhotoReport={(id) => {
          setOpenWorkId(null);
          setPhotoModalWorkId(id);
        }}
        onOpenProblemReport={(id) => {
          setOpenWorkId(null);
          setProblemModalWorkId(id);
        }}
        onOpenMaterialRequest={(id) => {
          setOpenWorkId(null);
          setMaterialModalWorkId(id);
        }}
      />
      <WorkerPhotoReportModal open={photoModalWorkId !== undefined} onClose={() => setPhotoModalWorkId(undefined)} defaultWorkId={photoModalWorkId ?? null} />
      <WorkerProblemModal open={problemModalWorkId !== undefined} onClose={() => setProblemModalWorkId(undefined)} defaultWorkId={problemModalWorkId ?? null} />
      <WorkerMaterialModal open={materialModalWorkId !== undefined} onClose={() => setMaterialModalWorkId(undefined)} defaultWorkId={materialModalWorkId ?? null} />
    </AppLayout>
  );
}
