import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Camera,
  CircleCheckBig,
  Clock3,
  ClipboardCheck,
  MessageSquare,
  PackagePlus,
  Phone,
  Star,
  TriangleAlert,
} from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../hooks/useToast";
import { useWorkerScope } from "../../utils/workerAccess";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { attendanceRepository, notificationsRepository, workerDocumentsRepository } from "../../data/repositories";
import { WorkerTaskRow } from "../../components/worker/WorkerTaskRow";
import { WorkerTaskDetailDrawer } from "../../components/worker/WorkerTaskDetailDrawer";
import { WorkerProblemModal } from "../../components/worker/WorkerProblemModal";
import { WorkerMaterialModal } from "../../components/worker/WorkerMaterialModal";
import { WorkerMessageModal } from "../../components/worker/WorkerMessageModal";
import { WorkerPhotoReportModal } from "../../components/worker/WorkerPhotoReportModal";
import { DOCUMENT_ICON, DOCUMENT_TONE_CLASS, NOTIFICATION_ICON, NOTIFICATION_TONE_CLASS } from "../../components/worker/workerIcons";
import { TONE_CLASS, WorkerKpiCard, type Tone } from "../../components/worker/WorkerKpiCard";
import { WorkerQuickActionTile } from "../../components/worker/WorkerQuickActionTile";
import {
  computeTaskTabCounts,
  computeWorkerSchedule,
  computeWorkerStats,
  downloadWorkerDocument,
  filterWorksByTab,
  formatRelativeTime,
  greetingKey,
  sortWorksByPriority,
  todayIso,
  type TaskTabKey,
} from "../../utils/workerAnalytics";
import { formatDateShort } from "../../utils/date";
import { cn } from "../../utils/cn";

