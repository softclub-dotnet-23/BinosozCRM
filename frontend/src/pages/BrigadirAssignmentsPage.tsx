import { useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, Clock } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { MetricCard } from "../components/ui/MetricCard";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { WorksTable } from "../components/works/WorksTable";
import { ProgressUpdateModal } from "../components/works/ProgressUpdateModal";
import { WorkDetailsDrawer } from "../components/works/WorkDetailsDrawer";
import { WorkSummaryDonut, WorkSummaryLegend } from "../components/works/WorkSummaryDonut";
import { CriticalWorksCard } from "../components/works/CriticalWorksCard";
import type { WorkActionKind } from "../components/works/WorkActionMenu";
import { brigadesRepository, employeesRepository, worksRepository } from "../data/repositories";
import { useRepositoryState, useRepositorySnapshot } from "../hooks/useRepositoryState";
import { usePersistentState } from "../hooks/usePersistentState";
import { findBrigadirScope } from "../utils/brigadeAccess";
import { computeCriticalWorks, computeWorkAnalytics } from "../utils/workAnalytics";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../context/AuthContext";
import type { Work, WorkStatus } from "../types";

type TabKey = "all" | "in_progress" | "completed" | "overdue";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "in_progress", label: "В процессе" },
  { key: "completed", label: "Завершено" },
  { key: "overdue", label: "Просрочено" },
];

const ALLOWED_ACTIONS: WorkActionKind[] = ["open", "progress"];

function matchesTab(status: WorkStatus, tab: TabKey): boolean {
  if (tab === "all") return true;
  if (tab === "in_progress") return status === "in_progress";
  if (tab === "completed") return status === "completed";
  return status === "overdue";
}

