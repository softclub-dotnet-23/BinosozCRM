import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { AppLayout } from "../../components/layout/AppLayout";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { notificationsRepository } from "../../data/repositories";
import { WorkerTaskDetailDrawer } from "../../components/worker/WorkerTaskDetailDrawer";
import { WorkerPhotoReportModal } from "../../components/worker/WorkerPhotoReportModal";
import { WorkerProblemModal } from "../../components/worker/WorkerProblemModal";
import { NOTIFICATION_ICON, NOTIFICATION_TONE_CLASS } from "../../components/worker/workerIcons";
import { formatRelativeTime } from "../../utils/workerAnalytics";
import { cn } from "../../utils/cn";

export default function WorkerNotificationsPage() {
  const { user } = useAuth();
  const { strings } = useLanguage();
  const s = strings.worker;
  const notifications = useRepositorySnapshot(notificationsRepository);
  const [openWorkId, setOpenWorkId] = useState<string | null>(null);
  const [photoModalWorkId, setPhotoModalWorkId] = useState<string | null | undefined>(undefined);
  const [problemModalWorkId, setProblemModalWorkId] = useState<string | null | undefined>(undefined);

  const mine = useMemo(
    () => (user ? notifications.filter((n) => n.userId === user.id).sort((a, b) => (a.date < b.date ? 1 : -1)) : []),
    [notifications, user],
  );

  async function markRead(id: string) {
    await notificationsRepository.update(id, { read: true });
  }

  async function markAllRead() {
    await notificationsRepository.setAll(notifications.map((n) => (user && n.userId === user.id ? { ...n, read: true } : n)));
  }

  const now = new Date();

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
      <Card className="overflow-hidden p-0">
        {mine.length > 0 ? (
          <div className="divide-y divide-border">
            {mine.map((n) => {
              const Icon = NOTIFICATION_ICON[n.type];
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    void markRead(n.id);
                    if (n.relatedWorkId) setOpenWorkId(n.relatedWorkId);
                  }}
                  className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2"
                >
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", n.read ? "bg-surface-3 text-ink-muted" : NOTIFICATION_TONE_CLASS[n.type])}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-ink-secondary">{n.description}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-muted">{formatRelativeTime(n.date, now, strings.header)}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Bell} title={s.emptyNotifications} />
        )}
      </Card>

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