export default function WorkerDashboardPage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const s = strings.worker;

  const { employee, brigade, prorab, brigadeWorks } = useWorkerScope(user);
  const attendance = useRepositorySnapshot(attendanceRepository);
  const notifications = useRepositorySnapshot(notificationsRepository);
  const documents = useRepositorySnapshot(workerDocumentsRepository);

  const [taskTab, setTaskTab] = useState<TaskTabKey>("all");
  const [openWorkId, setOpenWorkId] = useState<string | null>(null);
  const [photoModalWorkId, setPhotoModalWorkId] = useState<string | null | undefined>(undefined);
  const [problemModalWorkId, setProblemModalWorkId] = useState<string | null | undefined>(undefined);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const today = todayIso();
  const now = new Date();

  const DASHBOARD_TASK_LIMIT = 6;
  const tabCounts = useMemo(() => computeTaskTabCounts(brigadeWorks), [brigadeWorks]);
  // Full sorted/filtered set still drives the tab counts and "Смотреть все задачи" — only the
  // rendered rows are capped, so the Dashboard stays compact without hiding real data anywhere
  // (the full Tasks page shows every row from the same filterWorksByTab/sortWorksByPriority pair).
  const visibleTasks = useMemo(() => sortWorksByPriority(filterWorksByTab(brigadeWorks, taskTab)), [brigadeWorks, taskTab]);
  const dashboardTasks = useMemo(() => visibleTasks.slice(0, DASHBOARD_TASK_LIMIT), [visibleTasks]);
  const schedule = useMemo(() => computeWorkerSchedule(brigadeWorks, today, 2), [brigadeWorks, today]);
  const stats = useMemo(
    () => (employee ? computeWorkerStats(attendance, brigadeWorks, employee.id, today) : null),
    [attendance, brigadeWorks, employee, today],
  );
  const myNotifications = useMemo(
    () => (user ? notifications.filter((n) => n.userId === user.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3) : []),
    [notifications, user],
  );

  const greeting = s[`greeting${greetingKey(now).charAt(0).toUpperCase()}${greetingKey(now).slice(1)}` as "greetingMorning" | "greetingDay" | "greetingEvening"];
  const firstName = employee?.firstName ?? user?.fullName.split(" ")[0] ?? "";

  async function markNotificationRead(id: string) {
    const notif = notifications.find((n) => n.id === id);
    if (!notif || notif.read) return;
    await notificationsRepository.update(id, { read: true });
  }

  if (!employee || !brigade) {
    return (
      <AppLayout title={`${greeting}!`} subtitle={s.dashboardSubtitle} contentMaxWidth="1500px">
        <EmptyState icon={TriangleAlert} title={s.emptyTasks} description={s.dashboardSubtitle} />
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`${greeting}, ${firstName}!`} subtitle={s.dashboardSubtitle} contentMaxWidth="1500px">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <WorkerKpiCard icon={ClipboardCheck} tone="orange" title={s.kpiTasksTitle} value={String(tabCounts.all)} footer={s.kpiTasksFooter} />
          <WorkerKpiCard icon={CircleCheckBig} tone="green" title={s.kpiInProgressTitle} value={String(tabCounts.in_progress)} footer={s.kpiInProgressFooter} />
          <WorkerKpiCard icon={BadgeCheck} tone="blue" title={s.kpiCompletedTitle} value={String(stats?.completedThisMonth ?? 0)} footer={s.kpiCompletedFooter} />
          <WorkerKpiCard icon={Clock3} tone="purple" title={s.kpiHoursTitle} value={`${stats?.hoursThisMonth ?? 0} ч`} footer={s.kpiHoursFooter} />
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.75fr)]">
          <div className="min-w-0 space-y-4">
            <Card className="overflow-hidden p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold text-ink">{s.tasksTitle}</h2>
                <select
                  value="priority"
                  onChange={() => {}}
                  aria-label={s.sortByPriority}
                  className="h-9 rounded-lg border border-border-strong bg-card px-2.5 text-xs font-medium text-ink"
                >
                  <option value="priority">{s.sortByPriority}</option>
                </select>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
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
                    onClick={() => setTaskTab(key)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      taskTab === key ? "bg-primary text-white" : "bg-surface-2 text-ink-secondary hover:bg-surface-3",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-1 divide-y divide-border">
                {dashboardTasks.length > 0 ? (
                  dashboardTasks.map((w) => <WorkerTaskRow key={w.id} work={w} onOpen={(work) => setOpenWorkId(work.id)} />)
                ) : (
                  <EmptyState icon={ClipboardCheck} title={s.emptyTasks} />
                )}
              </div>

              {brigadeWorks.length > 0 && (
                <button type="button" onClick={() => navigate("/worker/tasks")} className="mt-2 text-sm font-semibold text-primary hover:text-primary-hover">
                  {s.viewAllTasks}
                </button>
              )}
            </Card>

            <Card className="overflow-hidden p-5">
              <h2 className="text-base font-bold text-ink">{s.statsTitle}</h2>
              <div className="mt-3 grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0">
                <StatItem icon={Clock3} tone="purple" value={`${stats?.hoursThisMonth ?? 0} ч`} label={s.statsHours} delta={stats?.hoursChangePercent ?? 0} />
                <StatItem icon={BadgeCheck} tone="blue" value={String(stats?.completedThisMonth ?? 0)} label={s.statsCompleted} delta={stats?.completedChangePercent ?? 0} />
                <StatItem
                  icon={Star}
                  tone="warning"
                  value={String(stats?.rating ?? "—")}
                  label={s.statsRating}
                  tag={stats ? (stats.ratingLabel === "high" ? s.ratingHigh : stats.ratingLabel === "medium" ? s.ratingMedium : s.ratingLow) : undefined}
                />
                <StatItem
                  icon={TriangleAlert}
                  tone={stats && stats.violations > 0 ? "red" : "green"}
                  value={String(stats?.violations ?? 0)}
                  label={s.statsViolations}
                  tag={stats ? (stats.violations === 0 ? s.violationsGood : s.violationsPresent) : undefined}
                />
              </div>
            </Card>

            <Card className="overflow-hidden p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-ink">{s.documentsTitle}</h2>
                <button type="button" onClick={() => navigate("/worker/documents")} className="text-xs font-semibold text-primary hover:text-primary-hover">
                  {s.allDocumentsLink}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {documents.slice(0, 4).map((doc) => {
                  const Icon = DOCUMENT_ICON[doc.fileType];
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => downloadWorkerDocument(doc)}
                      className="flex items-center gap-2.5 rounded-xl border border-border px-2.5 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-surface-2"
                    >
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]", DOCUMENT_TONE_CLASS[doc.fileType])}>
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-ink">{doc.title}</span>
                        <span className="block truncate text-[11px] text-ink-muted">{doc.sizeLabel}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="p-4">
              <h2 className="text-base font-bold text-ink">{s.scheduleTitle(formatDateShort(today))}</h2>
              <div className="relative mt-3.5 space-y-3.5">
                {schedule.length > 0 ? (
                  schedule.map((item, i) => (
                    <div key={item.id} className="relative flex items-start gap-3">
                      {i < schedule.length - 1 && <span className="absolute left-1.25 top-4 h-[calc(100%+2px)] w-px bg-border" aria-hidden="true" />}
                      <span
                        className={cn(
                          "relative z-10 mt-1 h-2.75 w-2.75 shrink-0 rounded-full ring-4 ring-card",
                          item.kind === "work" && item.workStatus === "in_progress" && "bg-blue",
                          item.kind === "work" && item.workStatus === "completed" && "bg-green",
                          item.kind === "work" && item.workStatus !== "in_progress" && item.workStatus !== "completed" && "bg-ink-muted",
                          item.kind === "break" && "bg-warning",
                          item.kind === "meeting" && "bg-purple",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold tabular text-ink-secondary">{item.time}</p>
                        <p className="truncate text-sm font-medium text-ink">
                          {item.kind === "break" ? s.scheduleBreak : item.kind === "meeting" ? s.scheduleMeeting : item.title}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          item.kind === "work" && item.workStatus === "in_progress" && "bg-blue-soft text-blue",
                          item.kind === "work" && item.workStatus === "completed" && "bg-green-soft text-green",
                          item.kind === "work" && item.workStatus !== "in_progress" && item.workStatus !== "completed" && "bg-surface-3 text-ink-secondary",
                          item.kind === "break" && "bg-warning-soft text-warning",
                          item.kind === "meeting" && "bg-purple-soft text-purple",
                        )}
                      >
                        {item.kind === "break"
                          ? s.scheduleBreak
                          : item.kind === "meeting"
                            ? s.scheduleMeeting
                            : item.workStatus === "in_progress"
                              ? s.statusInProgress
                              : item.workStatus === "completed"
                                ? s.statusCompleted
                                : s.statusPlanned}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState title={s.emptySchedule} />
                )}
              </div>
              <button type="button" onClick={() => navigate("/worker/schedule")} className="mt-4 text-sm font-semibold text-primary hover:text-primary-hover">
                {s.viewFullSchedule}
              </button>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-ink">{s.notificationsTitle}</h2>
                <button type="button" onClick={() => navigate("/worker/notifications")} className="text-xs font-semibold text-primary hover:text-primary-hover">
                  {s.notificationsAllLink}
                </button>
              </div>
              <div className="mt-2.5 space-y-0.5">
                {myNotifications.length > 0 ? (
                  myNotifications.map((n) => {
                    const NotifIcon = NOTIFICATION_ICON[n.type];
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          void markNotificationRead(n.id);
                          if (n.relatedWorkId) setOpenWorkId(n.relatedWorkId);
                        }}
                        className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-2"
                      >
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", n.read ? "bg-surface-3 text-ink-muted" : NOTIFICATION_TONE_CLASS[n.type])}>
                          <NotifIcon size={16} />
                        </span>
                        <span className="min-w-0 flex-1 pt-0.5">
                          <span className="flex items-start justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="text-sm font-semibold leading-tight text-ink">{n.title}</span>
                              {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                            </span>
                            <span className="shrink-0 whitespace-nowrap text-[11px] text-ink-muted">{formatRelativeTime(n.date, now, strings.header)}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-ink-secondary">{n.description}</span>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <EmptyState title={s.emptyNotifications} />
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-base font-bold text-ink">{s.quickActionsTitle}</h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <WorkerQuickActionTile icon={Camera} label={s.actionPhotoReport} onClick={() => setPhotoModalWorkId(null)} />
                <WorkerQuickActionTile icon={PackagePlus} label={s.actionRequestMaterial} onClick={() => setMaterialModalOpen(true)} />
                <WorkerQuickActionTile icon={TriangleAlert} label={s.actionReportProblemShort} onClick={() => setProblemModalWorkId(null)} />
                <WorkerQuickActionTile icon={MessageSquare} label={s.actionMessageProrab} onClick={() => setMessageModalOpen(true)} />
                <WorkerQuickActionTile
                  icon={Phone}
                  label={s.actionCall}
                  onClick={() => {
                    if (prorab?.phone) window.location.href = `tel:${prorab.phone.replace(/\s+/g, "")}`;
                    else showToast(s.emptyDocuments, "info");
                  }}
                />
                <WorkerQuickActionTile icon={ClipboardCheck} label={s.actionViewSchedule} onClick={() => navigate("/worker/schedule")} />
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
      />
      <WorkerPhotoReportModal open={photoModalWorkId !== undefined} onClose={() => setPhotoModalWorkId(undefined)} defaultWorkId={photoModalWorkId ?? null} />
      <WorkerProblemModal open={problemModalWorkId !== undefined} onClose={() => setProblemModalWorkId(undefined)} defaultWorkId={problemModalWorkId ?? null} />
      <WorkerMaterialModal open={materialModalOpen} onClose={() => setMaterialModalOpen(false)} />
      <WorkerMessageModal open={messageModalOpen} onClose={() => setMessageModalOpen(false)} />
    </AppLayout>
  );
}

function StatItem({
  icon: Icon,
  tone,
  value,
  label,
  delta,
  tag,
}: {
  icon: typeof Clock3;
  tone: Tone;
  value: string;
  label: string;
  delta?: number;
  tag?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 first:pl-0 md:py-1">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]", TONE_CLASS[tone])}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight text-ink">{value}</p>
        <p className="truncate text-xs text-ink-secondary">{label}</p>
        {typeof delta === "number" && (
          <p className={cn("text-[11px] font-semibold", delta > 0 ? "text-green" : delta < 0 ? "text-red" : "text-ink-muted")}>
            {delta > 0 ? "+" : ""}
            {delta}%
          </p>
        )}
        {tag && <p className="truncate text-[11px] font-semibold text-ink-muted">{tag}</p>}
      </div>
    </div>
  );
}
