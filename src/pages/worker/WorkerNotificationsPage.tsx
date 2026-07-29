import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { notificationsRepository } from "../../data/repositories";
import { WorkerTaskDetailDrawer } from "../../components/worker/WorkerTaskDetailDrawer";
import { WorkerPhotoReportModal } from "../../components/worker/WorkerPhotoReportModal";
import { WorkerProblemModal } from "../../components/worker/WorkerProblemModal";
import { NotificationTabs } from "../../components/worker/notifications/NotificationTabs";
import { NotificationList } from "../../components/worker/notifications/NotificationList";
import { NotificationFiltersCard } from "../../components/worker/notifications/NotificationFiltersCard";
import { NotificationSummaryCard } from "../../components/worker/notifications/NotificationSummaryCard";
import { PushNotificationCard } from "../../components/worker/notifications/PushNotificationCard";
import { todayIso } from "../../utils/workerAnalytics";
import {
  DEFAULT_NOTIFICATION_FILTERS,
  TYPE_CATEGORY,
  computeNotificationSummary,
  filterNotifications,
  type NotificationFilters,
} from "../../utils/workerNotificationsAnalytics";
import type { WorkerNotification } from "../../types";

export default function WorkerNotificationsPage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const navigate = useNavigate();
  const notifications = useRepositorySnapshot(notificationsRepository);
  const [openWorkId, setOpenWorkId] = useState<string | null>(null);
  const [photoModalWorkId, setPhotoModalWorkId] = useState<string | null | undefined>(undefined);
  const [problemModalWorkId, setProblemModalWorkId] = useState<string | null | undefined>(undefined);
  const [filters, setFilters] = useState<NotificationFilters>(DEFAULT_NOTIFICATION_FILTERS);

  const today = todayIso();

  const mine = useMemo(
    () => (user ? notifications.filter((n) => n.userId === user.id).sort((a, b) => (a.date < b.date ? 1 : -1)) : []),
    [notifications, user],
  );

  const filtered = useMemo(() => filterNotifications(mine, filters), [mine, filters]);
  const summary = useMemo(() => computeNotificationSummary(mine), [mine]);
  const availableCategories = useMemo(() => Array.from(new Set(mine.map((n) => TYPE_CATEGORY[n.type]))), [mine]);

  const tabCounts = useMemo(
    () => ({
      all: mine.length,
      unread: mine.filter((n) => !n.read).length,
      important: mine.filter((n) => n.priority === "important").length,
      system: mine.filter((n) => n.priority === "system").length,
    }),
    [mine],
  );

  async function markRead(id: string) {
    await notificationsRepository.update(id, { read: true });
  }

  async function markAllRead() {
    await notificationsRepository.setAll(notifications.map((n) => (user && n.userId === user.id ? { ...n, read: true } : n)));
  }

  function handleOpen(n: WorkerNotification) {
    if (!n.read) void markRead(n.id);
    if (n.relatedWorkId) {
      setOpenWorkId(n.relatedWorkId);
    } else if (n.relatedPhotoReportId) {
      navigate("/worker/photo-reports");
    } else if (n.relatedMaterialRequestId) {
      navigate("/worker/materials");
    }
  }

  return (
    <AppLayout
      title={s.notificationsPageTitle}
      subtitle={s.notificationsPageSubtitle}
      titleBelowHeader
      contentMaxWidth="1600px"
      action={
        <Button variant="outline" onClick={() => void markAllRead()} disabled={mine.every((n) => n.read)}>
          {s.markAllRead}
        </Button>
      }
    >
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <NotificationTabs active={filters.tab} onChange={(tab) => setFilters({ ...filters, tab })} counts={tabCounts} />
          <Card className="min-w-0 overflow-hidden p-0">
            <NotificationList items={filtered} todayIso={today} onOpen={handleOpen} onResetFilters={() => setFilters(DEFAULT_NOTIFICATION_FILTERS)} />
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <NotificationFiltersCard value={filters} onChange={setFilters} availableCategories={availableCategories} />
          <NotificationSummaryCard summary={summary} />
          <PushNotificationCard />
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
    </AppLayout>
  );
}