export default function BrigadirAssignmentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const employees = useRepositorySnapshot(employeesRepository);
  const brigades = useRepositorySnapshot(brigadesRepository);
  const [works, setWorks] = useRepositoryState(worksRepository);
  const [tab, setTab] = usePersistentState<TabKey>("filters.brigadirWorks.tab", "all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progressTarget, setProgressTarget] = useState<Work | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<Work | null>(null);

  const scope = user ? findBrigadirScope(employees, brigades, user.fullName) : null;

  if (!scope) {
    return (
      <AppLayout title="Мои работы" subtitle="Работы, назначенные вашей бригаде">
        <Card className="p-0">
          <ErrorState
            title="Бригада не найдена"
            description="Ваша учётная запись не привязана ни к одной бригаде. Обратитесь к администратору."
          />
        </Card>
      </AppLayout>
    );
  }

  const { brigade } = scope;
  const brigadeWorks = works.filter((w) => w.brigadeId === brigade.id);
  const analytics = computeWorkAnalytics(brigadeWorks);
  const todayIso = new Date().toISOString().slice(0, 10);
  const criticalWorks = computeCriticalWorks(brigadeWorks, todayIso, 5);

  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndIso = weekEnd.toISOString().slice(0, 10);
  const thisWeekWorks = brigadeWorks
    .filter((w) => w.status !== "completed" && w.status !== "cancelled" && w.plannedStart <= weekEndIso && w.plannedEnd >= todayIso)
    .sort((a, b) => (a.plannedStart < b.plannedStart ? -1 : 1));

  const filteredWorks = brigadeWorks.filter((w) => matchesTab(w.status, tab));
  const allSelected = filteredWorks.length > 0 && filteredWorks.every((w) => selectedIds.has(w.id));

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
      if (allSelected) filteredWorks.forEach((w) => next.delete(w.id));
      else filteredWorks.forEach((w) => next.add(w.id));
      return next;
    });
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
          actualStart: w.actualStart ?? todayIso,
          actualEnd: becomesCompleted ? todayIso : w.actualEnd,
          progressHistory: [
            ...w.progressHistory,
            { id: `${id}-hist-${w.progressHistory.length + 1}`, date: todayIso, progress, note: note || "Обновление прогресса", author: user?.fullName ?? "" },
          ],
        };
      }),
    );
    setDrawerTarget((prev) => (prev && prev.id === id ? { ...prev, progress } : prev));
    showToast("Прогресс обновлён");
  }

  function handleAction(action: WorkActionKind, work: Work) {
    if (action === "open") setDrawerTarget(work);
    if (action === "progress") setProgressTarget(work);
  }

  return (
    <AppLayout title="Мои работы" subtitle="Работы, назначенные вашей бригаде">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <MetricCard label="Всего назначено" value={String(analytics.total)} icon={ClipboardList} tone="blue" footer={brigade.name} />
        <MetricCard label="Завершено" value={String(analytics.completed)} icon={CheckCircle2} tone="green" footer={`${analytics.completedPercent}% от назначенных`} />
        <MetricCard label="В процессе" value={String(analytics.inProgress)} icon={Clock} tone="orange" footer={`${analytics.inProgressPercent}% от назначенных`} />
        <MetricCard label="Просрочено" value={String(analytics.overdue)} icon={AlertTriangle} tone="red" footer={`${analytics.overduePercent}% от назначенных`} />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[1fr_280px]">
        <Card className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 px-5 pt-5 sm:px-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  tab === t.key ? "bg-primary text-white" : "bg-[#F5F5F4] text-ink-secondary hover:bg-[#ECECEB]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {filteredWorks.length > 0 ? (
              <WorksTable
                works={filteredWorks}
                loading={false}
                selectedIds={selectedIds}
                allSelected={allSelected}
                onToggleRow={toggleRow}
                onToggleAll={toggleAll}
                onRowClick={(work) => setDrawerTarget(work)}
                onAction={handleAction}
                todayIso={todayIso}
                actions={ALLOWED_ACTIONS}
              />
            ) : (
              <EmptyState icon={ClipboardList} title="Работы не найдены" description="Для этой вкладки нет назначенных работ" />
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5 sm:p-6">
            <h2 className="text-[17px] font-bold text-ink">Сводка по работам</h2>
            <div className="mt-4 flex flex-col items-center gap-5">
              <WorkSummaryDonut analytics={analytics} />
              <WorkSummaryLegend analytics={analytics} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">На этой неделе</h2>
            {thisWeekWorks.length > 0 ? (
              <div className="mt-3 space-y-2">
                {thisWeekWorks.slice(0, 5).map((w) => (
                  <div key={w.id} className="border-l-2 border-blue py-1 pl-2 text-[10px]">
                    <span className="text-ink-muted">{w.plannedStart}</span>
                    <b className="ml-2">{w.title}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 py-4 text-center text-xs text-ink-secondary">На эту неделю работ не запланировано</p>
            )}
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-ink-muted">
              <CalendarDays size={13} /> {todayIso} – {weekEndIso}
            </div>
          </Card>

          <CriticalWorksCard items={criticalWorks} onOpen={(work) => setDrawerTarget(work)} />
        </div>
      </div>

      <ProgressUpdateModal open={Boolean(progressTarget)} onClose={() => setProgressTarget(null)} work={progressTarget} onSave={handleUpdateProgress} />

      <WorkDetailsDrawer
        open={Boolean(drawerTarget)}
        onClose={() => setDrawerTarget(null)}
        work={drawerTarget}
        allWorks={brigadeWorks}
        onUpdateProgress={(work) => setProgressTarget(work)}
        onEdit={() => {}}
        onChangeStatus={() => {}}
        onComplete={() => {}}
        onAddComment={(id, text) => {
          setWorks((prev) =>
            prev.map((w) =>
              w.id === id
                ? { ...w, comments: [...w.comments, { id: `${id}-c-${w.comments.length + 1}`, author: user?.fullName ?? "", text, date: todayIso }] }
                : w,
            ),
          );
          setDrawerTarget((prev) =>
            prev && prev.id === id
              ? { ...prev, comments: [...prev.comments, { id: `${id}-c-${prev.comments.length + 1}`, author: user?.fullName ?? "", text, date: todayIso }] }
              : prev,
          );
        }}
        allowManagement={false}
      />
    </AppLayout>
  );
}
